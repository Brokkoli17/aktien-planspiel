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
  popupStockId: null,
  popupInputValue: "0"
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
  stocksList: document.querySelector("#stocks-slider"),
  editorPopup: document.querySelector("#editor-popup"),
  popupBackdrop: document.querySelector("#popup-backdrop"),
  popupStockName: document.querySelector("#popup-stock-name"),
  popupStockMeta: document.querySelector("#popup-stock-meta"),
  popupShareValue: document.querySelector("#popup-share-value"),
  popupInvestedValue: document.querySelector("#popup-invested-value"),
  popupMaxValue: document.querySelector("#popup-max-value"),
  popupPad: document.querySelector("#popup-pad"),
  popupCancelButton: document.querySelector("#popup-cancel-button"),
  popupSaveButton: document.querySelector("#popup-save-button")
};

elements.startBudget.textContent = formatCurrency(STOCK_APP_DATA.startBudget);

elements.evaluate2022Button.addEventListener("click", () => openResultsPage("2022"));
elements.popupBackdrop.addEventListener("click", closePopup);
elements.popupPad.addEventListener("click", handleNumpadClick);
elements.popupCancelButton.addEventListener("click", closePopup);
elements.popupSaveButton.addEventListener("click", savePopupValue);
window.addEventListener("keydown", handleWindowKeyDown);

renderAll();

function renderAll() {
  renderStocksList();
  updateBudgetSummary();
}

function renderStocksList() {
  const stocks = STOCK_APP_DATA.stocks.filter((stock) => Boolean(stock.startPrice));
  elements.stocksList.innerHTML = stocks.map((stock) => renderStockRow(stock)).join("");

  document.querySelectorAll("[data-open-popup]").forEach((button) => {
    button.addEventListener("click", handleOpenPopupClick);
  });
}

function renderStockRow(stock) {
  const shares = state.allocations[stock.id] ?? 0;

  return `
    <div class="stock-row">
      <div class="stock-line">
        <span class="row-name">${escapeHtml(stock.name)}</span>
        <span class="row-symbol">${escapeHtml(stock.symbol)}</span>
        <span class="row-price">${formatCurrency(stock.startPrice)}</span>
        <button
          type="button"
          class="row-shares row-shares-button"
          data-open-popup="${stock.id}"
          aria-label="${escapeHtml(stock.name)} Stückzahl bearbeiten"
        >
          ${integerFormatter.format(shares)}
        </button>
      </div>
    </div>
  `;
}

function handleOpenPopupClick(event) {
  const stockId = event.currentTarget.dataset.openPopup;
  const stock = getStockById(stockId);

  if (!stock) {
    return;
  }

  state.popupStockId = stockId;
  state.popupInputValue = String(state.allocations[stockId] ?? 0);

  elements.popupStockName.textContent = stock.name;
  elements.popupStockMeta.textContent = `${stock.symbol} · Kurs 2021: ${formatCurrency(stock.startPrice)}`;
  elements.editorPopup.classList.remove("hidden");
  document.body.classList.add("popup-open");
  syncPopupSummary();
}

function handleNumpadClick(event) {
  const button = event.target.closest("[data-numpad-key]");

  if (!button || !state.popupStockId) {
    return;
  }

  const key = button.dataset.numpadKey;

  if (key === "clear") {
    state.popupInputValue = "0";
  } else if (key === "backspace") {
    state.popupInputValue = state.popupInputValue.length > 1
      ? state.popupInputValue.slice(0, -1)
      : "0";
  } else if (/^\d$/.test(key)) {
    state.popupInputValue = state.popupInputValue === "0"
      ? key
      : `${state.popupInputValue}${key}`;
  }

  const maxShares = getMaxAllowedShares(state.popupStockId);
  state.popupInputValue = String(clampShares(Number(state.popupInputValue), maxShares));
  syncPopupSummary();
}

function syncPopupSummary() {
  const stock = getStockById(state.popupStockId);

  if (!stock) {
    return;
  }

  const shares = clampShares(Number(state.popupInputValue), getMaxAllowedShares(stock.id));
  const invested = shares * stock.startPrice;
  const maxShares = getMaxAllowedShares(stock.id);

  state.popupInputValue = String(shares);
  elements.popupShareValue.textContent = integerFormatter.format(shares);
  elements.popupInvestedValue.textContent = formatCurrency(invested);
  elements.popupMaxValue.textContent = integerFormatter.format(maxShares);
}

function savePopupValue() {
  const stockId = state.popupStockId;

  if (!stockId) {
    return;
  }

  const nextShares = clampShares(Number(state.popupInputValue), getMaxAllowedShares(stockId));

  if (nextShares > 0) {
    state.allocations[stockId] = nextShares;
  } else {
    delete state.allocations[stockId];
  }

  persistAllocations();
  closePopup();
  renderAll();
}

function closePopup() {
  state.popupStockId = null;
  state.popupInputValue = "0";
  elements.editorPopup.classList.add("hidden");
  document.body.classList.remove("popup-open");
}

function handleWindowKeyDown(event) {
  if (event.key === "Escape" && state.popupStockId) {
    closePopup();
  }
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
    return stock ? sum + shares * stock.startPrice : sum;
  }, 0);
}

function getMaxAllowedShares(stockId) {
  const stock = getStockById(stockId);

  if (!stock) {
    return 0;
  }

  const currentShares = state.allocations[stockId] ?? 0;
  const investedWithoutCurrent = getTotalAllocated() - currentShares * stock.startPrice;
  const availableBudget = STOCK_APP_DATA.startBudget - investedWithoutCurrent;
  return Math.max(0, Math.floor(availableBudget / stock.startPrice));
}

function getStockById(stockId) {
  return STOCK_APP_DATA.stocks.find((item) => item.id === stockId);
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

function clampShares(value, maxShares) {
  if (Number.isNaN(value) || value < 0) {
    return 0;
  }

  return Math.max(0, Math.min(Math.round(value), maxShares));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
