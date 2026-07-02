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
  chartValueLabel: document.querySelector("#chart-value-label"),
  chartReturnLabel: document.querySelector("#chart-return-label"),
  syncStatus: document.querySelector("#sync-status"),
  summaryBars: document.querySelector("#summary-bars")
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
  renderSummaryBars(totalInvested, totalValue);
  renderResultSummary(profit, returnRate);

  await submitResult({
    participantId: getParticipantId(),
    year: selectedYear,
    invested: totalInvested,
    totalValue,
    profit,
    returnRate
  });
}

function renderSummaryBars(totalInvested, totalValue) {
  const maxValue = Math.max(totalInvested, totalValue, 1);
  const investedWidth = Math.max(6, Math.round((totalInvested / maxValue) * 100));
  const valueWidth = Math.max(6, Math.round((totalValue / maxValue) * 100));

  elements.summaryBars.innerHTML = `
    <div class="summary-bar-row">
      <span class="summary-bar-label">Investiert</span>
      <div class="summary-bar-wrap">
        <div class="summary-bar summary-bar-invested" style="width:${investedWidth}%"></div>
      </div>
      <strong>${formatCurrency(totalInvested)}</strong>
    </div>
    <div class="summary-bar-row">
      <span class="summary-bar-label">Depotwert</span>
      <div class="summary-bar-wrap">
        <div class="summary-bar summary-bar-value" style="width:${valueWidth}%"></div>
      </div>
      <strong>${formatCurrency(totalValue)}</strong>
    </div>
  `;
}

function renderResultSummary(profit, returnRate) {
  elements.chartValueLabel.textContent = formatCurrency(profit);
  elements.chartReturnLabel.textContent = percentFormatter.format(returnRate);
  elements.chartValueLabel.className = profit >= 0 ? "positive" : "negative";
  elements.chartReturnLabel.className = profit >= 0 ? "positive" : "negative";
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
