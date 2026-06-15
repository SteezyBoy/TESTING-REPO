let currentCategory     = "all";
let currentItem         = null;
let cart                = [];
let currentSearchKeyword = "";
let quickAddItem        = null;
let quickQty            = 1;
let isDarkMode          = localStorage.getItem(STORAGE_KEYS.darkMode) === "true";
let menuData            = { makanan: [], minuman: [], dessert: [] };
let activeOrderId       = localStorage.getItem(STORAGE_KEYS.activeOrderId) || null;
let tableNumber         = "";
let monitorInterval     = null;
let cashierPollInterval = null;

function getCartKey() {
    return STORAGE_KEYS.cartPrefix + (tableNumber || "guest");
}

function saveCartToLocal() {
    localStorage.setItem(getCartKey(), JSON.stringify(cart));
}

function loadCartFromLocal() {
    const saved = localStorage.getItem(getCartKey());
    if (saved) {
        try { cart = JSON.parse(saved); } catch(e) { cart = []; }
        updateCartBadge();
    }
}