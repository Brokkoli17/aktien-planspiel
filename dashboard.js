const appConfig = window.STOCK_APP_CONFIG || {};
const state = {
  year: "2022",
  pollHandle: null
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
  year2022Button: document.querySelector("#dashboard-2022-button"),
  year2025Button: document.querySelector("#dashboard-2025-button"),
  resetButton: document.querySelector("#dashboard-reset-button")
};

elements.year2022Button.addEventListener("click", () => setYear("2022"));
elements.year2025Button.addEventListener("click", () => setYear("2025"));
elements.resetButton.addEventListener("click", resetDashboard);

setYear("2022");
state.pollHandle = window.setInterval(loadDashboard, 2000);

function setYear(year) {
  state.year = year;
  elements.dashboardYear.textContent = year;
  loadDashboard();
}

async function loadDashboard() {
  try {
    const response = await fetch(`${getCollectorUrl()}/api/submissions`);
    const submissions = await response.json();
    const filtered = submissions
      .filter((item) => item.year === state.year)
      .sort((left, right) => right.profit - left.profit);

    elements.dashboardCount.textContent = String(filtered.length);
    elements.dashboardStatus.textContent =
      `Zuletzt aktualisiert: ${new Date().toLocaleTimeString("de-DE")}`;

    if (!filtered.length) {
      elements.chartEmpty.classList.remove("hidden");
      elements.chartArea.innerHTML = "";
      return;
    }

    elements.chartEmpty.classList.add("hidden");
    renderChart(filtered);
  } catch {
    elements.dashboardStatus.textContent = "Dashboard konnte nicht geladen werden.";
  }
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

async function resetDashboard() {
  try {
    await fetch(`${getCollectorUrl()}/api/submissions/reset`, { method: "POST" });
    await loadDashboard();
    elements.dashboardStatus.textContent = "Alle bisherigen Ergebnisse wurden geloescht.";
  } catch {
    elements.dashboardStatus.textContent = "Loeschen fehlgeschlagen.";
  }
}

function formatCurrency(value) {
  return currencyFormatter.format(value);
}

function getCollectorUrl() {
  if (typeof appConfig.collectorUrl === "string" && appConfig.collectorUrl.trim()) {
    return appConfig.collectorUrl.replace(/\/$/, "");
  }

  return window.location.origin;
}
