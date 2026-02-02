// =========================
// 1) PROMPT/CONFIG DEFAULT
// =========================
const DEFAULT_PROMPT = `{
  "brand": {
    "title": "NexSolution",
    "subtitle": "Calcolatore Iperammortamento 2026",
    "logoPath": "assets/logo.png"
  },
  "inputs": [
    { "id": "investimento", "label": "Importo investimento (€)", "type": "number", "min": 0, "step": 100, "default": 200000 },
    { "id": "coeff", "label": "Coefficiente ammortamento (%)", "type": "number", "min": 0, "step": 0.1, "default": 10 },
    { "id": "magg", "label": "Maggiorazione iperammortamento (%)", "type": "number", "min": 0, "step": 1, "default": 150 },
    { "id": "ires", "label": "Aliquota IRES (%)", "type": "number", "min": 0, "step": 0.1, "default": 24 },
    { "id": "anni", "label": "Durata ammortamento (anni)", "type": "number", "min": 1, "step": 1, "default": 5 }
  ],
  "logic": {
    "type": "iperammortamento_simple"
  }
}`;

// =========================
// 2) STATE
// =========================
let cfg = null;
let values = {};

// =========================
// 3) DOM
// =========================
const promptBox = document.getElementById("promptBox");
const applyBtn = document.getElementById("applyPromptBtn");
const resetBtn = document.getElementById("resetPromptBtn");
const errBox = document.getElementById("promptError");
const formArea = document.getElementById("formArea");
const resultArea = document.getElementById("resultArea");
const tableArea = document.getElementById("tableArea");
const recalcBtn = document.getElementById("recalcBtn");

// brand
const brandLogo = document.getElementById("brandLogo");
const brandTitle = document.getElementById("brandTitle");
const brandSubtitle = document.getElementById("brandSubtitle");

// =========================
// 4) HELPERS
// =========================
function eur(n){
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
function pct(n){
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("it-IT", { maximumFractionDigits: 2 }) + "%";
}
function safeNumber(v, fallback=0){
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// =========================
// 5) BUILD UI FROM CONFIG
// =========================
function applyConfig(newCfg){
  cfg = newCfg;

  // brand
  brandTitle.textContent = cfg.brand?.title ?? "Il tuo Studio";
  brandSubtitle.textContent = cfg.brand?.subtitle ?? "";
  if (cfg.brand?.logoPath) brandLogo.src = cfg.brand.logoPath;

  // init values
  values = {};
  (cfg.inputs ?? []).forEach(f => values[f.id] = f.default);

  renderForm();
  computeAndRender();
}

function renderForm(){
  formArea.innerHTML = "";
  (cfg.inputs ?? []).forEach(f => {
    const wrap = document.createElement("div");
    wrap.className = "field";

    const label = document.createElement("label");
    label.textContent = f.label;

    const input = document.createElement("input");
    input.type = f.type ?? "text";
    if (f.min !== undefined) input.min = f.min;
    if (f.step !== undefined) input.step = f.step;

    input.value = values[f.id] ?? "";
    input.addEventListener("input", () => {
      values[f.id] = (f.type === "number") ? safeNumber(input.value, 0) : input.value;
      computeAndRender();
    });

    wrap.appendChild(label);
    wrap.appendChild(input);
    formArea.appendChild(wrap);
  });
}

// =========================
// 6) LOGIC (SEMPLIFICATA)
// =========================
function computeIperammortamentoSimple(v){
  const investimento = safeNumber(v.investimento, 0);
  const coeff = safeNumber(v.coeff, 0) / 100;
  const magg = safeNumber(v.magg, 0) / 100;        // es. 150% = 1.5
  const ires = safeNumber(v.ires, 0) / 100;
  const anni = Math.max(1, Math.floor(safeNumber(v.anni, 1)));

  // Ammortamento annuo “lineare” semplificato
  const quotaBase = investimento * coeff;

  // Extra deduzione: investimento * (maggiorazione)
  // (semplificazione: ripartita in modo proporzionale alle quote in anni)
  const extraTot = investimento * magg;
  const extraAnnua = extraTot / anni;

  const risparmioIresAnnua = extraAnnua * ires;
  const risparmioIresTot = extraTot * ires;

  // tabella anni
  const rows = [];
  for (let i = 1; i <= anni; i++){
    rows.push({
      anno: i,
      quotaBase: quotaBase,
      extra: extraAnnua,
      risparmio: risparmioIresAnnua
    });
  }

  return { investimento, coeff, magg, ires, anni, quotaBase, extraTot, risparmioIresTot, rows };
}

// =========================
// 7) RENDER OUTPUT
// =========================
function computeAndRender(){
  if (!cfg?.logic?.type) return;

  let out;
  switch(cfg.logic.type){
    case "iperammortamento_simple":
      out = computeIperammortamentoSimple(values);
      break;
    default:
      out = { rows: [] };
  }

  // KPI
  resultArea.innerHTML = "";
  const kpis = [
    ["Investimento", eur(out.investimento)],
    ["Extra-deduzione totale (sempl.)", eur(out.extraTot)],
    ["Risparmio IRES totale (sempl.)", eur(out.risparmioIresTot)],
    ["Quota ammortamento base annua (sempl.)", eur(out.quotaBase)]
  ];

  kpis.forEach(([k, val]) => {
    const div = document.createElement("div");
    div.className = "kpi";
    div.innerHTML = `<b>${k}</b><span>${val}</span>`;
    resultArea.appendChild(div);
  });

  // Table
  tableArea.innerHTML = "";
  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Anno</th>
        <th>Quota base</th>
        <th>Extra deduzione</th>
        <th>Risparmio IRES</th>
      </tr>
    </thead>
    <tbody>
      ${(out.rows ?? []).map(r => `
        <tr>
          <td>${r.anno}</td>
          <td>${eur(r.quotaBase)}</td>
          <td>${eur(r.extra)}</td>
          <td>${eur(r.risparmio)}</td>
        </tr>
      `).join("")}
    </tbody>
  `;
  tableArea.appendChild(table);
}

// =========================
// 8) PROMPT HANDLING
// =========================
function showError(msg){
  errBox.hidden = false;
  errBox.textContent = msg;
}
function clearError(){
  errBox.hidden = true;
  errBox.textContent = "";
}

function parsePrompt(text){
  // Permette JSON puro. Se vuoi YAML o altro, si può estendere.
  return JSON.parse(text);
}

applyBtn.addEventListener("click", () => {
  try {
    clearError();
    const parsed = parsePrompt(promptBox.value);
    applyConfig(parsed);
  } catch (e) {
    showError("Errore nel prompt/config: " + e.message);
  }
});

resetBtn.addEventListener("click", () => {
  promptBox.value = DEFAULT_PROMPT;
  clearError();
});

recalcBtn.addEventListener("click", () => computeAndRender());

// init
promptBox.value = DEFAULT_PROMPT;
applyConfig(parsePrompt(DEFAULT_PROMPT));
