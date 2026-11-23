# EUnify accounting fixes

This update preserves the existing app layout, settings, reminder features, themes, instruction images, Supabase configuration, and other project files. It does not clear local or cloud data.

## What changed

- Category transfers are now saved as `transfer` transactions with source category, destination category, amount, date, and a stable ID.
- Transfers are included in Recent Activity and daily report details, and CSV/print exports show the source and destination.
- Transfer effects use the same balance-adjustment function as income and expenses, so deleting a transfer reverses the movement in the correct direction.
- Before deleting any transaction, EUnify previews the reversal. If it would make a category balance negative, deletion is blocked with an explanation. This protects money that has already been spent or moved.
- Wishlist purchase reversals now use the shared transaction balance function.
- All-category income and reminder-received allocations are distributed in whole centavos using a remainder method, so the allocated amounts add up exactly to the recorded amount.
- Common balance changes are rounded to two decimal places to reduce floating-point centavo drift.
- Deleting an older all-category income record that has no saved historical allocations is blocked. Its original split cannot be known reliably from the current category percentages.
- Legacy single-category income records without allocations use their saved category when reversed.

## Important notes about older records

- Transfers made before this update were not saved as transactions in the previous version. The old app did not retain enough information to reconstruct their dates, amounts, and source/destination reliably. Existing category balances are preserved; old transfers cannot be automatically recreated in transaction history.
- Older all-category income records that do not contain an `allocations` array cannot be safely reversed because the original category split was not saved. The app now blocks deleting those records rather than guessing.
- If an old record was already deleted and its balance was previously altered incorrectly, this update cannot infer the missing historical activity. Please compare the current category balances with your actual cash and use a fresh backup before making manual corrections.

## Recommended installation

1. Download and keep a copy of your current deployed project and export an EUnify backup first.
2. Extract this ZIP.
3. Deploy the updated project files, retaining the same Supabase project URL and publishable key in `supabase-config.js`.
4. Open the app online, sign in to the same account, and allow synchronization to finish before testing on another device.
5. Test with a small amount first: add income, transfer part of it, then try deleting the original income. The app should refuse the deletion if it would make the source category negative. Delete the transfer first, then retry the income deletion.

Do not reset the app or clear browser storage as part of installing this update.
