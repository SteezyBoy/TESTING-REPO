let currentCategory      = "all";
let currentItem          = null;
let cart                 = [];
let currentSearchKeyword = "";
let quickAddItem         = null;
let quickQty             = 1;
let isDarkMode           = localStorage.getItem(STORAGE_KEYS.darkMode) === "true";
let menuData             = { makanan: [], minuman: [], dessert: [] };
let activeOrderId        = localStorage.getItem(STORAGE_KEYS.activeOrderId) || null;
let tableNumber          = "";
let monitorInterval      = null;
let cashierPollInterval  = null;

function getCartKey() {
    return STORAGE_KEYS.cartPrefix + (tableNumber || "guest");
}

function saveCartToLocal() {
    localStorage.setItem(getCartKey(), JSON.stringify(cart));

    localStorage.setItem(
        "hn_order_draft",
        JSON.stringify({
            cart,
            activeOrderId,
            tableNumber
        })
    );
}

function loadCartFromLocal() {

    const saved = localStorage.getItem(getCartKey());

    if (saved) {

        try {

            cart = JSON.parse(saved);

        } catch(e) {

            console.error(e);

            cart = [];

        }

    }

    const draft =
        localStorage.getItem("hn_order_draft");

    if (draft) {

        try {

            const data =
                JSON.parse(draft);

            if (
                data.cart &&
                Array.isArray(data.cart)
            ) {
                cart = data.cart;
            }

            if (
                data.activeOrderId
            ) {
                activeOrderId =
                    data.activeOrderId;
            }

        } catch(err) {

            console.error(err);

        }
    }

    updateCartBadge();
}
