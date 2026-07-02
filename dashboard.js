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
  stockChartArea: document.querySelector("#stock-chart-area"),
  stockChartTitle: document.querySelector("#stock-chart-title"),
  year2022Button: document.querySelector("#dashboard-2022-button"),
  year2026Button: document.querySelector("#dashboard-2026-button"),
  resetButton: document.querySelector("#dashboard-reset-button")
};

elements.year2022Button.addEventListener("click", () => setYear("2022"));
elements.year2026Button.addEventListener("click", () => setYear("2026"));
elements.resetButton.addEventListener("click", resetDashboard);

setYear("2022");
state.pollHandle = window.setInterval(loadDashboard, 2000);

function setYear(year) {
  state.year = year;
  elements.dashboardYear.textContent = year;
  elements.stockChartTitle.textContent = `Gewinn / Verlust der Aktien ${year}`;
  loadDashboard();
  renderStockChart();
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

    elements.chartEmpty.classList.toggle("hidden", filtered.length > 0);
    renderParticipantChart(filtered);
  } catch {
    elements.dashboardStatus.textContent = "Dashboard konnte nicht geladen werden.";
    renderParticipantChart([]);
  }
}

function renderParticipantChart(submissions) {
  if (!submissions.length) {
    elements.chartArea.innerHTML = renderColumnChartShell([], 10, true);
    return;
  }

  const maxAbsProfit = Math.max(...submissions.map((item) => Math.abs(item.profit)), 1);
  const columns = submissions.map((item) => renderColumn(item.profit, maxAbsProfit));
  elements.chartArea.innerHTML = renderColumnChartShell(columns, maxAbsProfit, false);
}

function renderStockChart() {
  const entries = STOCK_APP_DATA.stocks
    .filter((stock) => stock.startPrice)
    .map((stock) => {
      const comparisonPrice = getPriceForYear(stock, state.year);
      return {
        profit: comparisonPrice - stock.startPrice
      };
    });

  const maxAbsProfit = Math.max(...entries.map((item) => Math.abs(item.profit)), 1);
  const columns = entries.map((item) => renderColumn(item.profit, maxAbsProfit));
  elements.stockChartArea.innerHTML = renderColumnChartShell(columns, maxAbsProfit, false);
}

function renderColumnChartShell(columns, maxAbsProfit, empty) {
  return `
    <div class="dashboard-columns ${empty ? "dashboard-columns-empty" : ""}">
      <div class="dashboard-y-axis">
        <span>${formatAxisValue(maxAbsProfit)}</span>
        <span>0</span>
        <span>${formatAxisValue(-maxAbsProfit)}</span>
      </div>
      <div class="dashboard-plot">
        <div class="dashboard-grid-line dashboard-grid-line-top"></div>
        <div class="dashboard-grid-line dashboard-grid-line-middle"></div>
        <div class="dashboard-grid-line dashboard-grid-line-bottom"></div>
        ${
          empty
            ? '<div class="dashboard-placeholder">Noch keine Ergebnisse vorhanden</div>'
            : `<div class="dashboard-columns-list">${columns.join("")}</div>`
        }
      </div>
    </div>
  `;
}

function renderColumn(profit, maxAbsProfit) {
  const percent = Math.max(8, Math.round((Math.abs(profit) / maxAbsProfit) * 50));
  const colorClass = profit >= 0 ? "dashboard-column-bar-positive" : "dashboard-column-bar-negative";
  const directionClass = profit >= 0 ? "dashboard-column-bar-up" : "dashboard-column-bar-down";

  return `
    <div class="dashboard-column-item" title="${formatCurrency(profit)}">
      <div class="dashboard-column-slot">
        <div class="dashboard-column-bar ${colorClass} ${directionClass}" style="height:${percent}%"></div>
      </div>
    </div>
  `;
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

function getPriceForYear(stock, year) {
  return stock.prices[year] ?? stock.prices["2025"] ?? stock.startPrice ?? 0;
}

function formatAxisValue(value) {
  return Math.round(value).toString();
}

function getCollectorUrl() {
  if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
    return window.location.origin;
  }

  if (typeof appConfig.collectorUrl === "string" && appConfig.collectorUrl.trim()) {
    return appConfig.collectorUrl.replace(/\/$/, "");
  }

  return window.location.origin;
}
