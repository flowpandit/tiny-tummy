# Billing QA Results Template

Use this template to record real App Store / Google Play billing QA for Tiny Tummy Lifetime Private.

Source checklist: `docs/STORE_BILLING_QA_CHECKLIST.md`

Product ID under test: `com.tinytummy.lifetime_private`

Do not use this result log to add Family Sync products, subscriptions, accounts, Supabase, backend receipt validation, or sync behavior. Family Sync must remain coming later.

## Test Run Metadata

| Field | Value |
| --- | --- |
| Test run date |  |
| QA owner |  |
| Build number |  |
| Git commit |  |
| Platform | iOS / Android |
| Device model |  |
| OS version |  |
| App version |  |
| Tester account/storefront |  |
| Product ID | `com.tinytummy.lifetime_private` |
| Localized price shown |  |
| Store environment | App Store sandbox / TestFlight / Google Play internal testing |
| Store product status checked | Yes / No |
| Screenshots/video folder or link |  |
| Notes |  |

Pass/fail values: `Pass`, `Fail`, `Blocked`, `Not run`.

## iOS Results

| Test scenario ID | Scenario | Expected result | Actual result | Pass/fail | Screenshots/video attached | Notes | Follow-up bug link |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IOS-01 | Metadata loads localized price | Store price replaces fallback when available; product ID is `com.tinytummy.lifetime_private`; no entitlement is granted by metadata load |  |  |  | Localized price shown:  |  |
| IOS-02 | Purchase success unlocks Lifetime Private | StoreKit purchase succeeds, transaction is verified, app unlocks `lifetime_private`, purchase is finished, Family Sync remains coming later |  |  |  |  |  |
| IOS-03 | Purchase cancelled does not unlock | No entitlement is granted; cancellation is treated as a non-error user action |  |  |  |  |  |
| IOS-04 | Restore success unlocks | App calls store restore/sync, finds current entitlement for exact product ID, unlocks Lifetime Private |  |  |  |  |  |
| IOS-05 | Restore with no purchase found | No unlock; gentle copy explains no Lifetime Private purchase was found |  |  |  |  |  |
| IOS-06 | Reinstall plus restore | Lifetime Private unlocks from App Store ownership; no Tiny Tummy account is requested |  |  |  |  |  |
| IOS-07 | Offline while already unlocked stays unlocked | Local Lifetime Private access remains; store sync failure does not relock |  |  |  |  |  |
| IOS-08 | Wrong product ID does not unlock | Native bridge rejects the product and no entitlement is written |  |  |  | Product attempted:  |  |
| IOS-09 | Family Sync remains coming later | Family Sync is not purchasable, no Family Sync product is queried, Lifetime Private does not grant sync entitlement |  |  |  |  |  |

## Android Results

| Test scenario ID | Scenario | Expected result | Actual result | Pass/fail | Screenshots/video attached | Notes | Follow-up bug link |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AND-01 | Metadata loads localized price | Google Play localized price replaces fallback when available; metadata load does not grant entitlement |  |  |  | Localized price shown:  |  |
| AND-02 | Purchase success unlocks Lifetime Private | Purchase returns `PURCHASED`, app acknowledges purchase, unlocks `lifetime_private`, Family Sync remains coming later |  |  |  |  |  |
| AND-03 | Purchase cancelled does not unlock | No entitlement is granted; cancellation is not shown as a scary error |  |  |  |  |  |
| AND-04 | Pending purchase does not unlock | App reports pending state, does not acknowledge while pending, and does not unlock |  |  |  |  |  |
| AND-05 | Pending purchase later completes and unlocks | Query/listener sees `PURCHASED`, app acknowledges, Lifetime Private unlocks |  |  |  |  |  |
| AND-06 | Restore/query purchases success unlocks | `queryPurchasesAsync(INAPP)` returns exact product ID in `PURCHASED`; app unlocks |  |  |  |  |  |
| AND-07 | Restore no purchase found | No unlock; gentle copy explains no Lifetime Private purchase was found |  |  |  |  |  |
| AND-08 | Reinstall plus restore | Lifetime Private unlocks from Google Play ownership; no Tiny Tummy account is requested |  |  |  |  |  |
| AND-09 | Offline while already unlocked stays unlocked | Local Lifetime Private access remains; transient store failure does not relock |  |  |  |  |  |
| AND-10 | Wrong product ID does not unlock | Native bridge rejects the product and no entitlement is written |  |  |  | Product attempted:  |  |
| AND-11 | Family Sync remains coming later | Family Sync is not purchasable, no Family Sync product is queried, Lifetime Private does not grant sync entitlement |  |  |  |  |  |

## Issue Summary

| Type | Count | Links / notes |
| --- | --- | --- |
| Blockers |  |  |
| Non-blocking issues |  |  |
| Store-console follow-ups |  |  |
| Retest required | Yes / No |  |

## Final Release Decision

| Field | Value |
| --- | --- |
| Ready for store submission | Yes / No |
| Blockers |  |
| Non-blocking issues |  |
| Final notes |  |
| Decision owner |  |
| Decision date |  |
