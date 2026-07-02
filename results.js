const appConfig = window.STOCK_APP_CONFIG || {};
const STORAGE_VERSION = appConfig.storageVersion || "stock-game-v4";
const STORAGE_KEYS = {
  version: "stock-game-storage-version",
  allocations: `${STORAGE_VERSION}-allocations`,
  participantId: `${STORAGE_VERSION}-participant-id`
};

clearLegacyStorage();

const selectedYear = "2022";

const currencyFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR"
});

const integerFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 0
});

const percentFormatter = new Intl.NumberFormat("de-DE", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const elements = {
  resultYear: document.querySelector("#result-year"),
  resultDepotValue: document.querySelector("#result-depot-value"),
  resultHeadline: document.querySelector("#result-headline"),
  resultsEmpty: document.querySelector("#results-empty"),
  resultsContent: document.querySelector("#results-content"),
  chartValueLabel: document.querySelector("#chart-value-label"),
  chartReturnLabel: document.querySelector("#chart-return-label"),
  summaryBars: document.querySelector("#summary-bars"),
  portfolioBreakdown: document.querySelector("#portfolio-breakdown")
};

renderResultsPage();

async function renderResultsPage() {
  const allocations = loadAllocations();
  const positions = getSelectedPositions(allocations, selectedYear);
  const participantId = getParticipantId();

  elements.resultYear.textContent = selectedYear;

  if (!positions.length) {
    elements.resultsContent.classList.add("hidden");
    elements.resultsEmpty.classList.remove("hidden");
    return;
  }

  const totalInvested = positions.reduce((sum, position) => sum + position.amount, 0);
  const totalStockValue = positions.reduce((sum, position) => sum + position.comparisonValue, 0);
  const cashLeft = STOCK_APP_DATA.startBudget - totalInvested;
  const depotValue = cashLeft + totalStockValue;
  const profit = depotValue - STOCK_APP_DATA.startBudget;
  const returnRate = profit / STOCK_APP_DATA.startBudget;

  elements.resultDepotValue.textContent = formatCurrency(depotValue);
  elements.resultHeadline.textContent = "Gewinn / Verlust 2022";

  renderSummaryBars(depotValue);
  renderResultSummary(profit, returnRate);
  renderBreakdown(positions);

  await submitResult({
    participantId,
    year: selectedYear,
    invested: totalInvested,
    totalValue: depotValue,
    profit,
    returnRate
  });

  const summary2026 = buildYearSummary(allocations, "2026");
  if (summary2026) {
    await submitResult({
      participantId,
      year: "2026",
      invested: summary2026.totalInvested,
      totalValue: summary2026.depotValue,
      profit: summary2026.profit,
      returnRate: summary2026.returnRate
    });
  }
}

function renderSummaryBars(depotValue) {
  const width = Math.max(6, Math.round((depotValue / STOCK_APP_DATA.startBudget) * 100));

  elements.summaryBars.innerHTML = `
    <div class="summary-bar-row">
      <span class="summary-bar-label">Depotwert</span>
      <div class="summary-bar-wrap">
        <div class="summary-bar summary-bar-value" style="width:${Math.min(width, 100)}%"></div>
      </div>
      <strong>${formatCurrency(depotValue)}</strong>
    </div>
  `;
}

function renderResultSummary(profit, returnRate) {
  elements.chartValueLabel.textContent = formatCurrency(profit);
  elements.chartReturnLabel.textContent = percentFormatter.format(returnRate);
  elements.chartValueLabel.className = profit >= 0 ? "positive" : "negative";
  elements.chartReturnLabel.className = profit >= 0 ? "positive" : "negative";
}

function renderBreakdown(positions) {
  elements.portfolioBreakdown.innerHTML = positions
    .map((position) => {
      const profit = position.comparisonValue - position.amount;
      const rate = position.amount === 0 ? 0 : profit / position.amount;

      return `
        <tr>
          <td><strong>${escapeHtml(position.name)}</strong></td>
          <td>${integerFormatter.format(position.shares)}</td>
          <td>${formatCurrency(position.amount)}</td>
          <td>${formatCurrency(position.comparisonValue)}</td>
          <td class="${profit >= 0 ? "positive" : "negative"}">
            <strong>${formatCurrency(profit)}</strong> (${percentFormatter.format(rate)})
          </td>
        </tr>
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
      const comparisonValue = shares * getPriceForYear(stock, year);
      return {
        name: stock.name,
        shares,
        amount,
        comparisonValue
      };
    });
}

function buildYearSummary(allocations, year) {
  const positions = getSelectedPositions(allocations, year);

  if (!positions.length) {
    return null;
  }

  const totalInvested = positions.reduce((sum, position) => sum + position.amount, 0);
  const totalStockValue = positions.reduce((sum, position) => sum + position.comparisonValue, 0);
  const cashLeft = STOCK_APP_DATA.startBudget - totalInvested;
  const depotValue = cashLeft + totalStockValue;
  const profit = depotValue - STOCK_APP_DATA.startBudget;
  const returnRate = profit / STOCK_APP_DATA.startBudget;

  return {
    totalInvested,
    depotValue,
    profit,
    returnRate
  };
}

function getPriceForYear(stock, year) {
  return stock.prices[year] ?? stock.prices["2025"] ?? stock.startPrice ?? 0;
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
    return;
  }

  try {
    await fetch(`${collectorUrl}/api/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch {
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
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
