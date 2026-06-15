// Ambil data dark mode awal dari localStorage atau default false
if (typeof isDarkMode === "undefined") {
    var isDarkMode = localStorage.getItem("darkMode") === "true";
}
if (typeof tableNumber === "undefined") {
    var tableNumber = null;
}
if (typeof activeOrderId === "undefined") {
    var activeOrderId = null;
}

// Fallback jika konstanta STORAGE_KEYS tidak terdefinisi
const MY_STORAGE_KEYS = typeof STORAGE_KEYS !== "undefined" ? STORAGE_KEYS : { darkMode: "darkMode" };

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    localStorage.setItem(MY_STORAGE_KEYS.darkMode, isDarkMode);
    applyDarkMode();
}

function applyDarkMode() {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
    const icon = document.getElementById("darkmodeIcon");
    if (icon) icon.textContent = isDarkMode ? "☀️" : "🌙";
}

document.addEventListener("DOMContentLoaded", async () => {
    applyDarkMode();
    
    // Pastikan fungsi getTableNumber tersedia
    tableNumber = typeof getTableNumber === "function" ? getTableNumber() : null;
    const tableDisplay = document.getElementById("tableDisplay");
    if (tableDisplay) {
        tableDisplay.textContent = tableNumber ? `🪑 Table ${tableNumber}` : "";
        tableDisplay.style.display = tableNumber ? "block" : "none";
    }
    
    if (typeof loadCartFromLocal === "function") {
        loadCartFromLocal();
    }

    // Tampilkan default menu dulu agar tidak kosong
    setDefaultMenu();
    renderMenu();

    // Lalu coba load dari API (jika berhasil, menu akan di-refresh)
    if (typeof showSkeletonLoading === "function") {
        showSkeletonLoading();
    }
    
    await loadMenuFromSheet();
    renderMenu();

    if (activeOrderId && typeof resumeActiveOrderIfNeeded === "function") {
        await resumeActiveOrderIfNeeded();
    } else {
        const fab = document.getElementById("orderStatusFab");
        if (fab) fab.style.display = "none";
    }
});

window.onclick = function(event) {
    const modal              = document.getElementById("modal");
    const cartModal          = document.getElementById("cartModal");
    const quickModal         = document.getElementById("quickAddModal");
    const paymentChoiceModal = document.getElementById("paymentChoiceModal");
    
    if (event.target === modal && typeof closeModal === "function")              closeModal();
    if (event.target === cartModal && typeof closeCart === "function")          closeCart();
    if (event.target === quickModal && typeof closeQuickAddModal === "function")         closeQuickAddModal();
    if (event.target === paymentChoiceModal && typeof closePaymentChoiceModal === "function") BrassChoiceModal();
};
