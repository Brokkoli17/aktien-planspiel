const state = {
  year: "2022",
  submissions: loadCollectedSubmissions()
};

const currencyFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR"
});

const elements = {
  dashboardYear: document.querySelector("#dashboard-year"),
  dashboardCount: document.querySelector("#dashboard-count"),
  dashboardStatus: document.querySelector("#dashboard-status"),
  chartEmpty: document.querySelector("#chart-empty"),
  chartArea: document.querySelector("#chart-area"),
  importCode: document.querySelector("#import-code"),
  importButton: document.querySelector("#import-button"),
  year2022Button: document.querySelector("#dashboard-2022-button"),
  year2025Button: document.querySelector("#dashboard-2025-button"),
  resetButton: document.querySelector("#dashboard-reset-button")
};

elements.importButton.addEventListener("click", importSubmissionCode);
elements.year2022Button.addEventListener("click", () => setYear("2022"));
elements.year2025Button.addEventListener("click", () => setYear("2025"));
elements.resetButton.addEventListener("click", resetDashboard);

setYear("2022");

function setYear(year) {
  state.year = year;
  elements.dashboardYear.textContent = year;
  renderDashboard();
}

function renderDashboard() {
  const filtered = state.submissions
    .filter((item) => item.year === state.year)
    .sort((left, right) => right.profit - left.profit);

  elements.dashboardCount.textContent = String(filtered.length);

  if (!filtered.length) {
    elements.chartEmpty.classList.remove("hidden");
    elements.chartArea.innerHTML = "";
    return;
  }

  elements.chartEmpty.classList.add("hidden");
  renderChart(filtered);
}

function renderChart(submissions) {
  const maxProfit = Math.max(...submissions.map((item) => Math.abs(item.profit)), 1);
  elements.chartArea.innerHTML = submissions
    .map((item) => {
      const width = Math.max(4, Math.round((Math.abs(item.profit) / maxProfit) * 100));
      const directionClass = item.profit >= 0 ? "chart-bar-positive" : "chart-bar-negative";
      return `
        <div class="chart-row">
          <span class="chart-label">${item.participantId}</span>
          <div class="chart-bar-wrap">
            <div class="chart-bar ${directionClass}" style="width:${width}%"></div>
          </div>
          <strong class="${item.profit >= 0 ? "positive" : "negative"}">${formatCurrency(item.profit)}</strong>
        </div>
      `;
    })
    .join("");
}

function importSubmissionCode() {
  const rawCode = elements.importCode.value.trim();

  if (!rawCode) {
    elements.dashboardStatus.textContent = "Bitte zuerst einen Code einfuegen.";
    return;
  }

  try {
    const submission = decodeSubmission(rawCode);
    upsertSubmission(submission);
    persistSubmissions();
    elements.importCode.value = "";
    elements.dashboardStatus.textContent =
      `Code von ${submission.participantId} fuer ${submission.year} importiert.`;
    renderDashboard();
  } catch {
    elements.dashboardStatus.textContent = "Der Code ist ungueltig.";
  }
}

function upsertSubmission(submission) {
  const normalized = {
    participantId: String(submission.participantId || "Unbekannt"),
    year: String(submission.year || "2022"),
    invested: Number(submission.invested || 0),
    totalValue: Number(submission.totalValue || 0),
    profit: Number(submission.profit || 0),
    returnRate: Number(submission.returnRate || 0)
  };

  const existingIndex = state.submissions.findIndex(
    (item) => item.participantId === normalized.participantId && item.year === normalized.year
  );

  if (existingIndex >= 0) {
    state.submissions[existingIndex] = normalized;
  } else {
    state.submissions.push(normalized);
  }
}

function resetDashboard() {
  state.submissions = [];
  persistSubmissions();
  elements.dashboardStatus.textContent = "Alle importierten Codes wurden geloescht.";
  renderDashboard();
}

function loadCollectedSubmissions() {
  try {
    return JSON.parse(localStorage.getItem("stock-game-collected-submissions") ?? "[]");
  } catch {
    return [];
  }
}

function persistSubmissions() {
  localStorage.setItem("stock-game-collected-submissions", JSON.stringify(state.submissions));
}

function formatCurrency(value) {
  return currencyFormatter.format(value);
}
