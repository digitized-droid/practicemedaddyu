# EUnify accounting provenance update

## What changed

- New income records keep an origin ID for each category allocation.
- Category transfers move the same funding lots and retain their origin and transfer lineage.
- Expenses and wishlist/reminder payments record which funding lots they consume.
- Deleting an income removes only the still-unspent part of that income, wherever it has moved. Other income and legacy funds remain untouched.
- Money already spent remains represented by its expense record; deleting the income does not erase or reverse that expense.
- Deleting a transfer follows its remaining unspent funds through later transfers and returns them to the transfer's source category. If the original income has already been deleted, the funds are not recreated.
- Reversing an expense does not restore money whose originating income was already deleted.
- The service-worker cache version was advanced so browsers can fetch the updated app shell.

## Existing data note

The previous version did not preserve the origin of every peso across transfers and expenses. That history cannot be reconstructed with certainty after the fact. On first load, current category balances are therefore preserved as legacy funds. Existing income records with saved allocations can still be deleted using those saved amounts, but full origin tracing is guaranteed for income, transfers, and expenses recorded after this update is installed.

No Supabase table/schema change is required: the additional ledger data is stored inside the existing application state JSON and synchronized with it.

## Validation performed

- JavaScript syntax checks passed for the inline application scripts.
- Seven isolated accounting scenarios passed, including income deletion after transfer, transfer chains, reversing transfers in either order, spent-money handling, and preserving unrelated income.

A live browser session and the user's Supabase account were not available for end-to-end testing. Back up the current data before deployment and test with small amounts first.
