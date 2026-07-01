const state = {
  allocations: loadAllocations()
};

const currencyFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR"
});

const integerFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 0
});

const elements = {
  startBudget: document.querySelector("#start-budget"),
  investedTotal: document.querySelector("#invested-total"),
  remainingBudget: document.querySelector("#remaining-budget"),
  budgetProgress: document.querySelector("#budget-progress"),
  evaluate2022Button: document.querySelector("#evaluate-2022-button"),
  evaluate2025Button: document.querySelector("#evaluate-2025-button"),
  sliderList: document.querySelector("#stocks-slider")
};

elements.startBudget.textContent = formatCurrency(STOCK_APP_DATA.startBudget);

renderAll();

elements.evaluate2022Button.addEventListener("click", () => {
  openResultsPage("2022");
});

elements.evaluate2025Button.addEventListener("click", () => {
  openResultsPage("2025");
});

function renderAll() {
  renderSliderList();
  updateBudgetSummary();
}

function renderSliderList() {
  const stocks = getSelectableStocks();
  elements.sliderList.innerHTML = stocks.map((stock) => renderSliderRow(stock)).join("");

  document.querySelectorAll("[data-stock-id]").forEach((input) => {
    input.addEventListener("input", handleSliderInput);
    input.addEventListener("change", handleSliderInput);
  });
}

function renderSliderRow(stock) {
  const shares = state.allocations[stock.id] ?? 0;
  const maxShares = getSliderMaxShares(stock);
  const fill = maxShares === 0 ? 0 : (shares / maxShares) * 100;

  return `
    <div class="stock-row">
      <label class="row-slider-card" style="--row-fill:${fill}%">
        <input
          class="row-slider-input"
          type="range"
          min="0"
          max="${maxShares}"
          step="1"
          value="${Math.min(shares, maxShares)}"
          data-stock-id="${stock.id}"
        />
        <span class="row-name">${escapeHtml(stock.name)}</span>
        <span class="row-symbol">${escapeHtml(stock.symbol)}</span>
        <span class="row-price">${formatCurrency(stock.startPrice)}</span>
        <span class="row-shares">${integerFormatter.format(shares)}</span>
      </label>
    </div>
  `;
}

function handleSliderInput(event) {
  const stockId = event.target.dataset.stockId;
  const stock = getStockById(stockId);
  const currentShares = state.allocations[stockId] ?? 0;
  const requestedShares = sanitizeShareCount(Number(event.target.value));
  const investedWithoutCurrent = getTotalAllocated() - currentShares * stock.startPrice;
  const availableBudget = STOCK_APP_DATA.startBudget - investedWithoutCurrent;
  const maxAllowedShares = Math.floor(availableBudget / stock.startPrice);
  const nextShares = Math.max(0, Math.min(requestedShares, maxAllowedShares));

  if (nextShares > 0) {
    state.allocations[stockId] = nextShares;
  } else {
    delete state.allocations[stockId];
  }

  persistAllocations();
  renderAll();
}

function getSelectableStocks() {
  return STOCK_APP_DATA.stocks.filter((stock) => Boolean(stock.startPrice));
}

function getStockById(stockId) {
  return STOCK_APP_DATA.stocks.find((stock) => stock.id === stockId);
}

function getSliderMaxShares(stock) {
  return Math.floor(STOCK_APP_DATA.startBudget / stock.startPrice);
}

function updateBudgetSummary() {
  const totalAllocated = getTotalAllocated();
  const remaining = STOCK_APP_DATA.startBudget - totalAllocated;
  const progress = (totalAllocated / STOCK_APP_DATA.startBudget) * 100;

  elements.investedTotal.textContent = formatCurrency(totalAllocated);
  elements.remainingBudget.textContent = formatCurrency(remaining);
  elements.budgetProgress.style.width = `${Math.max(0, Math.min(100, progress))}%`;
}

function getTotalAllocated() {
  return Object.entries(state.allocations).reduce((sum, [stockId, shares]) => {
    const stock = getStockById(stockId);
    return sum + shares * stock.startPrice;
  }, 0);
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

function persistAllocations() {
  localStorage.setItem("stock-game-allocations", JSON.stringify(state.allocations));
}

function openResultsPage(year) {
  window.location.href = `results.html?year=${year}`;
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
