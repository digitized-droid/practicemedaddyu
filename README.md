# EUnify

EUnify is a browser-based personal budget tracker with offline local storage and Supabase cloud sync.

This update adds:
- 50 live website themes with matching numbered logo selection (`logos/1.png` through `logos/50.png`).
- A full unpaid-reminders manager that lists reminders before their personal alert window starts, with mark-paid and delete actions.
- A guarded full tracker-data reset that restores default categories and synchronizes deletion markers to the signed-in cloud account.
- Updated service-worker cache version for the new app shell.

Existing tracker functions are retained, including category allocation, income and expense transactions, wishlist purchase deductions, repeating reminders, reminder lists, reports, paid history, backup/restore, and offline/cloud merging.

## Logo files
Keep the `logos` folder beside `index.html`. `logos/1.png` is included. Add your own `2.png` through `50.png` inside that folder. If a numbered logo is missing, the app falls back to `logos/1.png`.

## Deployment
Follow `UPLOAD-INSTRUCTIONS.txt`. Do not clear browser storage or reset your Supabase table as part of deployment.


## Instruction guide images
The floating guide includes a separate visual for each feature. Replace the JPG files in `instruction-images/` with your own screenshots while keeping each filename unchanged. The popup uses `object-fit: contain`, so the full image remains visible without cropping. The service worker refreshes these files while online and keeps the latest fetched versions available offline. See `instruction-images/README.txt` for the filename-to-feature list.
