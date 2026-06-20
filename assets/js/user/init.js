function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    localStorage.setItem(STORAGE_KEYS.darkMode, isDarkMode);
    applyDarkMode();
}

function applyDarkMode() {
    document.documentElement.setAttribute(
        "data-theme",
        isDarkMode ? "dark" : "light"
    );

    const icon = document.getElementById("darkmodeIcon");

    if (icon) {
        icon.textContent = isDarkMode ? "☀️" : "🌙";
    }
}

async function initMenuPipeline() {
    try {
        // tampilkan menu default dulu
        if (typeof setDefaultMenu === "function") {
            setDefaultMenu();
        }

        if (typeof safeRenderMenu === "function") {
            safeRenderMenu();
        }

        // update dari sheet
        if (typeof loadMenuFromSheet === "function") {
            await loadMenuFromSheet();
        }

    } catch (err) {
        console.error("Menu Pipeline Error:", err);

        try {
            if (typeof setDefaultMenu === "function") {
                setDefaultMenu();
            }

            if (typeof safeRenderMenu === "function") {
                safeRenderMenu();
            }
        } catch (e) {
            console.error("Fallback Render Error:", e);
        }
    }
}

document.addEventListener("DOMContentLoaded", async () => {

    try {

        applyDarkMode();

        tableNumber = getTableNumber();

        const tableDisplay =
            document.getElementById("tableDisplay");

        if (tableDisplay) {
            tableDisplay.textContent =
                tableNumber ? `🪑 Table ${tableNumber}` : "";

            tableDisplay.style.display =
                tableNumber ? "block" : "none";
        }

        loadCartFromLocal();

        await initMenuPipeline();

        // NONAKTIFKAN fitur resume order yang hilang
        const fab = document.getElementById("orderStatusFab");

        if (fab) {
            fab.style.display = "none";
        }

    } catch (err) {

        console.error("INIT ERROR:", err);

        try {
            setDefaultMenu();

            if (typeof safeRenderMenu === "function") {
                safeRenderMenu();
            }
        } catch (e) {
            console.error("EMERGENCY MENU ERROR:", e);
        }
    }
});

window.onclick = function(event) {

    const modal =
        document.getElementById("modal");

    const cartModal =
        document.getElementById("cartModal");

    const quickModal =
        document.getElementById("quickAddModal");

    const paymentChoiceModal =
        document.getElementById("paymentChoiceModal");

    if (event.target === modal)
        closeModal();

    if (event.target === cartModal)
        closeCart();

    if (event.target === quickModal)
        closeQuickAddModal();

    if (event.target === paymentChoiceModal)
        closePaymentChoiceModal();
};
