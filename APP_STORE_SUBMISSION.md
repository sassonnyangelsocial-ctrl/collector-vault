# Collector Vault mobile release

## Deliverables in this repository

- Installable mobile web app (PWA) with standalone display and offline app shell.
- Capacitor projects for Android and iOS.
- Bundle identifier: `com.collectorvault.app`.
- Public production site: `https://collector-vault-one.vercel.app`.

## Store accounts still required

- Apple Developer Program membership.
- Google Play Console developer account.
- Access to a Mac with current Xcode for the final iPhone archive and upload.
- Android Studio and its Android SDK for the final Android App Bundle.

## Required before store review

1. Add Apple In-App Purchase and Google Play Billing products for monthly and yearly digital memberships. Native builds must not direct users to Stripe checkout for access to digital app features.
2. Add Restore Purchases and Manage Subscription actions.
3. Publish privacy policy, terms of use, support, and account-deletion pages.
4. Complete store privacy/data-safety questionnaires for account, collection, purchase, notification, and phone-number data.
5. Supply 1024x1024 icon art, phone screenshots, support URL, privacy-policy URL, and review credentials.
6. Test account creation, membership, restore, alerts, logout, and deletion on physical devices.

## Proposed listing

**Name:** Collector Vault

**Subtitle:** Collect, track, trade & find

**Short description:** Organize your collection, wishlists, trades, ISOs, DISOs, seller orders, and restock alerts.

**Category:** Lifestyle (primary), Shopping (secondary)

**Keywords:** collectibles, collection tracker, wishlist, trading, restock alerts, blind box

## Install today without an app store

- iPhone/iPad: open the production URL in Safari, tap Share, then **Add to Home Screen**.
- Android: open the production URL in Chrome, open the menu, then tap **Install app** or **Add to Home screen**.

## Build commands

```text
npm run mobile:sync
npm run mobile:android
npm run mobile:ios
```

The iOS command must be run on macOS with Xcode installed.
