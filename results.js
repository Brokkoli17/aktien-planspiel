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
  resultCode: document.querySelector("#result-code"),
  copyCodeButton: document.querySelector("#copy-code-button")
};

elements.copyCodeButton.addEventListener("click", copyCodeToClipboard);

renderResultsPage();

function renderResultsPage() {
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
  const submission = {
    participantId: getParticipantId(),
    year: selectedYear,
    invested: totalInvested,
    totalValue,
    profit,
    returnRate
  };

  elements.resultInvested.textContent = formatCurrency(totalInvested);
  elements.resultHeadline.textContent = `Gewinn / Verlust ${comparison.label}`;
  renderSingleChart(profit, returnRate);
  elements.resultCode.value = encodeSubmission(submission);
  elements.syncStatus.textContent =
    "Diesen Code kannst du auf dem Sammelgeraet einfuegen.";
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

function getSelectedPositions(allocations, year) {
  return STOCK_APP_DATA.stocks
    .filter((stock) => stock.startPrice && (allocations[stock.id] ?? 0) > 0)
    .map((stock) => {
      const shares = allocations[stock.id];
      const amount = shares * stock.startPrice;
      const comparisonValue = shares * stock.prices[year];

      return {
        ...stock,
        amount,
        shares,
        comparisonValue
      };
    });
}

function loadAllocations() {
  try {
    const parsed = JSON.parse(localStorage.getItem("stock-game-allocations") ?? "{}");
    return Object.fromEntries(
      Object.entries(parsed).map(([stockId, shares]) => [stockId, sanitizeShareCount(Number(shares))])
    );
  } catch {
    return {};
  }
}

function getParticipantId() {
  const existing = localStorage.getItem("stock-game-participant-id");
  if (existing) {
    return existing;
  }

  const created = `T${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  localStorage.setItem("stock-game-participant-id", created);
  return created;
}

async function copyCodeToClipboard() {
  try {
    await navigator.clipboard.writeText(elements.resultCode.value);
    elements.syncStatus.textContent = "Code kopiert. Jetzt auf dem Sammelgeraet einfuegen.";
  } catch {
    elements.resultCode.select();
    elements.syncStatus.textContent = "Bitte den Code manuell kopieren.";
  }
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
