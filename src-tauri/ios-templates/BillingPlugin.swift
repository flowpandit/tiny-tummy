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

class ReportJsonShareArgs: Decodable {
  let fileName: String
  let json: String
}

class ReportFileActivityItemSource: NSObject, UIActivityItemSource {
  let fileUrl: URL
  let fileName: String
  let dataTypeIdentifier: String

  init(fileUrl: URL, fileName: String, dataTypeIdentifier: String) {
    self.fileUrl = fileUrl
    self.fileName = fileName
    self.dataTypeIdentifier = dataTypeIdentifier
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
    dataTypeIdentifier
  }
}

class BillingPlugin: Plugin {
  private let lifetimePrivateProductId = "com.tinytummy.lifetime_private"

  private enum BillingResultCode: String {
    case success
    case cancelled
    case pending
    case unavailable
    case offline
    case productUnavailable = "product_unavailable"
    case noPurchaseFound = "no_purchase_found"
    case failed
  }

  @objc public func purchasePremium(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(BillingProductArgs.self)
    guard isSupportedProductId(args.productId) else {
      invoke.resolve(errorResult(code: .productUnavailable, message: "Tiny Tummy only supports the Lifetime Private billing product."))
      return
    }

    guard #available(iOS 15.0, *) else {
      invoke.resolve(errorResult(code: .unavailable, message: "In-app purchases require iOS 15 or newer on this build."))
      return
    }

