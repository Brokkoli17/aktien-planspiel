const appConfig = window.STOCK_APP_CONFIG || {};
const STORAGE_VERSION = appConfig.storageVersion || "stock-game-v4";
const STORAGE_KEYS = {
  version: "stock-game-storage-version",
  allocations: `${STORAGE_VERSION}-allocations`,
  participantId: `${STORAGE_VERSION}-participant-id`
};

clearLegacyStorage();

const state = {
  allocations: loadAllocations(),
  dragStockId: null
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
  const stocks = STOCK_APP_DATA.stocks.filter((stock) => Boolean(stock.startPrice));
  elements.sliderList.innerHTML = stocks.map((stock) => renderSliderRow(stock)).join("");

  document.querySelectorAll("[data-drag-stock-id]").forEach((card) => {
    card.addEventListener("pointerdown", handleRowPointerDown);
  });
}

function renderSliderRow(stock) {
  const shares = state.allocations[stock.id] ?? 0;
  const maxShares = Math.floor(STOCK_APP_DATA.startBudget / stock.startPrice);
  const fill = maxShares === 0 ? 0 : (shares / maxShares) * 100;

  return `
    <div class="stock-row">
      <div
        class="row-slider-card"
        style="--row-fill:${fill}%"
        data-drag-stock-id="${stock.id}"
        data-max-shares="${maxShares}"
      >
        <span class="row-name">${escapeHtml(stock.name)}</span>
        <span class="row-symbol">${escapeHtml(stock.symbol)}</span>
        <span class="row-price">${formatCurrency(stock.startPrice)}</span>
        <span class="row-shares">${integerFormatter.format(shares)}</span>
      </div>
    </div>
  `;
}

function handleRowPointerDown(event) {
  state.dragStockId = event.currentTarget.dataset.dragStockId;
  updateSharesFromPointer(event);
  window.addEventListener("pointermove", handleWindowPointerMove);
  window.addEventListener("pointerup", handleWindowPointerUp);
}

function handleWindowPointerMove(event) {
  if (!state.dragStockId) {
    return;
  }

  updateSharesFromPointer(event);
}

function handleWindowPointerUp() {
  state.dragStockId = null;
  window.removeEventListener("pointermove", handleWindowPointerMove);
  window.removeEventListener("pointerup", handleWindowPointerUp);
}

function updateSharesFromPointer(event) {
  const stockId = state.dragStockId;
  const card = document.querySelector(`[data-drag-stock-id="${stockId}"]`);

  if (!card) {
    return;
  }

  const rect = card.getBoundingClientRect();
  const pointerX = Math.min(Math.max(event.clientX, rect.left), rect.right);
  const ratio = rect.width <= 0 ? 0 : (pointerX - rect.left) / rect.width;
  const visualMaxShares = Number(card.dataset.maxShares || 0);
  const requestedShares = sanitizeShareCount(ratio * visualMaxShares);
  const stock = STOCK_APP_DATA.stocks.find((item) => item.id === stockId);
  const currentShares = state.allocations[stockId] ?? 0;
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
    const stock = STOCK_APP_DATA.stocks.find((item) => item.id === stockId);
    return sum + shares * stock.startPrice;
  }, 0);
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

function persistAllocations() {
  localStorage.setItem(STORAGE_KEYS.allocations, JSON.stringify(state.allocations));
}

function openResultsPage(year) {
  window.location.href = `results.html?year=${year}`;
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
