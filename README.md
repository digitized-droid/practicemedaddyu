# PesoPlan

PesoPlan is a browser-based personal budget tracker with offline local storage and Supabase cloud sync.

This build includes expanded offline/cloud synchronization for:
- Categories and allocation percentages
- Income/capital and expense transactions with balance reconciliation
- Wishlist / Things I Want to Buy entries and purchase deductions
- Bill reminders and reminder-list groups
- Paid-history records
- Reports and recent activity (derived from synchronized transactions)

See `UPLOAD-INSTRUCTIONS.txt` before deploying.
\n\nLogo asset: place the supplied `1.png` image in the same folder as `index.html`. The header displays it in the original 42 × 42 px brand-mark area.\n

## Theme settings and full reset

The Settings & Themes control provides 50 live color themes. The selected theme is saved separately in browser local storage and does not change budget records. The original PesoPlan palette is theme 1.

Matching logo files are loaded from `logos/<theme-number>.png`. `logos/1.png` is included. Add your own `logos/2.png` through `logos/50.png` to use custom matching artwork; if a logo is not present, the site falls back to the original `1.png`.

The Reset all data action requires confirmation. It clears balances, transactions, income and expense history, reminders and reminder groups, paid history, wishlist items, and custom categories; restores the default categories and original theme; and syncs the reset to Supabase when available. If the reset is performed offline, a reset timestamp prevents older cloud records from being merged back when the device reconnects. Export a backup before resetting if records may be needed later.
