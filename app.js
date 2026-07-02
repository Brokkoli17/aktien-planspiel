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
  pressHandle: null,
  pressStockId: null,
  pressTriggered: false,
  modalStockId: null,
  modalDraftShares: 0,
  modalInputValue: "0"
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
  sliderList: document.querySelector("#stocks-slider"),
  stockModal: document.querySelector("#stock-modal"),
  modalBackdrop: document.querySelector("#modal-backdrop"),
  modalSaveButton: document.querySelector("#modal-save-button"),
  modalStockName: document.querySelector("#modal-stock-name"),
  modalStockMeta: document.querySelector("#modal-stock-meta"),
  modalSharesValue: document.querySelector("#modal-shares-value"),
  modalInvestedValue: document.querySelector("#modal-invested-value"),
  modalMaxValue: document.querySelector("#modal-max-value"),
  modalSlider: document.querySelector("#modal-slider"),
  modalApplyButton: document.querySelector("#modal-apply-button"),
  modalNumpad: document.querySelector(".modal-numpad")
};

elements.startBudget.textContent = formatCurrency(STOCK_APP_DATA.startBudget);

renderAll();

elements.evaluate2022Button.addEventListener("click", () => {
  openResultsPage("2022");
});

elements.evaluate2025Button.addEventListener("click", () => {
  openResultsPage("2025");
});

elements.modalBackdrop.addEventListener("click", closeStockModal);
elements.modalSaveButton.addEventListener("click", applyModalShares);
elements.modalApplyButton.addEventListener("click", applyModalShares);
elements.modalSlider.addEventListener("input", handleModalSliderInput);
elements.modalNumpad.addEventListener("click", handleNumpadClick);
window.addEventListener("keydown", handleWindowKeyDown);

function renderAll() {
  renderSliderList();
  updateBudgetSummary();
}

function renderSliderList() {
  const stocks = STOCK_APP_DATA.stocks.filter((stock) => Boolean(stock.startPrice));
  elements.sliderList.innerHTML = stocks.map((stock) => renderSliderRow(stock)).join("");

  document.querySelectorAll("[data-stock-id]").forEach((card) => {
    card.addEventListener("pointerdown", handleRowPointerDown);
    card.addEventListener("pointerup", clearLongPress);
    card.addEventListener("pointerleave", clearLongPress);
    card.addEventListener("pointercancel", clearLongPress);
    card.addEventListener("dblclick", handleRowDoubleClick);
    card.addEventListener("keydown", handleRowKeyDown);
    card.addEventListener("contextmenu", handleRowContextMenu);
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
        data-stock-id="${stock.id}"
        tabindex="0"
        role="button"
        aria-label="${escapeHtml(stock.name)} bearbeiten"
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
  if (event.button !== undefined && event.button !== 0) {
    return;
  }

  clearLongPress();
  state.pressStockId = event.currentTarget.dataset.stockId;
  state.pressTriggered = false;
  state.pressHandle = window.setTimeout(() => {
    state.pressTriggered = true;
    openStockModal(state.pressStockId);
  }, 350);
}

function handleRowDoubleClick(event) {
  openStockModal(event.currentTarget.dataset.stockId);
}

function handleRowKeyDown(event) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openStockModal(event.currentTarget.dataset.stockId);
  }
}

function handleRowContextMenu(event) {
  event.preventDefault();
  openStockModal(event.currentTarget.dataset.stockId);
}

function clearLongPress() {
  if (state.pressHandle) {
    window.clearTimeout(state.pressHandle);
  }

  state.pressHandle = null;
  state.pressStockId = null;
}

function openStockModal(stockId) {
  clearLongPress();
  const stock = getStockById(stockId);

  if (!stock) {
    return;
  }

  state.modalStockId = stockId;
  state.modalDraftShares = state.allocations[stockId] ?? 0;
  state.modalInputValue = String(state.modalDraftShares);

  elements.modalStockName.textContent = stock.name;
  elements.modalStockMeta.textContent = `${stock.symbol} · Kurs 2021: ${formatCurrency(stock.startPrice)}`;
  elements.stockModal.classList.remove("hidden");
  elements.stockModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  syncModalUi();
}

function closeStockModal() {
  clearLongPress();
  state.modalStockId = null;
  elements.stockModal.classList.add("hidden");
  elements.stockModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function syncModalUi() {
  const stock = getStockById(state.modalStockId);

  if (!stock) {
    return;
  }

  const maxShares = getMaxAllowedShares(stock.id);
  state.modalDraftShares = clampShares(state.modalDraftShares, maxShares);
  state.modalInputValue = String(state.modalDraftShares);

  elements.modalSlider.max = String(maxShares);
  elements.modalSlider.value = String(state.modalDraftShares);
  elements.modalSharesValue.textContent = integerFormatter.format(state.modalDraftShares);
  elements.modalInvestedValue.textContent = formatCurrency(state.modalDraftShares * stock.startPrice);
  elements.modalMaxValue.textContent = integerFormatter.format(maxShares);
}

function handleModalSliderInput(event) {
  state.modalDraftShares = clampShares(Number(event.target.value), getCurrentModalMaxShares());
  state.modalInputValue = String(state.modalDraftShares);
  syncModalUi();
}

function handleNumpadClick(event) {
  const button = event.target.closest("[data-key]");

  if (!button) {
    return;
  }

  const key = button.dataset.key;

  if (key === "clear") {
    state.modalInputValue = "0";
  } else if (key === "backspace") {
    state.modalInputValue = state.modalInputValue.length > 1
      ? state.modalInputValue.slice(0, -1)
      : "0";
  } else if (/^\d$/.test(key)) {
    state.modalInputValue = state.modalInputValue === "0"
      ? key
      : `${state.modalInputValue}${key}`;
  }

  state.modalDraftShares = clampShares(Number(state.modalInputValue), getCurrentModalMaxShares());
  state.modalInputValue = String(state.modalDraftShares);
  syncModalUi();
}

function applyModalShares() {
  const stockId = state.modalStockId;

  if (!stockId) {
    return;
  }

  if (state.modalDraftShares > 0) {
    state.allocations[stockId] = state.modalDraftShares;
  } else {
    delete state.allocations[stockId];
  }

  persistAllocations();
  closeStockModal();
  renderAll();
}

function handleWindowKeyDown(event) {
  if (event.key === "Escape" && !elements.stockModal.classList.contains("hidden")) {
    closeStockModal();
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

function getCurrentModalMaxShares() {
  return getMaxAllowedShares(state.modalStockId);
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
