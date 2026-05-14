package au.tinytummy.app

import android.app.Activity
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin
import app.tauri.plugin.JSObject
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesResponseListener
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import org.json.JSONObject

@InvokeArg
class BillingProductArgs {
    var productId: String = ""
}

@TauriPlugin
class BillingPlugin(private val activity: Activity) : Plugin(activity), PurchasesUpdatedListener {
    private companion object {
        const val CODE_SUCCESS = "success"
        const val CODE_CANCELLED = "cancelled"
        const val CODE_PENDING = "pending"
        const val CODE_UNAVAILABLE = "unavailable"
        const val CODE_OFFLINE = "offline"
        const val CODE_PRODUCT_UNAVAILABLE = "product_unavailable"
        const val CODE_NO_PURCHASE_FOUND = "no_purchase_found"
        const val CODE_FAILED = "failed"
        const val LIFETIME_PRIVATE_PRODUCT_ID = "com.tinytummy.lifetime_private"
    }

    private val billingClient: BillingClient = BillingClient.newBuilder(activity)
        .setListener(this)
        .enablePendingPurchases()
        .build()

    private var pendingPurchaseInvoke: Invoke? = null
    private var pendingProductId: String? = null

    @Command
    fun purchasePremium(invoke: Invoke) {
        val args = invoke.parseArgs(BillingProductArgs::class.java)
        if (!isSupportedProductId(args.productId)) {
            invoke.resolve(errorResult(CODE_PRODUCT_UNAVAILABLE, "Tiny Tummy only supports the Lifetime Private billing product."))
            return
        }

        withReadyClient(invoke) {
            val params = QueryProductDetailsParams.newBuilder()
                .setProductList(
                    listOf(
                        QueryProductDetailsParams.Product.newBuilder()
                            .setProductId(args.productId)
                            .setProductType(BillingClient.ProductType.INAPP)
                            .build()
                    )
                )
                .build()

            billingClient.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
                if (!billingResult.isOk()) {
                    invoke.resolve(errorResult(codeForBillingResult(billingResult), "Unable to load Google Play product details."))
                    return@queryProductDetailsAsync
                }

                val productDetails = productDetailsList.firstOrNull { product -> product.productId == args.productId }
                if (productDetails == null) {
                    invoke.resolve(errorResult(CODE_PRODUCT_UNAVAILABLE, "Lifetime Private is not available in Google Play yet."))
                    return@queryProductDetailsAsync
                }

                pendingPurchaseInvoke = invoke
                pendingProductId = args.productId

                val flowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(
                        listOf(
                            BillingFlowParams.ProductDetailsParams.newBuilder()
                                .setProductDetails(productDetails)
                                .build()
                        )
                    )
                    .build()

                activity.runOnUiThread {
                    val launchResult = billingClient.launchBillingFlow(activity, flowParams)
                    if (!launchResult.isOk()) {
                        clearPendingPurchase()
                        invoke.resolve(errorResult(codeForBillingResult(launchResult), "Unable to launch Google Play purchase flow."))
                    }
                }
            }
        }
    }

    @Command
    fun restorePremium(invoke: Invoke) {
        val args = invoke.parseArgs(BillingProductArgs::class.java)
        if (!isSupportedProductId(args.productId)) {
            invoke.resolve(errorResult(CODE_PRODUCT_UNAVAILABLE, "Tiny Tummy only supports the Lifetime Private billing product."))
            return
        }

        queryOwnedPurchase(args.productId) { ownedResult ->
            val purchase = ownedResult.purchase
            if (purchase == null) {
                invoke.resolve(errorResult(ownedResult.code, ownedResult.message))
                return@queryOwnedPurchase
            }

            acknowledgeIfNeeded(
                purchase = purchase,
                onSuccess = {
                    invoke.resolve(successResult(args.productId, restored = true, message = "Lifetime Private restored from Google Play."))
                },
                onError = { message ->
                    invoke.resolve(errorResult(CODE_FAILED, message))
                },
            )
        }
    }

    @Command
    fun checkOwnedPremium(invoke: Invoke) {
        val args = invoke.parseArgs(BillingProductArgs::class.java)
        if (!isSupportedProductId(args.productId)) {
            invoke.resolve(errorResult(CODE_PRODUCT_UNAVAILABLE, "Tiny Tummy only supports the Lifetime Private billing product."))
            return
        }

        queryOwnedPurchase(args.productId) { ownedResult ->
            val purchase = ownedResult.purchase
            if (purchase == null) {
                invoke.resolve(errorResult(ownedResult.code, ownedResult.message))
                return@queryOwnedPurchase
            }

            acknowledgeIfNeeded(
                purchase = purchase,
                onSuccess = {
                    invoke.resolve(successResult(args.productId, restored = true, message = "Google Play Lifetime Private ownership confirmed."))
                },
                onError = { message ->
                    invoke.resolve(errorResult(CODE_FAILED, message))
                },
            )
        }
    }

    @Command
    fun getProductMetadata(invoke: Invoke) {
        val args = invoke.parseArgs(BillingProductArgs::class.java)
        if (!isSupportedProductId(args.productId)) {
            invoke.resolve(metadataErrorResult(args.productId, CODE_PRODUCT_UNAVAILABLE, "Tiny Tummy only supports Lifetime Private store metadata."))
            return
        }

        withReadyClient(
            invoke = null,
            onUnavailable = { code, message ->
                invoke.resolve(metadataErrorResult(args.productId, code, message))
            },
        ) {
            val params = QueryProductDetailsParams.newBuilder()
                .setProductList(
                    listOf(
                        QueryProductDetailsParams.Product.newBuilder()
                            .setProductId(args.productId)
                            .setProductType(BillingClient.ProductType.INAPP)
                            .build()
                    )
                )
                .build()

            billingClient.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
                if (!billingResult.isOk()) {
                    invoke.resolve(metadataErrorResult(args.productId, codeForBillingResult(billingResult), "Unable to load Google Play product details."))
                    return@queryProductDetailsAsync
                }

                val productDetails = productDetailsList.firstOrNull { product -> product.productId == args.productId }
                if (productDetails == null) {
                    invoke.resolve(metadataErrorResult(args.productId, CODE_PRODUCT_UNAVAILABLE, "Lifetime Private is not available in Google Play yet."))
                    return@queryProductDetailsAsync
                }

                invoke.resolve(productMetadataResult(productDetails))
            }
        }
    }

    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: MutableList<Purchase>?) {
        val invoke = pendingPurchaseInvoke ?: return
        val productId = pendingProductId

        if (!billingResult.isOk()) {
            clearPendingPurchase()
            when (billingResult.responseCode) {
                BillingClient.BillingResponseCode.USER_CANCELED ->
                    invoke.resolve(errorResult(CODE_CANCELLED, "Purchase cancelled."))
                else ->
                    invoke.resolve(errorResult(codeForBillingResult(billingResult), "Google Play purchase failed. Please try again."))
            }
            return
        }

        if (productId == null) {
            clearPendingPurchase()
            invoke.resolve(errorResult(CODE_FAILED, "Google Play did not return the expected purchase."))
            return
        }

        val pendingPurchase = purchases?.firstOrNull { candidate ->
            candidate.purchaseState == Purchase.PurchaseState.PENDING &&
                candidate.products.contains(productId)
        }
        if (pendingPurchase != null) {
            clearPendingPurchase()
            invoke.resolve(errorResult(CODE_PENDING, "Purchase is pending approval. Lifetime Private will unlock after Google Play completes it."))
            return
        }

        val purchase = purchases
            ?.firstOrNull { candidate ->
                candidate.purchaseState == Purchase.PurchaseState.PURCHASED &&
                    candidate.products.contains(productId)
            }

        if (purchase == null) {
            clearPendingPurchase()
            invoke.resolve(errorResult(CODE_FAILED, "Google Play did not return the expected purchase."))
            return
        }

        acknowledgeIfNeeded(
            purchase = purchase,
            onSuccess = {
                clearPendingPurchase()
                invoke.resolve(successResult(productId, restored = false, message = "Lifetime Private purchased successfully."))
            },
            onError = { message ->
                clearPendingPurchase()
                invoke.resolve(errorResult(CODE_FAILED, message))
            },
        )
    }

    private data class OwnedPurchaseResult(
        val purchase: Purchase?,
        val code: String,
        val message: String,
    )

    private fun queryOwnedPurchase(productId: String, onResult: (OwnedPurchaseResult) -> Unit) {
        withReadyClient(
            invoke = null,
            onUnavailable = { code, message ->
                onResult(OwnedPurchaseResult(null, code, message))
            },
        ) {
            val params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build()

            billingClient.queryPurchasesAsync(params, PurchasesResponseListener { billingResult, purchases ->
                if (!billingResult.isOk()) {
                    onResult(OwnedPurchaseResult(null, codeForBillingResult(billingResult), "Google Play restore is unavailable right now."))
                    return@PurchasesResponseListener
                }

                val pendingPurchase = purchases.firstOrNull { candidate ->
                    candidate.purchaseState == Purchase.PurchaseState.PENDING &&
                        candidate.products.contains(productId)
                }
                if (pendingPurchase != null) {
                    onResult(OwnedPurchaseResult(null, CODE_PENDING, "Purchase is still pending in Google Play. Lifetime Private is not unlocked yet."))
                    return@PurchasesResponseListener
                }

                val purchase = purchases.firstOrNull { candidate ->
                    candidate.purchaseState == Purchase.PurchaseState.PURCHASED &&
                        candidate.products.contains(productId)
                }
                if (purchase == null) {
                    onResult(OwnedPurchaseResult(null, CODE_NO_PURCHASE_FOUND, "No Lifetime Private purchase was found for this Google Play account."))
                    return@PurchasesResponseListener
                }

                onResult(OwnedPurchaseResult(purchase, CODE_SUCCESS, "Google Play Lifetime Private ownership confirmed."))
            })
        }
    }

    private fun acknowledgeIfNeeded(
        purchase: Purchase,
        onSuccess: () -> Unit,
        onError: (String) -> Unit,
    ) {
        if (purchase.isAcknowledged) {
            onSuccess()
            return
        }

        val params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.purchaseToken)
            .build()

        billingClient.acknowledgePurchase(params) { billingResult ->
            if (billingResult.isOk()) {
                onSuccess()
            } else {
                onError("Google Play purchase acknowledgement failed.")
            }
        }
    }

    private fun withReadyClient(
        invoke: Invoke?,
        onUnavailable: ((String, String) -> Unit)? = null,
        onReady: () -> Unit,
    ) {
        if (billingClient.isReady) {
            onReady()
            return
        }

        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.isOk()) {
                    onReady()
                } else {
                    val code = codeForBillingResult(billingResult)
                    val message = "Google Play billing is unavailable on this device."
                    if (invoke != null) {
                        invoke.resolve(errorResult(code, message))
                    } else {
                        onUnavailable?.invoke(code, message)
                    }
                }
            }

            override fun onBillingServiceDisconnected() {
                val message = "Google Play billing disconnected."
                if (invoke != null) {
                    invoke.resolve(errorResult(CODE_OFFLINE, message))
                } else {
                    onUnavailable?.invoke(CODE_OFFLINE, message)
                }
            }
        })
    }

    private fun successResult(productId: String, restored: Boolean, message: String): JSObject {
        val result = JSObject()
        result.put("ok", true)
        result.put("code", CODE_SUCCESS)
        result.put("restored", restored)
        result.put("productId", productId)
        result.put("message", message)
        return result
    }

    private fun productMetadataResult(productDetails: ProductDetails): JSObject {
        val offerDetails = productDetails.oneTimePurchaseOfferDetails
        if (offerDetails == null) {
            return metadataErrorResult(productDetails.productId, CODE_PRODUCT_UNAVAILABLE, "Lifetime Private does not have a Google Play purchase offer yet.")
        }

        val result = JSObject()
        result.put("ok", true)
        result.put("code", CODE_SUCCESS)
        result.put("productId", productDetails.productId)
        result.put("title", productDetails.title)
        result.put("description", productDetails.description)
        result.put("localizedPrice", offerDetails.formattedPrice)
        result.put("currencyCode", offerDetails.priceCurrencyCode)
        result.put("rawPriceMicros", offerDetails.priceAmountMicros.toString())
        result.put("rawPrice", offerDetails.priceAmountMicros.toDouble() / 1_000_000.0)
        result.put("available", true)
        result.put("message", "Google Play Lifetime Private metadata loaded.")
        return result
    }

    private fun metadataErrorResult(productId: String, code: String, message: String): JSObject {
        val result = JSObject()
        result.put("ok", false)
        result.put("code", code)
        result.put("productId", productId)
        result.put("title", JSONObject.NULL)
        result.put("description", JSONObject.NULL)
        result.put("localizedPrice", JSONObject.NULL)
        result.put("currencyCode", JSONObject.NULL)
        result.put("rawPriceMicros", JSONObject.NULL)
        result.put("rawPrice", JSONObject.NULL)
        result.put("available", false)
        result.put("message", message)
        return result
    }

    private fun errorResult(code: String, message: String): JSObject {
        val result = JSObject()
        result.put("ok", false)
        result.put("code", code)
        result.put("restored", false)
        result.put("productId", JSONObject.NULL)
        result.put("message", message)
        return result
    }

    private fun isSupportedProductId(productId: String): Boolean {
        return productId == LIFETIME_PRIVATE_PRODUCT_ID
    }

    private fun BillingResult.isOk(): Boolean {
        return responseCode == BillingClient.BillingResponseCode.OK
    }

    private fun codeForBillingResult(billingResult: BillingResult): String {
        return when (billingResult.responseCode) {
            BillingClient.BillingResponseCode.OK -> CODE_SUCCESS
            BillingClient.BillingResponseCode.USER_CANCELED -> CODE_CANCELLED
            BillingClient.BillingResponseCode.BILLING_UNAVAILABLE -> CODE_UNAVAILABLE
            BillingClient.BillingResponseCode.ITEM_UNAVAILABLE -> CODE_PRODUCT_UNAVAILABLE
            BillingClient.BillingResponseCode.SERVICE_DISCONNECTED,
            BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE,
            BillingClient.BillingResponseCode.NETWORK_ERROR -> CODE_OFFLINE
            else -> CODE_FAILED
        }
    }

    private fun clearPendingPurchase() {
        pendingPurchaseInvoke = null
        pendingProductId = null
    }
}
