/* =============================================================================
   app.js  —  the engine. You normally never need to edit this.
   All trip-specific values live in config.js.
   ============================================================================= */

(() => {
  "use strict";

  const C = CONFIG;
  const sym = (cur) => C.currencySymbols[cur] || cur;
  const baseSym = sym(C.baseCurrency);
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  // --- money helpers ---------------------------------------------------------
  const toBase = (amount, currency) => {
    const r = C.rates[currency];
    return (typeof r === "number" ? amount * r : amount);
  };
  const fmtBase = (v) =>
    baseSym + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtSecondary = (v) => {
    if (!C.displayCurrency || !C.displayRate) return "";
    const s = sym(C.displayCurrency);
    return s + Math.round(v * C.displayRate).toLocaleString();
  };

  let EXPENSES = [];      // {id, date, desc, category, currency, amount, paidBy, shares:[]}
  const usingBackend = !!(C.backend && C.backend.webAppUrl);
  const LS_KEY = "trip_expenses_" + (C.trip.name || "trip").replace(/\W+/g, "_");

  // ===========================================================================
  //  RENDER: static sections from config
  // ===========================================================================
  function renderHero() {
    $("#heroEmoji").textContent = C.trip.heroEmoji || "🧳";
    $("#tripName").textContent = C.trip.name;
    $("#tripTagline").textContent = C.trip.tagline || "";
    const d = fmtDateRange(C.trip.startDate, C.trip.endDate);
    $("#tripDates").textContent = d;
    const chips = $("#cityChips");
    (C.trip.cities || []).forEach((city) => chips.appendChild(el("span", "chip", city)));
    if (!usingBackend) $("#demoBanner").hidden = false;
  }

  function fmtDateRange(a, b) {
    try {
      const opt = { day: "numeric", month: "short", year: "numeric" };
      const da = new Date(a + "T00:00:00"), db = new Date(b + "T00:00:00");
      return da.toLocaleDateString(undefined, opt) + " – " + db.toLocaleDateString(undefined, opt);
    } catch { return a + " – " + b; }
  }

  function renderItinerary() {
    const wrap = $("#itineraryList");
    C.itinerary.forEach((d) => {
      const card = el("div", "itin-card");
      card.appendChild(el("div", "itin-day", `Day ${d.day}<span>${d.dow} ${d.date}</span>`));
      const body = el("div", "itin-body");
      body.appendChild(el("div", "itin-city", d.city + (d.travel ? ` <span class="itin-travel">${d.travel}</span>` : "")));
      body.appendChild(el("div", "itin-plan", d.plan));
      card.appendChild(body);
      wrap.appendChild(card);
    });
  }

  function renderStays() {
    const wrap = $("#staysList");
    let total = 0;
    C.stays.forEach((s) => {
      total += s.costEUR;
      const card = el("div", "stay-card");
      card.appendChild(el("div", "stay-city", s.city));
      card.appendChild(el("div", "stay-dates", `${s.checkIn} → ${s.checkOut} · ${s.nights} night${s.nights > 1 ? "s" : ""}`));
      card.appendChild(el("div", "stay-addr", s.address));
      card.appendChild(el("div", "stay-cost", `${fmtBase(s.costEUR)} <span>· ${fmtBase(s.perNight)}/night</span>`));
      wrap.appendChild(card);
    });
    $("#staysTotal").innerHTML = `Total accommodation: <strong>${fmtBase(total)}</strong> · ${fmtSecondary(total)}`;
  }

  function renderBudget() {
    const tbody = $("#budgetBody");
    const cats = {};
    let gB = 0, gA = 0;
    C.budget.forEach((r) => {
      cats[r.category] = cats[r.category] || { b: 0, a: 0 };
      cats[r.category].b += r.budgeted || 0;
      cats[r.category].a += r.actual || 0;
      gB += r.budgeted || 0;
      gA += r.actual || 0;
      const tr = el("tr");
      const variance = r.actual == null ? null : r.actual - r.budgeted;
      tr.innerHTML =
        `<td><span class="cat-dot cat-${slug(r.category)}"></span>${r.item}</td>` +
        `<td class="num">${fmtBase(r.budgeted)}</td>` +
        `<td class="num">${r.actual == null ? '<span class="muted">—</span>' : fmtBase(r.actual)}</td>` +
        `<td class="num ${variance == null ? "" : variance <= 0 ? "pos" : "neg"}">${
          variance == null ? "" : (variance <= 0 ? "" : "+") + fmtBase(variance)
        }</td>`;
      tbody.appendChild(tr);
    });
    // subtotal rows per category header ordering not needed; show grand total
    const tf = $("#budgetFoot");
    const gv = gA - gB;
    tf.innerHTML =
      `<tr class="grand"><td>GRAND TOTAL <span class="muted">(actuals so far)</span></td>` +
      `<td class="num">${fmtBase(gB)}</td>` +
      `<td class="num">${fmtBase(gA)}</td>` +
      `<td class="num ${gv <= 0 ? "pos" : "neg"}">${(gv <= 0 ? "" : "+") + fmtBase(gv)}</td></tr>`;
    // category summary chips
    const cs = $("#budgetCats");
    Object.keys(cats).forEach((k) => {
      const c = cats[k];
      const chip = el("div", "bcat");
      chip.innerHTML = `<span class="cat-dot cat-${slug(k)}"></span><span class="bcat-name">${k}</span>` +
        `<span class="bcat-num">${fmtBase(c.a)} <em>/ ${fmtBase(c.b)}</em></span>`;
      cs.appendChild(chip);
    });
  }

  const slug = (s) => s.toLowerCase().replace(/\W+/g, "");

  // ===========================================================================
  //  EXPENSES + SETTLEMENT
  // ===========================================================================
  function peopleNames() { return C.people.map((p) => p.name); }

  function buildForm() {
    // paid-by dropdown
    const paidSel = $("#f_paidBy");
    peopleNames().forEach((n) => paidSel.appendChild(new Option(n, n)));
    // category dropdown
    const catSel = $("#f_category");
    C.categories.forEach((c) => catSel.appendChild(new Option(c, c)));
    // currency dropdown
    const curSel = $("#f_currency");
    Object.keys(C.rates).forEach((cur) => curSel.appendChild(new Option(`${sym(cur)} ${cur}`, cur)));
    curSel.value = C.baseCurrency;
    // share checkboxes (default everyone in)
    const shareWrap = $("#f_shares");
    C.people.forEach((p, i) => {
      const lab = el("label", "share-pill");
      lab.innerHTML = `<input type="checkbox" data-i="${i}" checked><span>${p.name}</span>`;
      shareWrap.appendChild(lab);
    });
    $("#expenseForm").addEventListener("submit", onAddExpense);
  }

  function readForm() {
    const shares = C.people.map((_, i) => {
      const cb = $(`#f_shares input[data-i="${i}"]`);
      return cb && cb.checked ? 1 : 0;
    });
    return {
      date: $("#f_date").value || "",
      desc: $("#f_desc").value.trim(),
      category: $("#f_category").value,
      currency: $("#f_currency").value,
      amount: parseFloat($("#f_amount").value),
      paidBy: $("#f_paidBy").value,
      shares,
    };
  }

  async function onAddExpense(e) {
    e.preventDefault();
    const exp = readForm();
    if (!exp.desc || !(exp.amount > 0) || exp.shares.every((s) => s === 0)) {
      toast("Add a description, an amount, and at least one person sharing it.");
      return;
    }
    setBusy(true);
    try {
      if (usingBackend) {
        const res = await api("add", { expense: exp });
        exp.id = res.expense?.id || res.id || genId();
      } else {
        exp.id = genId();
      }
      EXPENSES.push(exp);
      persistLocal();
      $("#expenseForm").reset();
      resetShareChecks();
      $("#f_currency").value = C.baseCurrency;
      renderExpenses();
      renderSettlement();
      toast("Expense added ✓");
    } catch (err) {
      toast("Couldn't save: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteExpense(id) {
    if (!confirm("Remove this expense?")) return;
    setBusy(true);
    try {
      if (usingBackend) await api("delete", { id });
      EXPENSES = EXPENSES.filter((x) => x.id !== id);
      persistLocal();
      renderExpenses();
      renderSettlement();
    } catch (err) {
      toast("Couldn't delete: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  function resetShareChecks() {
    C.people.forEach((_, i) => {
      const cb = $(`#f_shares input[data-i="${i}"]`);
      if (cb) cb.checked = true;
    });
  }

  function renderExpenses() {
    const tbody = $("#expenseBody");
    tbody.innerHTML = "";
    if (!EXPENSES.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="muted center">No expenses logged yet — add the first one above.</td></tr>`;
      $("#expTotal").textContent = "";
      return;
    }
    let total = 0;
    EXPENSES.forEach((x) => {
      const eur = toBase(x.amount, x.currency);
      total += eur;
      const sharers = C.people.filter((_, i) => (x.shares[i] || 0) > 0).map((p) => p.name);
      const tr = el("tr");
      tr.innerHTML =
        `<td><div class="ex-desc">${escapeHtml(x.desc)}</div><div class="ex-sub"><span class="cat-dot cat-${slug(x.category)}"></span>${x.category}${x.date ? " · " + x.date : ""}</div></td>` +
        `<td class="num">${x.currency !== C.baseCurrency ? `<span class="muted">${sym(x.currency)}${x.amount.toLocaleString()}</span><br>` : ""}${fmtBase(eur)}</td>` +
        `<td>${escapeHtml(x.paidBy)}</td>` +
        `<td class="ex-shares">${sharers.length === C.people.length ? "Everyone" : sharers.join(", ")}</td>` +
        `<td class="right"><button class="del" title="Remove" data-id="${x.id}">✕</button></td>`;
      tbody.appendChild(tr);
    });
    $("#expTotal").innerHTML = `${EXPENSES.length} expense${EXPENSES.length > 1 ? "s" : ""} · pool total <strong>${fmtBase(total)}</strong> · ${fmtSecondary(total)}`;
    tbody.querySelectorAll(".del").forEach((b) =>
      b.addEventListener("click", () => onDeleteExpense(b.dataset.id))
    );
  }

  // Core settlement math (mirrors the Google Sheet exactly)
  function computeSettlement() {
    const n = C.people.length;
    const paid = Array(n).fill(0);
    const owed = Array(n).fill(0);
    EXPENSES.forEach((x) => {
      const eur = toBase(x.amount, x.currency);
      const totalShares = x.shares.reduce((a, b) => a + (b || 0), 0);
      if (totalShares <= 0) return;
      // credit the payer
      const payerIdx = C.people.findIndex((p) => p.name === x.paidBy);
      if (payerIdx >= 0) paid[payerIdx] += eur;
      // debit each sharer
      x.shares.forEach((s, i) => { if (s) owed[i] += (eur * s) / totalShares; });
    });
    const rows = C.people.map((p, i) => ({
      name: p.name, group: p.group,
      paid: paid[i], owed: owed[i], net: paid[i] - owed[i],
    }));
    return rows;
  }

  // Greedy minimal-transfers settlement
  function minimalTransfers(rows) {
    const creditors = rows.filter((r) => r.net > 0.01).map((r) => ({ name: r.name, amt: r.net })).sort((a, b) => b.amt - a.amt);
    const debtors = rows.filter((r) => r.net < -0.01).map((r) => ({ name: r.name, amt: -r.net })).sort((a, b) => b.amt - a.amt);
    const tx = [];
    let ci = 0, di = 0;
    while (ci < creditors.length && di < debtors.length) {
      const give = Math.min(creditors[ci].amt, debtors[di].amt);
      tx.push({ from: debtors[di].name, to: creditors[ci].name, amt: give });
      creditors[ci].amt -= give;
      debtors[di].amt -= give;
      if (creditors[ci].amt < 0.01) ci++;
      if (debtors[di].amt < 0.01) di++;
    }
    return tx;
  }

  function renderSettlement() {
    const rows = computeSettlement();
    const tbody = $("#settleBody");
    tbody.innerHTML = "";
    rows.forEach((r) => {
      const tr = el("tr");
      const cls = r.net > 0.01 ? "pos" : r.net < -0.01 ? "neg" : "";
      const status = r.net > 0.01 ? `is owed ${fmtBase(r.net)}` : r.net < -0.01 ? `owes ${fmtBase(-r.net)}` : "settled up";
      tr.innerHTML =
        `<td><strong>${escapeHtml(r.name)}</strong><div class="ex-sub">${r.group}</div></td>` +
        `<td class="num">${fmtBase(r.paid)}</td>` +
        `<td class="num">${fmtBase(r.owed)}</td>` +
        `<td class="num ${cls}"><strong>${r.net >= 0 ? "+" : ""}${fmtBase(r.net)}</strong><div class="ex-sub">${fmtSecondary(Math.abs(r.net))}</div></td>` +
        `<td class="${cls}">${status}</td>`;
      tbody.appendChild(tr);
    });
    // who pays whom
    const tx = minimalTransfers(rows);
    const list = $("#transferList");
    list.innerHTML = "";
    if (!tx.length) {
      list.innerHTML = `<div class="muted center">Everyone's square — nothing to settle yet.</div>`;
    } else {
      tx.forEach((t) => {
        const row = el("div", "transfer");
        row.innerHTML = `<span class="t-from">${escapeHtml(t.from)}</span><span class="t-arrow">→</span><span class="t-to">${escapeHtml(t.to)}</span><span class="t-amt">${fmtBase(t.amt)} <em>${fmtSecondary(t.amt)}</em></span>`;
        list.appendChild(row);
      });
    }
    // integrity check
    const sumNet = rows.reduce((a, r) => a + r.net, 0);
    $("#settleCheck").textContent = Math.abs(sumNet) < 0.01 ? "Balances reconcile ✓" : "⚠ Net check: " + fmtBase(sumNet);
  }

  // ===========================================================================
  //  BACKEND
  // ===========================================================================
  async function api(action, payload) {
    // POST as text/plain to avoid a CORS preflight against Apps Script
    const res = await fetch(C.backend.webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "backend error");
    return data;
  }

  async function loadExpenses() {
    if (usingBackend) {
      try {
        const url = C.backend.webAppUrl + (C.backend.webAppUrl.includes("?") ? "&" : "?") + "action=list";
        const res = await fetch(url);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "list failed");
        EXPENSES = (data.expenses || []).map(normalizeExpense);
      } catch (err) {
        toast("Couldn't reach the sheet — showing local copy. (" + err.message + ")");
        EXPENSES = loadLocal();
      }
    } else {
      EXPENSES = loadLocal();
      if (!EXPENSES.length) {
        EXPENSES = C.seedExpenses.map((e, i) => ({ ...e, id: "seed" + i }));
        persistLocal();
      }
    }
    renderExpenses();
    renderSettlement();
  }

  function normalizeExpense(e) {
    return {
      id: e.id != null ? String(e.id) : genId(),
      date: e.date || "",
      desc: e.desc || e.description || "",
      category: e.category || "Other",
      currency: e.currency || C.baseCurrency,
      amount: Number(e.amount) || 0,
      paidBy: e.paidBy || e.paid_by || "",
      shares: Array.isArray(e.shares) ? e.shares.map(Number) : C.people.map(() => 1),
    };
  }

  // local storage (demo mode + offline fallback)
  function persistLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(EXPENSES)); } catch {} }
  function loadLocal() { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } }

  // ===========================================================================
  //  UI helpers
  // ===========================================================================
  let toastT;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("show"), 3200);
  }
  function setBusy(b) { $("#expenseForm").classList.toggle("busy", b); }
  const genId = () => "x" + Math.abs(hashStr(Date.now() + ":" + Math.floor(performance.now() * 1000) + ":" + EXPENSES.length)).toString(36);
  function hashStr(s) { s = String(s); let h = 0; for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return h; }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  // tab nav
  function initTabs() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        $("#" + btn.dataset.tab).classList.add("active");
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  // ===========================================================================
  //  BOOT
  // ===========================================================================
  document.addEventListener("DOMContentLoaded", () => {
    renderHero();
    renderItinerary();
    renderStays();
    renderBudget();
    buildForm();
    initTabs();
    loadExpenses();
  });
})();
