# Trip Dashboard — Spain → France Reunion

A phone-friendly web page where the crew logs shared trip expenses and instantly
sees **who owes whom** (by couple or by person), alongside the itinerary,
accommodation, and a live budget summary. It's a static site (perfect for
**GitHub Pages**) backed by a small **Google Apps Script** that reads and writes
your existing Google Sheet, so the sheet stays the single source of truth.

```
index.html      the page structure
styles.css      the travel/vibrant theme (colours live at the top)
config.js       ← EDIT THIS: all trip data (people, itinerary, budget, backend URL)
app.js          the engine (rendering + settlement math) — you don't need to touch this
apps-script/
  Code.gs       ← paste into the Apps Script project "TripPlanner"
```

Open `index.html` as-is and it runs in **preview mode** (expenses save in your
browser only). To make it shared and live, do the two setups below.

---

## How this connects to your Google Sheet (important)

The website reads and writes the **existing "Settlement Calculator" tab** — the
same expense log (rows 16–75) your sheet already uses. That means:

- The sheet's **Amount (€)** formulas, **Settlement Summary**, **Budget Summary**
  and **Budget vs Actual** all keep working, because they read the same rows.
- Currency conversion and euro totals come **from your sheet** (its *Currency
  Reference* tab), so the website always matches the sheet — no double book-keeping.

> If you previously ran an older version that made a separate **"App Expenses"**
> tab, delete it: right-click that tab → Delete, or run `cleanupOldTab()` once
> from the Apps Script editor. Nothing depends on it.

---

## Part 1 — Wire up the Google Sheet (≈ 5 minutes)

1. Open your Google Sheet → **Extensions → Apps Script** (project **TripPlanner**).
2. Delete any old code, **paste the entire contents of `apps-script/Code.gs`**, Save.
3. In the function dropdown pick **`setup`** → **Run**. Approve the permission
   prompt (your account → *Advanced* → *Go to project (unsafe)* → *Allow* — normal
   for your own script). It just prints the layout it detected (people, rows, rates).
4. **Deploy → New deployment** → gear ⚙ → **Web app**:
   - **Execute as:** *Me*
   - **Who has access:** *Anyone*
   
   **Deploy**, then **copy the Web app URL** (ends in `/exec`).
5. Paste that URL into `config.js`:
   ```js
   backend: { webAppUrl: "https://script.google.com/macros/s/……/exec" },
   ```

> After ANY later edit to `Code.gs`, re-deploy with **Deploy → Manage deployments
> → edit (✏) → Version: New version → Deploy** so the same URL keeps working.

---

## Part 2 — Publish on GitHub Pages (repo: `Trips`)

Since the `Trips` repo will hold more than one trip, keep each trip in its own
folder so they can live side by side:

```
Trips/                 (your GitHub repo)
  Spain-26/            ← this trip
    index.html
    styles.css
    config.js
    app.js
  Italy-27/            ← a future trip (same files, its own config.js)
```

1. Create/enter the **`Trips`** repository on GitHub and upload the **`Spain-26`**
   folder (the four site files; the `apps-script/` folder and this README are
   optional to upload).
2. Repo **Settings → Pages → Source: Deploy from a branch**, branch **`main`**,
   folder **`/ (root)`**, **Save**.
3. After ~1 minute this trip is live at
   `https://<your-username>.github.io/Trips/Spain-26/`.
4. Share that link with the crew.

---

## Using the dashboard

**Split & Settle**

- **Add** an expense: description, amount, currency (€/£/₹/$), category, who paid,
  optional **date**, and tick who it's **split between**. Untick anyone not in it
  (e.g. the 2 who skip Paris).
- **Edit** any expense with the ✏️ button (it loads back into the form → *Save
  changes*), or remove it with ✕.
- **Who owes what** has a **By couple / By person** toggle:
  - *By couple* nets each couple together and settles through that couple's
    **spoc** (Kc, Madhumay, Parikshit; Nuri is solo) — fewer, simpler payments.
  - *By person* shows every individual's balance.

**Budget** mirrors your **Budget Summary**: category actuals (€/₹/£) vs budget,
variance, and per-person actual/budgeted/ceiling/headroom — all updating live.

**Actions** reads and writes your **Action Items** tab. Items are grouped by
**owner** (who needs to do what) with their deadline, an open/done count, and a
checkbox to mark things complete. Add a new item (task + owner + optional
deadline) from the form; edit ✏️ or remove ✕ any item. Everything syncs to the
Action Items tab.

---

## Reusing for a NEW trip / different group

1. **Copy the `Spain-26` folder** to a new one (e.g. `Trips/Italy-27`).
2. **Copy your spreadsheet** for the new trip. Open its Apps Script, paste
   `Code.gs`, run `setup`, and **deploy a new Web app** (each trip = its own sheet
   + its own URL). The script auto-detects the layout, so as long as the new sheet
   keeps a *Settlement Calculator* tab with the same headers, it just works.
3. **Edit that folder's `config.js`** — everything trip-specific is here:
   `backend.webAppUrl`, `trip`, `people` (names + `group` + which member has
   `spoc: true`), `itinerary`, `stays`, `categoryBudgets`, `perPersonCeilingInr`,
   and `seedExpenses` (preview only).
4. Commit it to the `Trips` repo; it publishes at `…/Trips/Italy-27/`.

No changes to `app.js`, `index.html`, or `styles.css` are ever needed.

---

## Notes

- **What updates live from the sheet** (on refresh): expenses (Settlement
  Calculator), action items (Action Items), the **Itinerary** tab, and exchange
  rates (Currency Reference). The `itinerary` in `config.js` is now just the
  offline-preview fallback. The Stays list and the *budgeted* numbers still come
  from `config.js`.
- **Rates** live in your sheet's *Currency Reference* tab; the website reads them
  automatically. The `demoRates` in `config.js` are only for offline preview.
- **Privacy:** "Who has access: Anyone" means anyone with the exact Web App URL can
  read/add expenses (not your whole account). Keep the link within the group.
