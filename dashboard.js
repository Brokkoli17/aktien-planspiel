const appConfig = window.STOCK_APP_CONFIG || {};
const state = {
  pollHandle: null
};

const currencyFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR"
});

const elements = {
  dashboardCount2022: document.querySelector("#dashboard-count-2022"),
  dashboardCount2026: document.querySelector("#dashboard-count-2026"),
  dashboardStatus: document.querySelector("#dashboard-status"),
  chartEmpty2022: document.querySelector("#chart-empty-2022"),
  chartEmpty2026: document.querySelector("#chart-empty-2026"),
  chartArea2022: document.querySelector("#chart-area-2022"),
  chartArea2026: document.querySelector("#chart-area-2026"),
  resetButton: document.querySelector("#dashboard-reset-button")
};

elements.resetButton.addEventListener("click", resetDashboard);

loadDashboard();
state.pollHandle = window.setInterval(loadDashboard, 2000);

async function loadDashboard() {
  try {
    const response = await fetch(`${getCollectorUrl()}/api/submissions`);
    const submissions = await response.json();
    const data2022 = submissions
      .filter((item) => item.year === "2022")
      .sort((left, right) => right.profit - left.profit);
    const data2026 = submissions
      .filter((item) => item.year === "2026")
      .sort((left, right) => right.profit - left.profit);

    elements.dashboardCount2022.textContent = String(data2022.length);
    elements.dashboardCount2026.textContent = String(data2026.length);
    elements.dashboardStatus.textContent =
      `Zuletzt aktualisiert: ${new Date().toLocaleTimeString("de-DE")}`;

    renderYearChart("2022", data2022);
    renderYearChart("2026", data2026);
  } catch {
    elements.dashboardStatus.textContent = "Dashboard konnte nicht geladen werden.";
    renderYearChart("2022", []);
    renderYearChart("2026", []);
  }
}

function renderYearChart(year, submissions) {
  const emptyElement = year === "2022" ? elements.chartEmpty2022 : elements.chartEmpty2026;
  const areaElement = year === "2022" ? elements.chartArea2022 : elements.chartArea2026;

  emptyElement.classList.toggle("hidden", submissions.length > 0);

  if (!submissions.length) {
    areaElement.innerHTML = renderColumnChartShell([], 10, true);
    return;
  }

  const maxAbsProfit = Math.max(...submissions.map((item) => Math.abs(item.profit)), 1);
  const columns = submissions.map((item) => renderColumn(item.profit, maxAbsProfit));
  areaElement.innerHTML = renderColumnChartShell(columns, maxAbsProfit, false);
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

function formatCurrency(value) {
  return currencyFormatter.format(value);
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
