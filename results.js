const appConfig = window.STOCK_APP_CONFIG || {};
const STORAGE_VERSION = appConfig.storageVersion || "stock-game-v4";
const STORAGE_KEYS = {
  version: "stock-game-storage-version",
  allocations: `${STORAGE_VERSION}-allocations`,
  participantId: `${STORAGE_VERSION}-participant-id`
};

clearLegacyStorage();

const params = new URLSearchParams(window.location.search);
const selectedYear = params.get("year") === "2025" ? "2025" : "2022";

const currencyFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR"
});

const percentFormatter = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const elements = {
  resultYear: document.querySelector("#result-year"),
  resultInvested: document.querySelector("#result-invested"),
  resultHeadline: document.querySelector("#result-headline"),
  resultsEmpty: document.querySelector("#results-empty"),
  resultsContent: document.querySelector("#results-content"),
  chartMaxLabel: document.querySelector("#chart-max-label"),
  chartMinLabel: document.querySelector("#chart-min-label"),
  chartValueLabel: document.querySelector("#chart-value-label"),
  chartReturnLabel: document.querySelector("#chart-return-label"),
  singleResultBar: document.querySelector("#single-result-bar"),
  syncStatus: document.querySelector("#sync-status"),
  detailChart: document.querySelector("#detail-chart")
};

renderResultsPage();

async function renderResultsPage() {
  const allocations = loadAllocations();
  const positions = getSelectedPositions(allocations, selectedYear);
  const comparison = STOCK_APP_DATA.comparisons[selectedYear];

  elements.resultYear.textContent = selectedYear;

  if (!positions.length) {
    elements.resultsContent.classList.add("hidden");
    elements.resultsEmpty.classList.remove("hidden");
    return;
  }

  const totalInvested = positions.reduce((sum, position) => sum + position.amount, 0);
  const totalValue = positions.reduce((sum, position) => sum + position.comparisonValue, 0);
  const profit = totalValue - totalInvested;
  const returnRate = totalInvested === 0 ? 0 : profit / totalInvested;

  elements.resultInvested.textContent = formatCurrency(totalInvested);
  elements.resultHeadline.textContent = `Gewinn / Verlust ${comparison.label}`;
  renderSingleChart(profit, returnRate);
  renderDetailChart(positions);

  await submitResult({
    participantId: getParticipantId(),
    year: selectedYear,
    invested: totalInvested,
    totalValue,
    profit,
    returnRate
  });
}

function renderSingleChart(profit, returnRate) {
  const maxRange = Math.max(Math.abs(profit), 1);
  const directionClass = profit >= 0 ? "single-result-bar-positive" : "single-result-bar-negative";
  const heightPercent = Math.max(6, Math.min(100, (Math.abs(profit) / maxRange) * 100));

  elements.chartMaxLabel.textContent = formatCurrency(maxRange);
  elements.chartMinLabel.textContent = formatCurrency(-maxRange);
  elements.chartValueLabel.textContent = formatCurrency(profit);
  elements.chartReturnLabel.textContent = percentFormatter.format(returnRate);
  elements.chartValueLabel.className = profit >= 0 ? "positive" : "negative";
  elements.chartReturnLabel.className = profit >= 0 ? "positive" : "negative";
  elements.singleResultBar.className = `single-result-bar ${directionClass}`;
  elements.singleResultBar.style.height = `${heightPercent}%`;
  elements.singleResultBar.style.alignSelf = profit >= 0 ? "end" : "start";
}

function renderDetailChart(positions) {
  const entries = positions.map((position) => ({
    name: position.name,
    change: position.comparisonValue - position.amount
  }));
  const maxChange = Math.max(...entries.map((entry) => Math.abs(entry.change)), 1);

  elements.detailChart.innerHTML = entries
    .sort((left, right) => right.change - left.change)
    .map((entry) => {
      const width = Math.max(4, Math.round((Math.abs(entry.change) / maxChange) * 100));
      const directionClass = entry.change >= 0 ? "chart-bar-positive" : "chart-bar-negative";
      return `
        <div class="chart-row">
          <span class="chart-label">${escapeHtml(entry.name)}</span>
          <div class="chart-bar-wrap">
            <div class="chart-bar ${directionClass}" style="width:${width}%"></div>
          </div>
          <strong class="${entry.change >= 0 ? "positive" : "negative"}">${formatCurrency(entry.change)}</strong>
        </div>
      `;
    })
    .join("");
}

function getSelectedPositions(allocations, year) {
  return STOCK_APP_DATA.stocks
    .filter((stock) => stock.startPrice && (allocations[stock.id] ?? 0) > 0)
    .map((stock) => {
      const shares = allocations[stock.id];
      const amount = shares * stock.startPrice;
      const comparisonValue = shares * stock.prices[year];
      return { amount, comparisonValue };
    });
}

function loadAllocations() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.allocations) ?? "{}");
    return Object.fromEntries(
      Object.entries(parsed).map(([stockId, shares]) => [stockId, sanitizeShareCount(Number(shares))])
    );
  } catch {
    return {};
  }
}

function getParticipantId() {
  const existing = localStorage.getItem(STORAGE_KEYS.participantId);
  if (existing) {
    return existing;
  }

  const created = `T${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  localStorage.setItem(STORAGE_KEYS.participantId, created);
  return created;
}

async function submitResult(payload) {
  const collectorUrl = getCollectorUrl();
  if (!collectorUrl) {
    elements.syncStatus.textContent = "Sammelserver ist gerade nicht verbunden.";
    return;
  }

  try {
    const response = await fetch(`${collectorUrl}/api/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("submit failed");
    }

    elements.syncStatus.textContent =
      `Automatisch uebertragen: ${payload.participantId}`;
  } catch {
    elements.syncStatus.textContent =
      "Automatische Uebertragung fehlgeschlagen.";
  }
}

function getCollectorUrl() {
  if (typeof appConfig.collectorUrl === "string" && appConfig.collectorUrl.trim()) {
    return appConfig.collectorUrl.replace(/\/$/, "");
  }
  return "";
}

function clearLegacyStorage() {
  const storedVersion = localStorage.getItem(STORAGE_KEYS.version);
  if (storedVersion === STORAGE_VERSION) {
    return;
  }

  [
    "stock-game-allocations",
    "stock-game-participant-id",
    "stock-game-collected-submissions",
    "stock-game-storage-version",
    "stock-game-v4-allocations",
    "stock-game-v4-participant-id"
  ].forEach((key) => {
    localStorage.removeItem(key);
  });

  localStorage.setItem(STORAGE_KEYS.version, STORAGE_VERSION);
}

function formatCurrency(value) {
  return currencyFormatter.format(value);
}

function sanitizeShareCount(value) {
  if (Number.isNaN(value) || value < 0) {
    return 0;
  }
  return Math.round(value);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