    Task {
      do {
        let products = try await Product.products(for: [args.productId])
        guard let product = products.first(where: { $0.id == args.productId }) else {
          invoke.resolve(errorResult(code: .productUnavailable, message: "Lifetime Private is not available in the App Store yet."))
          return
        }

        let result = try await product.purchase()
        switch result {
        case .success(let verification):
          let transaction = try self.verified(verification)
          guard self.isOwnedTransaction(transaction, productId: args.productId) else {
            invoke.resolve(self.errorResult(code: .failed, message: "Tiny Tummy could not verify that purchase. Please try again."))
            return
          }
          await transaction.finish()
          invoke.resolve(self.successResult(productId: transaction.productID, restored: false, message: "Lifetime Private purchased successfully."))
        case .userCancelled:
          invoke.resolve(self.errorResult(code: .cancelled, message: "Purchase cancelled."))
        case .pending:
          invoke.resolve(self.errorResult(code: .pending, message: "Purchase is pending approval. Lifetime Private will unlock after the App Store completes it."))
        @unknown default:
          invoke.resolve(self.errorResult(code: .failed, message: "Purchase could not be completed. Please try again."))
        }
      } catch {
        invoke.resolve(self.errorResult(code: .failed, message: "Purchase could not be completed. Please try again."))
      }
    }
  }

  @objc public func restorePremium(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(BillingProductArgs.self)
    guard isSupportedProductId(args.productId) else {
      invoke.resolve(errorResult(code: .productUnavailable, message: "Tiny Tummy only supports the Lifetime Private billing product."))
      return
    }

    guard #available(iOS 15.0, *) else {
      invoke.resolve(errorResult(code: .unavailable, message: "In-app purchases require iOS 15 or newer on this build."))
      return
    }

    Task {
      do {
        try await AppStore.sync()
        if let transaction = try await self.findOwnedTransaction(productId: args.productId) {
          await transaction.finish()
          invoke.resolve(self.successResult(productId: transaction.productID, restored: true, message: "Lifetime Private restored from the App Store."))
        } else {
          invoke.resolve(self.errorResult(code: .noPurchaseFound, message: "No Lifetime Private purchase was found for this App Store account."))
        }
      } catch {
        invoke.resolve(self.errorResult(code: .failed, message: "Restore could not be completed. Please try again."))
      }
    }
  }

  @objc public func checkOwnedPremium(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(BillingProductArgs.self)
    guard isSupportedProductId(args.productId) else {
      invoke.resolve(errorResult(code: .productUnavailable, message: "Tiny Tummy only supports the Lifetime Private billing product."))
      return
    }

    guard #available(iOS 15.0, *) else {
      invoke.resolve(errorResult(code: .unavailable, message: "In-app purchases require iOS 15 or newer on this build."))
      return
    }

    Task {
      do {
        if let transaction = try await self.findOwnedTransaction(productId: args.productId) {
          invoke.resolve(self.successResult(productId: transaction.productID, restored: true, message: "App Store Lifetime Private ownership confirmed."))
        } else {
          invoke.resolve(self.errorResult(code: .noPurchaseFound, message: "No owned App Store Lifetime Private purchase is currently available."))
        }
      } catch {
        invoke.resolve(self.errorResult(code: .failed, message: "Ownership sync could not be completed."))
      }
    }
  }

  @objc public func getProductMetadata(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(BillingProductArgs.self)
    guard isSupportedProductId(args.productId) else {
      invoke.resolve(metadataErrorResult(
        productId: args.productId,
        code: .productUnavailable,
        message: "Tiny Tummy only supports Lifetime Private store metadata."
      ))
      return
    }

    guard #available(iOS 15.0, *) else {
      invoke.resolve(metadataErrorResult(
        productId: args.productId,
        code: .unavailable,
        message: "App Store product metadata requires iOS 15 or newer on this build."
      ))
      return
    }

    Task {
      do {
        let products = try await Product.products(for: [args.productId])
        guard let product = products.first(where: { $0.id == args.productId }) else {
          invoke.resolve(self.metadataErrorResult(
            productId: args.productId,
            code: .productUnavailable,
            message: "Lifetime Private is not available in the App Store yet."
          ))
          return
        }

        invoke.resolve(self.metadataSuccessResult(product: product))
      } catch {
        invoke.resolve(self.metadataErrorResult(
          productId: args.productId,
          code: .failed,
          message: "App Store product metadata could not be loaded."
        ))
      }
    }
  }

  @available(iOS 15.0, *)
  private func findOwnedTransaction(productId: String) async throws -> Transaction? {
    for await entitlement in Transaction.currentEntitlements {
      let transaction = try verified(entitlement)
      if isOwnedTransaction(transaction, productId: productId) {
        return transaction
      }
    }
    return nil
  }

  @available(iOS 15.0, *)
  private func isOwnedTransaction(_ transaction: Transaction, productId: String) -> Bool {
    if transaction.productID != productId {
      return false
    }

    if transaction.revocationDate != nil {
      return false
    }

    if let expirationDate = transaction.expirationDate, expirationDate <= Date() {
      return false
    }

    return true
  }

  private func isSupportedProductId(_ productId: String) -> Bool {
    productId == lifetimePrivateProductId
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
      "code": BillingResultCode.success.rawValue,
      "restored": restored,
      "productId": productId,
      "message": message
    ]
  }

  @available(iOS 15.0, *)
  private func metadataSuccessResult(product: Product) -> [String: Any] {
    let currencyCode: Any
    if #available(iOS 16.0, *) {
      currencyCode = Locale.current.currency?.identifier ?? NSNull()
    } else {
      currencyCode = NSNull()
    }

    return [
      "ok": true,
      "code": BillingResultCode.success.rawValue,
      "productId": product.id,
      "title": product.displayName,
      "description": product.description,
      "localizedPrice": product.displayPrice,
      "currencyCode": currencyCode,
      "rawPrice": NSDecimalNumber(decimal: product.price).doubleValue,
      "available": true,
      "message": "App Store Lifetime Private metadata loaded."
    ]
  }

  private func metadataErrorResult(productId: String, code: BillingResultCode, message: String) -> [String: Any] {
    [
      "ok": false,
      "code": code.rawValue,
      "productId": productId,
      "title": NSNull(),
      "description": NSNull(),
      "localizedPrice": NSNull(),
      "currencyCode": NSNull(),
      "rawPrice": NSNull(),
      "available": false,
      "message": message
    ]
  }

  private func errorResult(code: BillingResultCode, message: String) -> [String: Any] {
    [
      "ok": false,
      "code": code.rawValue,
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
    shareFile(
      invoke,
      data: pdfData,
      fileName: fileName,
      dataTypeIdentifier: "com.adobe.pdf",
      writeErrorMessage: "The PDF could not be written for sharing."
    )
  }

  @objc public func shareJsonBackup(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(ReportJsonShareArgs.self)
    guard let jsonData = args.json.data(using: .utf8) else {
      invoke.reject("The backup data could not be prepared for sharing.")
      return
    }

    let fileName = normalizedJsonFileName(args.fileName)
    shareFile(
      invoke,
      data: jsonData,
      fileName: fileName,
      dataTypeIdentifier: "public.json",
      writeErrorMessage: "The backup could not be written for sharing."
    )
  }

  private func shareFile(_ invoke: Invoke, data: Data, fileName: String, dataTypeIdentifier: String, writeErrorMessage: String) {
    let fileUrl = FileManager.default.temporaryDirectory.appendingPathComponent(fileName, isDirectory: false)

    do {
      try data.write(to: fileUrl, options: .atomic)
    } catch {
      invoke.reject(writeErrorMessage)
      return
    }

    DispatchQueue.main.async {
      guard let presenter = self.topViewController(from: self.manager.viewController) else {
        invoke.reject("The iOS share sheet could not be opened.")
        return
      }

      let itemSource = ReportFileActivityItemSource(
        fileUrl: fileUrl,
        fileName: fileName,
        dataTypeIdentifier: dataTypeIdentifier
      )
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

  private func normalizedJsonFileName(_ fileName: String) -> String {
    let trimmed = fileName.trimmingCharacters(in: .whitespacesAndNewlines)
    let candidate = trimmed.isEmpty ? "tiny-tummy-backup.json" : trimmed
    return candidate.lowercased().hasSuffix(".json") ? candidate : "\(candidate).json"
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
