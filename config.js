/* =============================================================================
   TRIP CONFIG  —  EDIT THIS ONE FILE TO SET UP A NEW TRIP FOR A NEW GROUP
   =============================================================================
   Everything the dashboard shows is driven from this file. To reuse this whole
   app for a different trip/group, copy the folder and change the values below.
   You do NOT need to touch app.js, index.html or styles.css.

   Quick start for a NEW trip:
     1. backend.webAppUrl  -> paste the URL of your deployed Apps Script (see README)
     2. trip {...}         -> name, dates, tagline, currency symbols
     3. people [...]       -> who's in the group + couple/solo groupings
     4. rates {...}        -> exchange rates into the base currency
     5. itinerary / stays / budget -> the trip's plan and numbers
   ============================================================================= */

const CONFIG = {

  /* ---- BACKEND -----------------------------------------------------------
     Paste the Web App URL you get after deploying Code.gs (see README).
     Leave as "" to run in DEMO mode (uses seedExpenses below + this browser's
     local storage, so you can preview before wiring up the Google Sheet). */
  backend: {
    webAppUrl: "https://script.google.com/macros/s/AKfycbwxkQ8RWWRefqtbKqkcwBceuqzGG7jqeEu4Rb0gTgQbff0CcLVByKEBbXTdjvbEBABJDA/exec",            // e.g. "https://script.google.com/macros/s/AKfy.../exec"
  },

  /* ---- TRIP META --------------------------------------------------------- */
  trip: {
    name: "Spain → France Reunion",
    tagline: "11 nights • Barcelona · Girona · Lyon · Paris",
    startDate: "2026-08-27",
    endDate: "2026-09-07",
    groupSize: 7,
    heroEmoji: "🌴",
    // Cities shown as chips in the hero
    cities: ["Barcelona", "Girona", "Lyon", "Paris"],
  },

  /* ---- CURRENCY ----------------------------------------------------------
     baseCurrency = the currency everything is settled in.
     rates = how many BASE units one unit of each currency is worth.
     (Base currency must be 1.) displayCurrency adds a secondary readout. */
  baseCurrency: "EUR",
  currencySymbols: { EUR: "€", GBP: "£", INR: "₹", USD: "$" },
  rates: {
    EUR: 1,        // base
    GBP: 1.165,    // 1 GBP = 1.165 EUR
    USD: 0.92,     // 1 USD = 0.92 EUR   (default — adjust to current rate)
    INR: 0.011,    // 1 INR = 0.011 EUR  (~ €1 = ₹90; used if someone pays in ₹)
  },
  // Secondary currency shown alongside the base (for the folks thinking in ₹)
  displayCurrency: "INR",
  displayRate: 112,   // 1 EUR = 112 INR (secondary readout only)

  /* ---- PEOPLE ------------------------------------------------------------
     "group" is just a label (couple/solo) shown in the UI. Order = P1..Pn,
     which must match the columns your Apps Script writes. Add/remove freely. */
  people: [
    { id: "P1", name: "Kc",        group: "Couple A" },
    { id: "P2", name: "Ankita",    group: "Couple A" },
    { id: "P3", name: "Madhumay",  group: "Couple B" },
    { id: "P4", name: "Anusha",    group: "Couple B" },
    { id: "P5", name: "Parikshit", group: "Couple C" },
    { id: "P6", name: "Jushmita",  group: "Couple C" },
    { id: "P7", name: "Nuri",      group: "Solo" },
  ],

  /* Expense categories offered in the add-expense form */
  categories: ["Accommodation", "Travel", "Activities", "Food", "Contingency", "Other"],

  /* ---- ITINERARY --------------------------------------------------------- */
  itinerary: [
    { day: 1,  date: "27 Aug", dow: "Thu", city: "Barcelona",        plan: "Arrive BCN, transfer to apartment in Sarrià-St. Gervasi, settle in", travel: "✈️ Inbound" },
    { day: 2,  date: "28 Aug", dow: "Fri", city: "Barcelona",        plan: "Sagrada Familia, Park Güell, evening tapas", travel: "" },
    { day: 3,  date: "29 Aug", dow: "Sat", city: "Barcelona",        plan: "Gothic Quarter, Boqueria market, Picasso Museum", travel: "" },
    { day: 4,  date: "30 Aug", dow: "Sun", city: "Barcelona → Girona", plan: "Renfe R11 BCN Sants → Girona (~1h20) + taxi to villa, evening old town", travel: "🚆 Train" },
    { day: 5,  date: "31 Aug", dow: "Mon", city: "Girona / Empordà", plan: "Banyoles Lake or Girona old town, evening at the villa pool", travel: "" },
    { day: 6,  date: "1 Sep",  dow: "Tue", city: "Girona / Coast",   plan: "Private catamaran day on Costa Brava (Tossa marina)", travel: "🚐 Day van" },
    { day: 7,  date: "2 Sep",  dow: "Wed", city: "Girona → Lyon",    plan: "Taxi to station, TGV Girona → Lyon Part-Dieu (~5h). All 7 together.", travel: "🚆 Train" },
    { day: 8,  date: "3 Sep",  dow: "Thu", city: "Lyon",             plan: "Vieux Lyon (UNESCO), Fourvière basilica, bouchon dinner — last full group day", travel: "" },
    { day: 9,  date: "4 Sep",  dow: "Fri", city: "Lyon → Paris",     plan: "Group splits at Part-Dieu. 5 take TGV to Paris; 2 go their own way. Latin Quarter dinner.", travel: "🚆 Split" },
    { day: 10, date: "5 Sep",  dow: "Sat", city: "Paris",            plan: "Eiffel Tower, Louvre, Marais wander, evening Seine cruise", travel: "" },
    { day: 11, date: "6 Sep",  dow: "Sun", city: "Paris",            plan: "Versailles half-day or Montmartre + Sacré-Cœur, last group dinner", travel: "" },
    { day: 12, date: "7 Sep",  dow: "Mon", city: "Paris → CDG",      plan: "Pre-booked van to CDG, depart (open-jaw: BCN in / CDG out)", travel: "✈️ Outbound" },
  ],

  /* ---- ACCOMMODATION ----------------------------------------------------- */
  stays: [
    { city: "Barcelona", checkIn: "27 Aug", checkOut: "30 Aug", nights: 3, address: "Calle Aribau 226-228, Sarrià-St. Gervasi, Barcelona", costEUR: 1293, perNight: 431 },
    { city: "Girona",    checkIn: "30 Aug", checkOut: "2 Sep",  nights: 3, address: "Carrer Ginesta 9, 17002 Girona", costEUR: 952,  perNight: 317 },
    { city: "Lyon",      checkIn: "2 Sep",  checkOut: "4 Sep",  nights: 2, address: "35 Quai Charles de Gaulle, 6th arr., Lyon", costEUR: 552, perNight: 276 },
    { city: "Paris",     checkIn: "4 Sep",  checkOut: "7 Sep",  nights: 3, address: "22 Avenue du Professeur Lemierre, Montreuil", costEUR: 728, perNight: 243 },
  ],

  /* ---- BUDGET vs ACTUAL --------------------------------------------------
     actual = null means "not booked yet". Subtotals & variance auto-calculate. */
  budget: [
    { category: "Accommodation", item: "Barcelona (3 nights — Sarrià)",         budgeted: 1293, actual: 1293 },
    { category: "Accommodation", item: "Girona (3 nights)",                     budgeted: 952,  actual: 952 },
    { category: "Accommodation", item: "Lyon (2 nights, all 7)",                budgeted: 552,  actual: 552 },
    { category: "Accommodation", item: "Paris Sep 4-7 (5 ppl, 2-bath)",         budgeted: 900,  actual: 728 },
    { category: "Travel", item: "Renfe BCN → Girona (all 7)",                   budgeted: 157,  actual: 133 },
    { category: "Travel", item: "Catamaran-day private van (Girona ↔ Tossa)",   budgeted: 1250, actual: null },
    { category: "Travel", item: "TGV Girona → Lyon (all 7)",                    budgeted: 670,  actual: 600 },
    { category: "Travel", item: "TGV Lyon → Paris (5 ppl)",                     budgeted: 300,  actual: 156 },
    { category: "Travel", item: "Paris → CDG private van (5 ppl)",              budgeted: 130,  actual: null },
    { category: "Travel", item: "Local transit (metros, taxis)",               budgeted: 200,  actual: null },
    { category: "Activities", item: "Sagrada Familia (€30 × 7)",                budgeted: 210,  actual: null },
    { category: "Activities", item: "Park Güell (€15 × 7)",                     budgeted: 105,  actual: null },
    { category: "Activities", item: "Picasso Museum (€15 × 7)",                 budgeted: 105,  actual: null },
    { category: "Activities", item: "Casa Batlló (optional, €40 × 7)",          budgeted: 280,  actual: null },
    { category: "Activities", item: "Tablao Cordobés flamenco (€45 × 7)",       budgeted: 315,  actual: null },
    { category: "Activities", item: "Lyon walking + Fourvière (€5 × 7)",        budgeted: 35,   actual: null },
    { category: "Activities", item: "Lyon bouchon dinner (€50 × 7)",            budgeted: 350,  actual: null },
    { category: "Activities", item: "Eiffel Tower summit (€30 × 5)",            budgeted: 150,  actual: null },
    { category: "Activities", item: "Louvre (€22 × 5)",                         budgeted: 110,  actual: null },
    { category: "Activities", item: "Seine cruise (€40 × 5)",                   budgeted: 200,  actual: null },
    { category: "Activities", item: "Versailles (optional, €30 × 5)",           budgeted: 150,  actual: null },
    { category: "Activities", item: "Misc tickets / surprises",                 budgeted: 200,  actual: null },
    { category: "Food", item: "Barcelona street food (3d × 7 × €40)",           budgeted: 840,  actual: null },
    { category: "Food", item: "Girona street food (3d × 7 × €40)",              budgeted: 840,  actual: null },
    { category: "Food", item: "Lyon street food (2d × 7 × €45)",                budgeted: 630,  actual: null },
    { category: "Food", item: "Paris street food (3d × 5 × €45)",               budgeted: 675,  actual: null },
    { category: "Food", item: "Travel-day snacks / coffees",                    budgeted: 100,  actual: null },
    { category: "Contingency", item: "Buffer / surprises",                      budgeted: 500,  actual: null },
  ],

  /* ---- SEED EXPENSES -----------------------------------------------------
     Used only in DEMO mode (no backend URL) AND as the initial rows your
     Apps Script writes the first time you run its setup. shares array lines up
     with people[] order: 1 = normal share, 0 = excluded, 2 = double share. */
  seedExpenses: [
    { date: "", desc: "Barcelona Stay",    category: "Accommodation", currency: "GBP", amount: 920.19, paidBy: "Kc", shares: [1,1,1,1,1,1,1] },
    { date: "", desc: "Girona Stay",       category: "Accommodation", currency: "GBP", amount: 817.55, paidBy: "Kc", shares: [1,1,1,1,1,1,1] },
    { date: "", desc: "Lyon Stay",         category: "Accommodation", currency: "GBP", amount: 444.00, paidBy: "Kc", shares: [1,1,1,1,1,1,1] },
    { date: "", desc: "Paris Stay",        category: "Accommodation", currency: "GBP", amount: 625.57, paidBy: "Kc", shares: [1,1,1,1,0,0,1] },
    { date: "", desc: "Barcelona → Girona",category: "Travel",        currency: "GBP", amount: 112.77, paidBy: "Kc", shares: [1,1,1,1,1,1,1] },
    { date: "", desc: "Girona → Lyon",     category: "Travel",        currency: "GBP", amount: 509.96, paidBy: "Kc", shares: [1,1,1,1,1,1,1] },
    { date: "", desc: "Lyon → Paris",      category: "Travel",        currency: "GBP", amount: 131.62, paidBy: "Kc", shares: [1,1,1,1,0,0,1] },
    { date: "", desc: "Car rental",        category: "Travel",        currency: "EUR", amount: 142.21, paidBy: "Kc", shares: [1,1,1,1,1,1,1] },
  ],
};
