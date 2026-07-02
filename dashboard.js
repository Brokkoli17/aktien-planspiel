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

    elements.chartEmpty.classList.toggle("hidden", filtered.length > 0);
    renderChart(filtered);
  } catch {
    elements.dashboardStatus.textContent = "Dashboard konnte nicht geladen werden.";
    renderChart([]);
  }
}

function renderChart(submissions) {
  if (!submissions.length) {
    elements.chartArea.innerHTML = `
      <div class="dashboard-columns dashboard-columns-empty">
        <div class="dashboard-y-axis">
          <span>10</span>
          <span>5</span>
          <span>0</span>
        </div>
        <div class="dashboard-plot">
          <div class="dashboard-grid-line dashboard-grid-line-top"></div>
          <div class="dashboard-grid-line dashboard-grid-line-middle"></div>
          <div class="dashboard-grid-line dashboard-grid-line-bottom"></div>
          <div class="dashboard-placeholder">Noch keine Ergebnisse vorhanden</div>
        </div>
      </div>
    `;
    return;
  }

  const maxAbsProfit = Math.max(...submissions.map((item) => Math.abs(item.profit)), 1);

  elements.chartArea.innerHTML = `
    <div class="dashboard-columns">
      <div class="dashboard-y-axis">
        <span>${formatAxisValue(maxAbsProfit)}</span>
        <span>${formatAxisValue(maxAbsProfit / 2)}</span>
        <span>0</span>
      </div>
      <div class="dashboard-plot">
        <div class="dashboard-grid-line dashboard-grid-line-top"></div>
        <div class="dashboard-grid-line dashboard-grid-line-middle"></div>
        <div class="dashboard-grid-line dashboard-grid-line-bottom"></div>
        <div class="dashboard-columns-list">
          ${submissions.map((item) => renderColumn(item, maxAbsProfit)).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderColumn(item, maxAbsProfit) {
  const percent = Math.max(8, Math.round((Math.abs(item.profit) / maxAbsProfit) * 100));
  const colorClass = item.profit >= 0
    ? "dashboard-column-bar-positive"
    : "dashboard-column-bar-negative";

  return `
    <div class="dashboard-column-item" title="${formatCurrency(item.profit)}">
      <div class="dashboard-column-slot">
        <div
          class="dashboard-column-bar ${colorClass}"
          style="height:${percent}%"
        ></div>
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
  if (typeof appConfig.collectorUrl === "string" && appConfig.collectorUrl.trim()) {
    return appConfig.collectorUrl.replace(/\/$/, "");
  }

  return window.location.origin;
}
