let SCRIPT_URL        = localStorage.getItem(STORAGE_KEYS.adminUrl) || "";
let currentOrders     = [];
let currentFilter     = "semua";
let editingMenuIndex  = null;
let adminDark         = localStorage.getItem(STORAGE_KEYS.adminDark) === "true";
let autoRefreshTimer  = null;
let adminMenuData     = cloneDefaultMenu();
let lastOrderIds      = new Set();