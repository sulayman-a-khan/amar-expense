# Amar Hishab (আমার হিসাব)

A mobile-first daily ledger built for someone who needs an ultra-reliable, anxiety-free way to track bike rentals, expenses, multiple income streams, and loans — with explicit color-coding and a Double-Check Guard on every entry.

## Stack
- Next.js 16 (App Router)
- Tailwind CSS v4
- MongoDB + Mongoose
- Cloudinary (expense receipt photos)

## Color Convention (fixed app-wide)
- 🟢 Green — Income
- 🔴 Red — Expense
- 🔵 Blue — Loans / Transfers

## Local Setup

```bash
npm install
```

Fill in `.env.local` (see `DEPLOYMENT.md`), then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    page.js                      # Dashboard (Modules 6, 9)
    ledger/page.js                # Full transaction ledger, filterable
    loans/page.js                  # Loans & liabilities, resolve flow (Module 4)
    layout.js
    globals.css
    api/
      bikes/route.js               # Module 1: shifts, off-day, rent shortfall tracking
      expenses/route.js             # Module 2: credit/payable toggle
      incomes/route.js               # Module 5: Shop Rent / Daily / Irregular
      loans-transfers/route.js        # Module 3 & 4: wallet transfers, loans
      dashboard/route.js               # Aggregated summary + missing-entry check
      transactions/route.js             # Unified ledger feed
      upload-signature/route.js          # Signed Cloudinary upload params
  components/
    EntryFlow.jsx                  # Shared FAB + action sheet + save flow (used on every page)
    EntrySheet.jsx                  # The 5 entry forms (rent/income/expense/transfer/loan)
    DoubleCheckModal.jsx             # Module 10: confirmation guard
    YesterdayCheckBlock.jsx           # Module 9: missing-entry blocking modal
    ImageUploader.jsx                  # Cloudinary receipt photo upload
    BottomNav.jsx, SummaryCard.jsx, WalletRow.jsx, FleetCard.jsx, TimelineLog.jsx, PageHeader.jsx
  models/models.js                 # All Mongoose schemas
  lib/db.js, lib/cloudinary.js
```

See `DEPLOYMENT.md` for the full MongoDB Atlas, Cloudinary, and Vercel setup guide.
