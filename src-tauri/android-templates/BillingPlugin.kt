package com.nikhilmehral.tinytummy

import android.app.Activity
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin
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
    private val billingClient: BillingClient = BillingClient.newBuilder(activity)
        .setListener(this)
        .enablePendingPurchases()
        .build()

    private var pendingPurchaseInvoke: Invoke? = null
    private var pendingProductId: String? = null

    @Command
    fun purchasePremium(invoke: Invoke) {
        val args = invoke.parseArgs(BillingProductArgs::class.java)
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
                    invoke.resolve(errorResult("Unable to load Google Play product details."))
                    return@queryProductDetailsAsync
                }

                val productDetails = productDetailsList.firstOrNull()
                if (productDetails == null) {
                    invoke.resolve(errorResult("Premium unlock is not available in Google Play yet."))
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
                        invoke.resolve(errorResult("Unable to launch Google Play purchase flow."))
                    }
                }
            }
        }
    }

    @Command
    fun restorePremium(invoke: Invoke) {
        val args = invoke.parseArgs(BillingProductArgs::class.java)
        queryOwnedPurchase(args.productId) { purchase ->
            if (purchase == null) {
                invoke.resolve(errorResult("No Google Play premium purchase was found to restore."))
                return@queryOwnedPurchase
            }

            acknowledgeIfNeeded(
                purchase = purchase,
                onSuccess = {
                    invoke.resolve(successResult(args.productId, restored = true, message = "Premium unlock restored from Google Play."))
                },
                onError = { message ->
                    invoke.resolve(errorResult(message))
                },
            )
        }
    }

    @Command
    fun checkOwnedPremium(invoke: Invoke) {
        val args = invoke.parseArgs(BillingProductArgs::class.java)
        queryOwnedPurchase(args.productId) { purchase ->
            if (purchase == null) {
                invoke.resolve(errorResult("No owned Google Play premium purchase is currently available."))
                return@queryOwnedPurchase
            }

            acknowledgeIfNeeded(
                purchase = purchase,
                onSuccess = {
                    invoke.resolve(successResult(args.productId, restored = true, message = "Google Play premium ownership confirmed."))
                },
                onError = { message ->
                    invoke.resolve(errorResult(message))
                },
            )
        }
    }

    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: MutableList<Purchase>?) {
        val invoke = pendingPurchaseInvoke ?: return
        val productId = pendingProductId

        if (!billingResult.isOk()) {
            clearPendingPurchase()
            when (billingResult.responseCode) {
                BillingClient.BillingResponseCode.USER_CANCELED ->
                    invoke.resolve(errorResult("Purchase was canceled."))
                else ->
                    invoke.resolve(errorResult("Google Play purchase failed."))
            }
            return
        }

        val purchase = purchases
            ?.firstOrNull { candidate ->
                candidate.purchaseState == Purchase.PurchaseState.PURCHASED &&
                    (productId == null || candidate.products.contains(productId))
            }

        if (purchase == null || productId == null) {
            clearPendingPurchase()
            invoke.resolve(errorResult("Google Play did not return the premium unlock purchase."))
            return
        }

        acknowledgeIfNeeded(
            purchase = purchase,
            onSuccess = {
                clearPendingPurchase()
                invoke.resolve(successResult(productId, restored = false, message = "Premium unlock purchased successfully."))
            },
            onError = { message ->
                clearPendingPurchase()
                invoke.resolve(errorResult(message))
            },
        )
    }

    private fun queryOwnedPurchase(productId: String, onResult: (Purchase?) -> Unit) {
        withReadyClient(null) {
            val params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build()

            billingClient.queryPurchasesAsync(params, PurchasesResponseListener { billingResult, purchases ->
                if (!billingResult.isOk()) {
                    onResult(null)
                    return@PurchasesResponseListener
                }

                val purchase = purchases.firstOrNull { candidate ->
                    candidate.purchaseState == Purchase.PurchaseState.PURCHASED &&
                        candidate.products.contains(productId)
                }
                onResult(purchase)
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

    private fun withReadyClient(invoke: Invoke?, onReady: () -> Unit) {
        if (billingClient.isReady) {
            onReady()
            return
        }

        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.isOk()) {
                    onReady()
                } else {
                    invoke?.resolve(errorResult("Google Play billing is unavailable on this device."))
                }
            }

            override fun onBillingServiceDisconnected() {
                invoke?.resolve(errorResult("Google Play billing disconnected."))
            }
        })
    }

    private fun successResult(productId: String, restored: Boolean, message: String): JSONObject {
        return JSONObject()
            .put("ok", true)
            .put("restored", restored)
            .put("productId", productId)
            .put("message", message)
    }

    private fun errorResult(message: String): JSONObject {
        return JSONObject()
            .put("ok", false)
            .put("restored", false)
            .put("productId", JSONObject.NULL)
            .put("message", message)
    }

    private fun BillingResult.isOk(): Boolean {
        return responseCode == BillingClient.BillingResponseCode.OK
    }

    private fun clearPendingPurchase() {
        pendingPurchaseInvoke = null
        pendingProductId = null
    }
}
