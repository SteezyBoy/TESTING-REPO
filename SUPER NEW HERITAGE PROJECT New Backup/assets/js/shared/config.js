const APPS_SCRIPT_FALLBACK_URL = "https://script.google.com/macros/s/AKfycbzuAkoRqw2XZKLLPs48QaONg1PWkpeN9ZkFnnFwKD1BrknSc9bgzr3hKo_RV_5Mx09fAQ/exec";

const STORAGE_KEYS = {
    adminUrl:      "hn_admin_url",
    adminSession:  "hn_admin_session",
    adminPass:     "hn_admin_pass",
    adminDark:     "hn_admin_dark",
    darkMode:      "hn_darkmode",
    activeOrderId: "hn_active_order_id",
    tableNumber:   "hn_table_number",
    cartPrefix:    "hn_cart_"
};

function getAppsScriptUrl() {
    return localStorage.getItem(STORAGE_KEYS.adminUrl) || APPS_SCRIPT_FALLBACK_URL;
}

function getTableNumber() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("table");
    if (fromUrl) {
        localStorage.setItem(STORAGE_KEYS.tableNumber, fromUrl);
        return fromUrl;
    }
    return localStorage.getItem(STORAGE_KEYS.tableNumber) || "";
}

function clearTableSession() {
    localStorage.removeItem(STORAGE_KEYS.tableNumber);
    localStorage.removeItem(STORAGE_KEYS.activeOrderId);
}