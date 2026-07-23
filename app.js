/* =============================================================================
   app.js  —  the engine. You normally never need to edit this.
   All trip-specific values live in config.js.
   ============================================================================= */

(() => {
  "use strict";

  const C = CONFIG;
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slug = (s) => String(s).toLowerCase().replace(/\W+/g, "");

  const usingBackend = !!(C.backend && C.backend.webAppUrl);
  const LS_KEY = "trip_expenses_" + (C.trip.name || "trip").replace(/\W+/g, "_");

  // live rates (populated from the sheet when the backend is connected)
  const STATE = {
    gbpEur: C.demoRates["£"] || 1.165,          // 1 £ = ? €
    eurInr: C.displayRate || 112,               // 1 € = ? ₹
    expenses: [],
    editingId: null,
    settleView: "couple",                       // "couple" | "person"
    actions: [],
    editingActionId: null,
    itinerary: null,   // set from the sheet when the backend is connected
  };

  // --- money helpers ---------------------------------------------------------
  const baseSym = C.baseSymbol || "€";
  const fmtBase = (v) => baseSym + (Math.abs(v) < 0.005 ? 0 : v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtInr = (v) => (C.displaySymbol || "₹") + Math.round(v * STATE.eurInr).toLocaleString();
  const fmtGbp = (v) => "£" + (v / STATE.gbpEur).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const demoEur = (amount, sym) => amount * (C.demoRates[sym] != null ? C.demoRates[sym] : 1);

  // ===========================================================================
  //  STATIC SECTIONS
  // ===========================================================================
  function renderHero() {
    $("#heroEmoji").textContent = C.trip.heroEmoji || "🧳";
    $("#tripName").textContent = C.trip.name;
    $("#tripTagline").textContent = C.trip.tagline || "";
    $("#tripDates").textContent = fmtDateRange(C.trip.startDate, C.trip.endDate);
    const chips = $("#cityChips");
    (C.trip.cities || []).forEach((city) => chips.appendChild(el("span", "chip", city)));
    if (!usingBackend) $("#demoBanner").hidden = false;
  }
  function fmtDateRange(a, b) {
    try {
      const opt = { day: "numeric", month: "short", year: "numeric" };
      return new Date(a + "T00:00:00").toLocaleDateString(undefined, opt) + " – " +
             new Date(b + "T00:00:00").toLocaleDateString(undefined, opt);
    } catch { return a + " – " + b; }
  }
  function prettyDate(d) {
    if (!d) return "";
    const dt = new Date(d + "T00:00:00");
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }

  function renderItinerary() {
    const wrap = $("#itineraryList");
    wrap.innerHTML = "";
    const list = (STATE.itinerary && STATE.itinerary.length) ? STATE.itinerary : C.itinerary;
    list.forEach((d) => {
      const day = d.day === "" || d.day == null ? "" : `Day ${Number(d.day) || d.day}`;
      const dow = (d.dow || "").slice(0, 3);
      const card = el("div", "itin-card");
      card.appendChild(el("div", "itin-day", `${day}<span>${escapeHtml((dow + " " + (d.date || "")).trim())}</span>`));
      const body = el("div", "itin-body");
      body.appendChild(el("div", "itin-city", escapeHtml(d.city) + (d.travel ? ` <span class="itin-travel">${escapeHtml(d.travel)}</span>` : "")));
      body.appendChild(el("div", "itin-plan", escapeHtml(d.plan)));
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
    $("#staysTotal").innerHTML = `Total accommodation: <strong>${fmtBase(total)}</strong> · ${fmtInr(total)}`;
  }

  // ===========================================================================
  //  BUDGET SUMMARY  (category rollup + per-person, mirrors the sheet)
  // ===========================================================================
  function renderBudgetSummary() {
    const cats = Object.keys(C.categoryBudgets);
    const actualByCat = {};
    cats.forEach((k) => (actualByCat[k] = 0));
    STATE.expenses.forEach((x) => {
      if (actualByCat[x.category] == null) actualByCat[x.category] = 0;
      actualByCat[x.category] += x.amountEur;
    });

    const tbody = $("#budgetBody");
    tbody.innerHTML = "";
    let tAct = 0, tBud = 0;
    Object.keys(actualByCat).forEach((k) => {
      const act = actualByCat[k], bud = C.categoryBudgets[k] || 0;
      tAct += act; tBud += bud;
      const varc = act - bud;
      const tr = el("tr");
      tr.innerHTML =
        `<td><span class="cat-dot cat-${slug(k)}"></span>${k}</td>` +
        `<td class="num">${fmtBase(act)}</td>` +
        `<td class="num muted">${fmtInr(act)}</td>` +
        `<td class="num muted">${fmtGbp(act)}</td>` +
        `<td class="num">${fmtBase(bud)}</td>` +
        `<td class="num ${varc <= 0 ? "pos" : "neg"}">${(varc <= 0 ? "" : "+") + fmtBase(varc)}</td>`;
      tbody.appendChild(tr);
    });
    const gVar = tAct - tBud;
    $("#budgetFoot").innerHTML =
      `<tr class="grand"><td>TOTAL GROUP (ground only)</td>` +
      `<td class="num">${fmtBase(tAct)}</td>` +
      `<td class="num">${fmtInr(tAct)}</td>` +
      `<td class="num">${fmtGbp(tAct)}</td>` +
      `<td class="num">${fmtBase(tBud)}</td>` +
      `<td class="num ${gVar <= 0 ? "pos" : "neg"}">${(gVar <= 0 ? "" : "+") + fmtBase(gVar)}</td></tr>`;

    // per-person
    const n = C.trip.groupSize || C.people.length;
    const ppActual = tAct / n, ppBudget = tBud / n;
    const ceilInr = C.perPersonCeilingInr || 0;
    const ceilEur = ceilInr / STATE.eurInr;
    const headroom = ceilEur - ppActual;
    $("#budgetPP").innerHTML =
      ppCard("Per person — actual so far", fmtBase(ppActual), fmtInr(ppActual)) +
      ppCard("Per person — budgeted", fmtBase(ppBudget), fmtInr(ppBudget)) +
      ppCard("Ground-cost ceiling", fmtBase(ceilEur), (C.displaySymbol || "₹") + ceilInr.toLocaleString()) +
      ppCard("Headroom vs ceiling (actual)", fmtBase(headroom), (headroom >= 0 ? "Under budget ✓" : "Over — trim"), headroom >= 0 ? "pos" : "neg");
  }
  function ppCard(label, big, small, cls) {
    return `<div class="pp"><div class="pp-label">${label}</div><div class="pp-big ${cls || ""}">${big}</div><div class="pp-small">${small}</div></div>`;
  }

  // ===========================================================================
  //  EXPENSE FORM (add + edit)
  // ===========================================================================
  function buildForm() {
    C.people.forEach((p) => $("#f_paidBy").appendChild(new Option(p.name, p.name)));
    C.categories.forEach((c) => $("#f_category").appendChild(new Option(c, c)));
    C.currencies.forEach((s) => $("#f_currency").appendChild(new Option(s, s)));
    $("#f_currency").value = C.baseSymbol;
    const shareWrap = $("#f_shares");
    C.people.forEach((p, i) => {
      const lab = el("label", "share-pill");
      lab.innerHTML = `<input type="checkbox" data-i="${i}" checked><span>${escapeHtml(p.name)}</span>`;
      shareWrap.appendChild(lab);
    });
    $("#expenseForm").addEventListener("submit", onSubmitExpense);
    $("#cancelEdit").addEventListener("click", exitEditMode);
  }

  function readForm() {
    return {
      date: $("#f_date").value || "",
      desc: $("#f_desc").value.trim(),
      category: $("#f_category").value,
      currency: $("#f_currency").value,
      amount: parseFloat($("#f_amount").value),
      paidBy: $("#f_paidBy").value,
      shares: C.people.map((_, i) => ($(`#f_shares input[data-i="${i}"]`).checked ? 1 : 0)),
    };
  }

  async function onSubmitExpense(e) {
    e.preventDefault();
    const exp = readForm();
    if (!exp.desc || !(exp.amount > 0) || exp.shares.every((s) => s === 0)) {
      toast("Add a description, an amount, and at least one person sharing it.");
      return;
    }
    setBusy(true);
    try {
      if (STATE.editingId != null) {
        if (usingBackend) await api("update", { id: STATE.editingId, expense: exp });
        else {
          const idx = STATE.expenses.findIndex((x) => x.id === STATE.editingId);
          if (idx >= 0) STATE.expenses[idx] = { ...STATE.expenses[idx], ...exp, amountEur: demoEur(exp.amount, exp.currency) };
          persistLocal();
        }
        toast("Expense updated ✓");
      } else {
        if (usingBackend) await api("add", { expense: exp });
        else {
          STATE.expenses.push({ ...exp, id: genId(), amountEur: demoEur(exp.amount, exp.currency) });
          persistLocal();
        }
        toast("Expense added ✓");
      }
      exitEditMode();
      await reload();
    } catch (err) {
      toast("Couldn't save: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  function enterEditMode(x) {
    STATE.editingId = x.id;
    $("#f_date").value = x.date || "";
    $("#f_desc").value = x.desc;
    $("#f_category").value = C.categories.includes(x.category) ? x.category : "Other";
    $("#f_currency").value = C.currencies.includes(x.currency) ? x.currency : C.baseSymbol;
    $("#f_amount").value = x.amount;
    $("#f_paidBy").value = x.paidBy;
    C.people.forEach((_, i) => ($(`#f_shares input[data-i="${i}"]`).checked = (x.shares[i] || 0) > 0));
    $("#formTitle").textContent = "✏️ Edit expense";
    $("#submitBtn").textContent = "Save changes";
    $("#cancelEdit").hidden = false;
    $("#addCard").classList.add("editing");
    $("#addCard").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function exitEditMode() {
    STATE.editingId = null;
    $("#expenseForm").reset();
    C.people.forEach((_, i) => ($(`#f_shares input[data-i="${i}"]`).checked = true));
    $("#f_currency").value = C.baseSymbol;
    $("#formTitle").textContent = "➕ Add an expense";
    $("#submitBtn").textContent = "Add expense";
    $("#cancelEdit").hidden = true;
    $("#addCard").classList.remove("editing");
  }

  async function onDeleteExpense(id) {
    if (!confirm("Remove this expense?")) return;
    setBusy(true);
    try {
      if (usingBackend) await api("delete", { id });
      else { STATE.expenses = STATE.expenses.filter((x) => x.id !== id); persistLocal(); }
      if (STATE.editingId === id) exitEditMode();
      await reload();
    } catch (err) {
      toast("Couldn't delete: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  // ===========================================================================
  //  EXPENSE LIST
  // ===========================================================================
  function renderExpenses() {
    const tbody = $("#expenseBody");
    tbody.innerHTML = "";
    if (!STATE.expenses.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="muted center">No expenses logged yet — add the first one above.</td></tr>`;
      $("#expTotal").textContent = "";
      return;
    }
    let total = 0;
    STATE.expenses.forEach((x) => {
      total += x.amountEur;
      const sharers = C.people.filter((_, i) => (x.shares[i] || 0) > 0).map((p) => p.name);
      const tr = el("tr");
      tr.innerHTML =
        `<td class="ex-date">${x.date ? prettyDate(x.date) : '<span class="muted">—</span>'}</td>` +
        `<td><div class="ex-desc">${escapeHtml(x.desc)}</div><div class="ex-sub"><span class="cat-dot cat-${slug(x.category)}"></span>${escapeHtml(x.category)}</div></td>` +
        `<td class="num">${x.currency !== baseSym ? `<span class="muted">${escapeHtml(x.currency)}${x.amount.toLocaleString()}</span><br>` : ""}${fmtBase(x.amountEur)}</td>` +
        `<td>${escapeHtml(x.paidBy)}</td>` +
        `<td class="ex-shares">${sharers.length === C.people.length ? "Everyone" : escapeHtml(sharers.join(", "))}</td>` +
        `<td class="right nowrap"><button class="icon-btn edit" title="Edit" data-id="${x.id}">✏️</button><button class="icon-btn del" title="Remove" data-id="${x.id}">✕</button></td>`;
      tbody.appendChild(tr);
    });
    $("#expTotal").innerHTML = `${STATE.expenses.length} expense${STATE.expenses.length > 1 ? "s" : ""} · pool total <strong>${fmtBase(total)}</strong> · ${fmtInr(total)}`;
    tbody.querySelectorAll(".edit").forEach((b) => b.addEventListener("click", () => {
      const x = STATE.expenses.find((e) => e.id === b.dataset.id); if (x) enterEditMode(x);
    }));
    tbody.querySelectorAll(".del").forEach((b) => b.addEventListener("click", () => onDeleteExpense(b.dataset.id)));
  }

  // ===========================================================================
  //  SETTLEMENT  (per-person + couple rollup)
  // ===========================================================================
  function perPerson() {
    const n = C.people.length;
    const paid = Array(n).fill(0), owed = Array(n).fill(0);
    STATE.expenses.forEach((x) => {
      const tot = x.shares.reduce((a, b) => a + (b || 0), 0);
      if (tot <= 0) return;
      const pi = C.people.findIndex((p) => p.name === x.paidBy);
      if (pi >= 0) paid[pi] += x.amountEur;
      x.shares.forEach((s, i) => { if (s) owed[i] += (x.amountEur * s) / tot; });
    });
    return C.people.map((p, i) => ({ name: p.name, group: p.group, spoc: !!p.spoc, paid: paid[i], owed: owed[i], net: paid[i] - owed[i] }));
  }

  function byUnit(rows) {
    const units = {};
    rows.forEach((r) => {
      const u = units[r.group] || (units[r.group] = { group: r.group, members: [], spoc: null, paid: 0, owed: 0, net: 0 });
      u.members.push(r.name);
      u.paid += r.paid; u.owed += r.owed; u.net += r.net;
      if (r.spoc) u.spoc = r.name;
    });
    return Object.values(units).map((u) => { if (!u.spoc) u.spoc = u.members[0]; return u; });
  }

  function minimalTransfers(items) { // items: [{key, net}]
    const cr = items.filter((i) => i.net > 0.01).map((i) => ({ k: i.key, a: i.net })).sort((a, b) => b.a - a.a);
    const db = items.filter((i) => i.net < -0.01).map((i) => ({ k: i.key, a: -i.net })).sort((a, b) => b.a - a.a);
    const tx = []; let ci = 0, di = 0;
    while (ci < cr.length && di < db.length) {
      const g = Math.min(cr[ci].a, db[di].a);
      tx.push({ from: db[di].k, to: cr[ci].k, amt: g });
      cr[ci].a -= g; db[di].a -= g;
      if (cr[ci].a < 0.01) ci++; if (db[di].a < 0.01) di++;
    }
    return tx;
  }

  function renderSettlement() {
    const rows = perPerson();
    const units = byUnit(rows);

    // ---- person table ----
    const pBody = $("#settlePersonBody");
    pBody.innerHTML = "";
    rows.forEach((r) => pBody.appendChild(settleRow(r.name, r.group, r.paid, r.owed, r.net)));

    // ---- couple table ----
    const cBody = $("#settleCoupleBody");
    cBody.innerHTML = "";
    units.forEach((u) => {
      const label = u.members.length > 1 ? `${escapeHtml(u.members.join(" & "))}` : escapeHtml(u.members[0]);
      const sub = `${u.group} · settle via ${escapeHtml(u.spoc)}`;
      cBody.appendChild(settleRow(label, sub, u.paid, u.owed, u.net));
    });

    // ---- transfers for the active view ----
    const items = STATE.settleView === "couple"
      ? units.map((u) => ({ key: u.spoc, net: u.net }))
      : rows.map((r) => ({ key: r.name, net: r.net }));
    const tx = minimalTransfers(items);
    const list = $("#transferList");
    list.innerHTML = "";
    if (!tx.length) list.innerHTML = `<div class="muted center">Everyone's square — nothing to settle yet.</div>`;
    else tx.forEach((t) => {
      const row = el("div", "transfer");
      row.innerHTML = `<span class="t-from">${escapeHtml(t.from)}</span><span class="t-arrow">→</span><span class="t-to">${escapeHtml(t.to)}</span><span class="t-amt">${fmtBase(t.amt)} <em>${fmtInr(t.amt)}</em></span>`;
      list.appendChild(row);
    });

    const sumNet = rows.reduce((a, r) => a + r.net, 0);
    $("#settleCheck").textContent = Math.abs(sumNet) < 0.01 ? "Balances reconcile ✓" : "⚠ Net check: " + fmtBase(sumNet);
    applySettleView();
  }

  function settleRow(name, sub, paid, owed, net) {
    const cls = net > 0.01 ? "pos" : net < -0.01 ? "neg" : "";
    const status = net > 0.01 ? `is owed ${fmtBase(net)}` : net < -0.01 ? `owes ${fmtBase(-net)}` : "settled up";
    const tr = el("tr");
    tr.innerHTML =
      `<td><strong>${name}</strong><div class="ex-sub">${sub}</div></td>` +
      `<td class="num">${fmtBase(paid)}</td>` +
      `<td class="num">${fmtBase(owed)}</td>` +
      `<td class="num ${cls}"><strong>${net >= 0 ? "+" : ""}${fmtBase(net)}</strong><div class="ex-sub">${fmtInr(Math.abs(net))}</div></td>` +
      `<td class="${cls}">${status}</td>`;
    return tr;
  }

  function applySettleView() {
    const couple = STATE.settleView === "couple";
    $("#settleCoupleWrap").hidden = !couple;
    $("#settlePersonWrap").hidden = couple;
    $("#viewCouple").classList.toggle("active", couple);
    $("#viewPerson").classList.toggle("active", !couple);
    $("#transferHint").textContent = couple ? "Between the couples/spocs" : "Between individuals";
  }

  // ===========================================================================
  //  ACTION ITEMS
  // ===========================================================================
  function buildActionForm() {
    const owner = $("#a_owner");
    owner.appendChild(new Option("No owner", ""));
    C.people.forEach((p) => owner.appendChild(new Option(p.name, p.name)));
    owner.appendChild(new Option("Everyone", "Everyone"));
    owner.value = "";
    $("#actionForm").addEventListener("submit", onSubmitAction);
    $("#actionCancelEdit").addEventListener("click", exitActionEdit);
    $("#actionAddToggle").addEventListener("click", openAddAction);
  }
  function openActionForm() { $("#actionFormWrap").hidden = false; $("#actionAddToggle").hidden = true; }
  function closeActionForm() { $("#actionFormWrap").hidden = true; $("#actionAddToggle").hidden = false; }
  function openAddAction() {
    STATE.editingActionId = null;
    $("#actionForm").reset();
    $("#a_owner").value = "";
    $("#actionFormTitle").textContent = "➕ Add an action item";
    $("#actionSubmitBtn").textContent = "Add action item";
    $("#actionAddCard").classList.remove("editing");
    openActionForm();
  }

  async function onSubmitAction(e) {
    e.preventDefault();
    const item = {
      task: $("#a_task").value.trim(),
      owner: $("#a_owner").value,
      deadline: $("#a_deadline").value.trim(),
      status: "",
    };
    if (!item.task) { toast("Add a task."); return; }
    setBusyEl("#actionForm", true);
    try {
      if (STATE.editingActionId != null) {
        const cur = STATE.actions.find((a) => a.id === STATE.editingActionId);
        item.status = cur ? cur.status : "";  // keep done/pending as-is when editing text
        if (usingBackend) await api("updateAction", { id: STATE.editingActionId, item });
        else { Object.assign(cur, item, { done: item.status.toLowerCase() === "done" }); persistActions(); }
        toast("Action updated ✓");
      } else {
        if (usingBackend) await api("addAction", { item });
        else { STATE.actions.push({ ...item, id: genId(), done: false }); persistActions(); }
        toast("Action added ✓");
      }
      exitActionEdit();
      await reload();
    } catch (err) { toast("Couldn't save: " + err.message); }
    finally { setBusyEl("#actionForm", false); }
  }

  function enterActionEdit(a) {
    STATE.editingActionId = a.id;
    $("#a_task").value = a.task;
    $("#a_owner").value = [...$("#a_owner").options].some((o) => o.value === a.owner) ? a.owner : "";
    $("#a_deadline").value = /^\d{4}-\d{2}-\d{2}$/.test(a.deadline || "") ? a.deadline : "";
    $("#actionFormTitle").textContent = "✏️ Edit action item";
    $("#actionSubmitBtn").textContent = "Save changes";
    $("#actionAddCard").classList.add("editing");
    openActionForm();
    $("#actionAddCard").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function exitActionEdit() {
    STATE.editingActionId = null;
    $("#actionForm").reset();
    $("#a_owner").value = "";
    $("#actionFormTitle").textContent = "➕ Add an action item";
    $("#actionSubmitBtn").textContent = "Add action item";
    $("#actionAddCard").classList.remove("editing");
    closeActionForm();
  }

  async function toggleAction(a) {
    const status = a.done ? "" : "Done";
    setBusyEl("#actionForm", true);
    try {
      if (usingBackend) await api("updateAction", { id: a.id, item: { status } });
      else { a.status = status; a.done = !a.done; persistActions(); }
      await reload();
    } catch (err) { toast("Couldn't update: " + err.message); }
    finally { setBusyEl("#actionForm", false); }
  }

  async function deleteAction(id) {
    if (!confirm("Remove this action item?")) return;
    setBusyEl("#actionForm", true);
    try {
      if (usingBackend) await api("deleteAction", { id });
      else { STATE.actions = STATE.actions.filter((a) => a.id !== id); persistActions(); }
      if (STATE.editingActionId === id) exitActionEdit();
      await reload();
    } catch (err) { toast("Couldn't delete: " + err.message); }
    finally { setBusyEl("#actionForm", false); }
  }

  function prettyDeadline(d) {
    if (!d) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const dt = new Date(d + "T00:00:00");
      if (!isNaN(dt)) return dt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    }
    return d;
  }
  function renderActions() {
    const wrap = $("#actionsByOwner");
    wrap.innerHTML = "";
    const total = STATE.actions.length;
    const done = STATE.actions.filter((a) => a.done).length;
    $("#actionProgress").textContent = total ? `${done}/${total} done` : "";
    if (!total) {
      wrap.innerHTML = `<div class="muted center" style="padding:16px">No action items yet — add the first one above.</div>`;
      return;
    }
    // group by owner, owners with open tasks first
    const groups = {};
    STATE.actions.forEach((a) => { const o = (a.owner && a.owner.trim()) ? a.owner : "No owner"; (groups[o] = groups[o] || []).push(a); });
    const owners = Object.keys(groups).sort((x, y) => {
      const ox = groups[x].filter((a) => !a.done).length, oy = groups[y].filter((a) => !a.done).length;
      return oy - ox || x.localeCompare(y);
    });
    owners.forEach((owner) => {
      const items = groups[owner].slice().sort((a, b) => Number(a.done) - Number(b.done));
      const openN = items.filter((a) => !a.done).length;
      const block = el("div", "owner-block");
      block.appendChild(el("div", "owner-head",
        `<span class="owner-name">${escapeHtml(owner)}</span>` +
        `<span class="owner-count">${openN ? openN + " open" : "all done ✓"}</span>`));
      items.forEach((a) => {
        const item = el("div", "action-item" + (a.done ? " done" : ""));
        item.innerHTML =
          `<button class="check ${a.done ? "on" : ""}" title="${a.done ? "Mark not done" : "Mark done"}" data-id="${a.id}">${a.done ? "✓" : ""}</button>` +
          `<div class="action-main"><div class="action-task">${escapeHtml(a.task)}</div>` +
          `${a.deadline ? `<div class="action-due">🗓️ ${escapeHtml(prettyDeadline(a.deadline))}</div>` : ""}</div>` +
          `<div class="action-btns nowrap"><button class="icon-btn edit" title="Edit" data-id="${a.id}">✏️</button><button class="icon-btn del" title="Remove" data-id="${a.id}">✕</button></div>`;
        block.appendChild(item);
      });
      wrap.appendChild(block);
    });
    wrap.querySelectorAll(".check").forEach((b) => b.addEventListener("click", () => {
      const a = STATE.actions.find((x) => x.id === b.dataset.id); if (a) toggleAction(a);
    }));
    wrap.querySelectorAll(".action-btns .edit").forEach((b) => b.addEventListener("click", () => {
      const a = STATE.actions.find((x) => x.id === b.dataset.id); if (a) enterActionEdit(a);
    }));
    wrap.querySelectorAll(".action-btns .del").forEach((b) => b.addEventListener("click", () => deleteAction(b.dataset.id)));
  }

  async function loadActions() {
    if (usingBackend) {
      try {
        const res = await fetch(bust(C.backend.webAppUrl, "action=actions"), { cache: "no-store" });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "actions failed");
        STATE.actions = (data.actions || []).map(normalizeAction);
      } catch (err) {
        STATE.actions = loadActionsLocal();
      }
    } else {
      STATE.actions = loadActionsLocal();
      if (!STATE.actions.length) {
        STATE.actions = (C.seedActions || []).map((a, i) => ({ ...a, id: "sa" + i, done: (a.status || "").toLowerCase() === "done" }));
        persistActions();
      }
    }
  }
  function normalizeAction(a) {
    return { id: String(a.id), task: a.task || "", owner: a.owner || "", deadline: a.deadline || "", status: a.status || "", done: !!a.done || (a.status || "").toLowerCase() === "done" };
  }
  const LS_ACT = "trip_actions_" + (C.trip.name || "trip").replace(/\W+/g, "_");
  function persistActions() { try { localStorage.setItem(LS_ACT, JSON.stringify(STATE.actions)); } catch {} }
  function loadActionsLocal() { try { return JSON.parse(localStorage.getItem(LS_ACT) || "[]").map(normalizeAction); } catch { return []; } }

  // ===========================================================================
  //  BACKEND
  // ===========================================================================
  // Writes use a "simple" no-cors POST: Apps Script commits the change, and we
  // then re-read via GET. (Reading a cross-origin POST response from Apps Script
  // is unreliable; this pattern avoids that entirely.)
  async function api(action, payload) {
    await fetch(C.backend.webAppUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload }),
    });
    return { ok: true };
  }

  async function reload() { await Promise.allSettled([loadExpenses(), loadActions()]); renderAllDynamic(); }
  const bust = (url, q) => url + (url.includes("?") ? "&" : "?") + q + "&_=" + Date.now();

  async function loadExpenses() {
    if (usingBackend) {
      try {
        const res = await fetch(bust(C.backend.webAppUrl, "action=list"), { cache: "no-store" });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "list failed");
        if (data.rates) { STATE.gbpEur = data.rates.gbpEur || STATE.gbpEur; STATE.eurInr = data.rates.eurInr || STATE.eurInr; }
        if (Array.isArray(data.itinerary) && data.itinerary.length) STATE.itinerary = data.itinerary;
        STATE.expenses = (data.expenses || []).map(normalize);
      } catch (err) {
        toast("Couldn't reach the sheet — showing local copy. (" + err.message + ")");
        STATE.expenses = loadLocal();
      }
    } else {
      STATE.expenses = loadLocal();
      if (!STATE.expenses.length) {
        STATE.expenses = C.seedExpenses.map((e, i) => ({ ...e, id: "seed" + i, amountEur: demoEur(e.amount, e.currency) }));
        persistLocal();
      }
    }
  }

  function normalize(e) {
    return {
      id: String(e.id),
      date: e.date || "",
      desc: e.desc || "",
      category: e.category || "Other",
      currency: e.currency || baseSym,
      amount: Number(e.amount) || 0,
      amountEur: Number(e.amountEur != null ? e.amountEur : demoEur(Number(e.amount) || 0, e.currency || baseSym)),
      paidBy: e.paidBy || "",
      shares: Array.isArray(e.shares) ? e.shares.map(Number) : C.people.map(() => 1),
    };
  }

  function persistLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(STATE.expenses)); } catch {} }
  function loadLocal() { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]").map(normalize); } catch { return []; } }

  // ===========================================================================
  //  UI plumbing
  // ===========================================================================
  function renderAllDynamic() { renderItinerary(); renderExpenses(); renderSettlement(); renderBudgetSummary(); renderActions(); }

  let toastT;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3400);
  }
  function setBusy(b) { $("#expenseForm").classList.toggle("busy", b); }
  function setBusyEl(sel, b) { const n = $(sel); if (n) n.classList.toggle("busy", b); }
  const genId = () => "x" + Math.abs(hashStr(String(performance.now()) + ":" + STATE.expenses.length)).toString(36);
  function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return h; }

  const LS_TAB = "trip_tab_" + (C.trip.name || "trip").replace(/\W+/g, "_");
  function activateTab(id, scroll) {
    const btn = document.querySelector(`.tab-btn[data-tab="${id}"]`);
    const panel = document.getElementById(id);
    if (!btn || !panel) return;
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    panel.classList.add("active");
    try { localStorage.setItem(LS_TAB, id); } catch {}
    if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function initTabs() {
    document.querySelectorAll(".tab-btn").forEach((btn) => btn.addEventListener("click", () => activateTab(btn.dataset.tab, true)));
    $("#viewCouple").addEventListener("click", () => { STATE.settleView = "couple"; renderSettlement(); });
    $("#viewPerson").addEventListener("click", () => { STATE.settleView = "person"; renderSettlement(); });
    // restore last-viewed tab across refreshes
    try { const saved = localStorage.getItem(LS_TAB); if (saved) activateTab(saved, false); } catch {}
  }

  // ===========================================================================
  //  BOOT
  // ===========================================================================
  document.addEventListener("DOMContentLoaded", async () => {
    renderHero();
    renderItinerary();
    renderStays();
    buildForm();
    buildActionForm();
    initTabs();
    await Promise.all([loadExpenses(), loadActions()]);
    renderAllDynamic();
  });
})();
