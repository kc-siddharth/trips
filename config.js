/* =============================================================================
   TRIP CONFIG  —  EDIT THIS ONE FILE TO SET UP A NEW TRIP FOR A NEW GROUP
   =============================================================================
   Everything the dashboard shows is driven from this file. To reuse this whole
   app for a different trip/group, copy the folder and change the values below.
   You do NOT need to touch app.js, index.html or styles.css.

   Quick start for a NEW trip:
     1. backend.webAppUrl  -> paste the URL of your deployed Apps Script (see README)
     2. trip {...}         -> name, dates, tagline, currency
     3. people [...]       -> the group + couple groupings + which member is the spoc
     4. itinerary / stays / budget -> the trip's plan and numbers

   NOTE ON MONEY: when the backend is connected, all currency conversion and the
   settlement totals come straight from your Google Sheet (its Currency Reference
   tab + Amount (€) formulas), so the website always matches the sheet. The
   `demoRates` below are only used for the offline preview when no backend is set.
   ============================================================================= */

const CONFIG = {

  /* ---- BACKEND -----------------------------------------------------------
     Paste the Web App URL you get after deploying Code.gs (see README).
     Leave "" to run in DEMO mode (uses seedExpenses + this browser's storage). */
  backend: {
    webAppUrl: "https://script.google.com/macros/s/AKfycbwxkQ8RWWRefqtbKqkcwBceuqzGG7jqeEu4Rb0gTgQbff0CcLVByKEBbXTdjvbEBABJDA/exec",
  },

  /* ---- TRIP META --------------------------------------------------------- */
  trip: {
    name: "Spain → France Reunion",
    tagline: "11 nights • Barcelona · Girona · Lyon · Paris",
    startDate: "2026-08-27",
    endDate: "2026-09-07",
    groupSize: 7,
    heroEmoji: "🌴",
    cities: ["Barcelona", "Girona", "Lyon", "Paris"],
  },

  /* ---- CURRENCY ----------------------------------------------------------
     baseSymbol = the currency everything settles in.
     currencies = what people can pay in (symbols must match the sheet's dropdown).
     displaySymbol/displayRate = a secondary readout shown alongside the base. */
  baseSymbol: "€",
  currencies: ["€", "£", "₹", "$"],
  displaySymbol: "₹",
  displayRate: 112,   // 1 € = 112 ₹  (secondary readout; live mode uses the sheet)

  // Offline-preview conversion only (symbol -> value in €). Live mode ignores these.
  demoRates: { "€": 1, "£": 1.165, "₹": 1 / 112, "$": 112 / 95.19 },

  /* ---- PEOPLE ------------------------------------------------------------
     Order = P1..Pn and MUST match the P columns in the sheet.
     group  = couple/unit label. spoc:true marks the one person who represents
     that couple when settling up (the couple's expenses net through them). */
  people: [
    { id: "P1", name: "Kc",        group: "Couple A", spoc: true },
    { id: "P2", name: "Ankita",    group: "Couple A" },
    { id: "P3", name: "Madhumay",  group: "Couple B", spoc: true },
    { id: "P4", name: "Anusha",    group: "Couple B" },
    { id: "P5", name: "Parikshit", group: "Couple C", spoc: true },
    { id: "P6", name: "Jushmita",  group: "Couple C" },
    { id: "P7", name: "Nuri",      group: "Solo",     spoc: true },
  ],

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

  /* ---- BUDGET (category ceilings, matching your Budget Summary) ----------
     Actuals are pulled live from the expenses; you only set the budgeted €. */
  categoryBudgets: {
    Accommodation: 3697,
    Travel: 2707,
    Activities: 2210,
    Food: 3085,
    Contingency: 500,
  },
  perPersonCeilingInr: 150000,   // ₹1.5 lakh ground-cost ceiling per person

  /* ---- SEED ACTION ITEMS (DEMO mode only) -------------------------------
     Live mode reads these from the "Action Items" tab. status "Done" = complete. */
  seedActions: [
    { task: "Book private catamaran charter (Tossa marina, Sep 1)", owner: "Kc", deadline: "By 30 June 2026", status: "" },
    { task: "Book Sagrada Familia tickets (4-6 weeks ahead)", owner: "Kc", deadline: "By 15 July 2026", status: "" },
    { task: "Book Tablao Cordobés flamenco show (Barcelona)", owner: "Kc", deadline: "By 15 July 2026", status: "" },
    { task: "Book Eiffel Tower summit access tickets", owner: "Kc", deadline: "By early July 2026", status: "" },
    { task: "Book Louvre timed entry", owner: "Kc", deadline: "Few weeks before", status: "" },
    { task: "Pre-book Paris → CDG van transfer (Sep 7, 5 ppl)", owner: "Kc", deadline: "By mid-August", status: "" },
    { task: "Lyon bouchon dinner reservation (Café des Fédérations)", owner: "Kc", deadline: "By August", status: "" },
    { task: "Final group dinner reservation in Paris (Sep 6)", owner: "Kc", deadline: "By August", status: "" },
    { task: "Confirm accommodation bookings with the group", owner: "Kc", deadline: "By 15 May 2026", status: "Done" },
    { task: "Book all trains (Renfe + both TGVs)", owner: "Kc", deadline: "By 15 July 2026", status: "Done" },
  ],

  /* ---- SEED EXPENSES (DEMO mode only) -----------------------------------
     shares line up with people[] order: 1 = normal, 0 = excluded, 2 = double. */
  seedExpenses: [
    { date: "", desc: "Barcelona Stay",     category: "Accommodation", currency: "£", amount: 920.19, paidBy: "Kc", shares: [1,1,1,1,1,1,1] },
    { date: "", desc: "Girona Stay",        category: "Accommodation", currency: "£", amount: 817.55, paidBy: "Kc", shares: [1,1,1,1,1,1,1] },
    { date: "", desc: "Lyon Stay",          category: "Accommodation", currency: "£", amount: 444.00, paidBy: "Kc", shares: [1,1,1,1,1,1,1] },
    { date: "", desc: "Paris Stay",         category: "Accommodation", currency: "£", amount: 625.57, paidBy: "Kc", shares: [1,1,1,1,0,0,1] },
    { date: "", desc: "Barcelona → Girona", category: "Travel",        currency: "£", amount: 112.77, paidBy: "Kc", shares: [1,1,1,1,1,1,1] },
    { date: "", desc: "Girona → Lyon",      category: "Travel",        currency: "£", amount: 509.96, paidBy: "Kc", shares: [1,1,1,1,1,1,1] },
    { date: "", desc: "Lyon → Paris",       category: "Travel",        currency: "£", amount: 131.62, paidBy: "Kc", shares: [1,1,1,1,0,0,1] },
    { date: "", desc: "Car rental",         category: "Travel",        currency: "€", amount: 142.21, paidBy: "Kc", shares: [1,1,1,1,1,1,1] },
  ],
};
