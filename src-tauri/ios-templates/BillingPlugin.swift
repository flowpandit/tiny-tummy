import Foundation
import StoreKit
import SwiftRs
import Tauri
import UIKit
import WebKit

class BillingProductArgs: Decodable {
  let productId: String
}

class ReportPdfShareArgs: Decodable {
  let fileName: String
  let base64Data: String
}

class ReportPdfActivityItemSource: NSObject, UIActivityItemSource {
  let fileUrl: URL
  let fileName: String

  init(fileUrl: URL, fileName: String) {
    self.fileUrl = fileUrl
    self.fileName = fileName
  }

  func activityViewControllerPlaceholderItem(_ activityViewController: UIActivityViewController) -> Any {
    fileUrl
  }

  func activityViewController(_ activityViewController: UIActivityViewController, itemForActivityType activityType: UIActivity.ActivityType?) -> Any? {
    fileUrl
  }

  func activityViewController(_ activityViewController: UIActivityViewController, subjectForActivityType activityType: UIActivity.ActivityType?) -> String {
    fileName
  }

  func activityViewController(_ activityViewController: UIActivityViewController, dataTypeIdentifierForActivityType activityType: UIActivity.ActivityType?) -> String {
    "com.adobe.pdf"
  }
}

class BillingPlugin: Plugin {
  @objc public func purchasePremium(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(BillingProductArgs.self)
    guard #available(iOS 15.0, *) else {
      invoke.resolve(errorResult(message: "In-app purchases require iOS 15 or newer on this build."))
      return
    }

    Task {
      do {
        let products = try await Product.products(for: [args.productId])
        guard let product = products.first else {
          invoke.resolve(errorResult(message: "Premium unlock is not available in the App Store yet."))
          return
        }

        let result = try await product.purchase()
        switch result {
        case .success(let verification):
          let transaction = try self.verified(verification)
          await transaction.finish()
          invoke.resolve(self.successResult(productId: transaction.productID, restored: false, message: "Premium unlock purchased successfully."))
        case .userCancelled:
          invoke.resolve(self.errorResult(message: "Purchase was canceled."))
        case .pending:
          invoke.resolve(self.errorResult(message: "Purchase is pending approval."))
        @unknown default:
          invoke.resolve(self.errorResult(message: "The App Store returned an unknown purchase result."))
        }
      } catch {
        invoke.resolve(self.errorResult(message: error.localizedDescription))
      }
    }
  }

  @objc public func restorePremium(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(BillingProductArgs.self)
    guard #available(iOS 15.0, *) else {
      invoke.resolve(errorResult(message: "In-app purchases require iOS 15 or newer on this build."))
      return
    }

    Task {
      do {
        try await AppStore.sync()
        if let transaction = try await self.findOwnedTransaction(productId: args.productId) {
          await transaction.finish()
          invoke.resolve(self.successResult(productId: transaction.productID, restored: true, message: "Premium unlock restored from the App Store."))
        } else {
          invoke.resolve(self.errorResult(message: "No App Store premium purchase was found to restore."))
        }
      } catch {
        invoke.resolve(self.errorResult(message: error.localizedDescription))
      }
    }
  }

  @objc public func checkOwnedPremium(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(BillingProductArgs.self)
    guard #available(iOS 15.0, *) else {
      invoke.resolve(errorResult(message: "In-app purchases require iOS 15 or newer on this build."))
      return
    }

    Task {
      do {
        if let transaction = try await self.findOwnedTransaction(productId: args.productId) {
          invoke.resolve(self.successResult(productId: transaction.productID, restored: true, message: "App Store premium ownership confirmed."))
        } else {
          invoke.resolve(self.errorResult(message: "No owned App Store premium purchase is currently available."))
        }
      } catch {
        invoke.resolve(self.errorResult(message: error.localizedDescription))
      }
    }
  }

  @available(iOS 15.0, *)
  private func findOwnedTransaction(productId: String) async throws -> Transaction? {
    for await entitlement in Transaction.currentEntitlements {
      let transaction = try verified(entitlement)
      if transaction.productID == productId {
        return transaction
      }
    }
    return nil
  }

  @available(iOS 15.0, *)
  private func verified<T>(_ result: VerificationResult<T>) throws -> T {
    switch result {
    case .verified(let signedType):
      return signedType
    case .unverified:
      throw BillingPluginError.unverifiedTransaction
    }
  }

  private func successResult(productId: String, restored: Bool, message: String) -> [String: Any] {
    [
      "ok": true,
      "restored": restored,
      "productId": productId,
      "message": message
    ]
  }

  private func errorResult(message: String) -> [String: Any] {
    [
      "ok": false,
      "restored": false,
      "productId": NSNull(),
      "message": message
    ]
  }
}

enum BillingPluginError: LocalizedError {
  case unverifiedTransaction

  var errorDescription: String? {
    switch self {
    case .unverifiedTransaction:
      return "The App Store returned an unverified transaction."
    }
  }
}

class ReportExportPlugin: Plugin {
  @objc public func sharePdfReport(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(ReportPdfShareArgs.self)
    guard let pdfData = Data(base64Encoded: args.base64Data) else {
      invoke.reject("The PDF data could not be prepared for sharing.")
      return
    }

    let fileName = normalizedPdfFileName(args.fileName)
    let fileUrl = FileManager.default.temporaryDirectory.appendingPathComponent(fileName, isDirectory: false)

    do {
      try pdfData.write(to: fileUrl, options: .atomic)
    } catch {
      invoke.reject("The PDF could not be written for sharing.")
      return
    }

    DispatchQueue.main.async {
      guard let presenter = self.topViewController(from: self.manager.viewController) else {
        invoke.reject("The iOS share sheet could not be opened.")
        return
      }

      let itemSource = ReportPdfActivityItemSource(fileUrl: fileUrl, fileName: fileName)
      let activityViewController = UIActivityViewController(activityItems: [itemSource], applicationActivities: nil)

      if let popover = activityViewController.popoverPresentationController {
        popover.sourceView = presenter.view
        popover.sourceRect = CGRect(
          x: presenter.view.bounds.midX,
          y: presenter.view.bounds.midY,
          width: 1,
          height: 1
        )
        popover.permittedArrowDirections = []
      }

      presenter.present(activityViewController, animated: true) {
        invoke.resolve()
      }
    }
  }

  private func normalizedPdfFileName(_ fileName: String) -> String {
    let trimmed = fileName.trimmingCharacters(in: .whitespacesAndNewlines)
    let candidate = trimmed.isEmpty ? "tiny-tummy-baby-health-report.pdf" : trimmed
    return candidate.lowercased().hasSuffix(".pdf") ? candidate : "\(candidate).pdf"
  }

  private func topViewController(from rootViewController: UIViewController?) -> UIViewController? {
    var current = rootViewController
    while let presented = current?.presentedViewController {
      current = presented
    }
    return current
  }
}

@_cdecl("init_plugin_billing")
func initPluginBilling() -> Plugin {
  return BillingPlugin()
}

@_cdecl("init_plugin_report_export")
func initPluginReportExport() -> Plugin {
  return ReportExportPlugin()
}
