// Menggunakan variabel isDarkMode yang sudah ada di state.js, atau buat baru jika benar-benar belum ada
if (typeof isDarkMode === "undefined") {
    window.isDarkMode = localStorage.getItem("darkMode") === "true";
} else {
    // Jika sudah ada di file lain, pastikan nilainya sinkron dengan localStorage saat startup
    isDarkMode = localStorage.getItem("darkMode") === "true";
}

if (typeof tableNumber === "undefined") {
    window.tableNumber = null;
}
if (typeof activeOrderId === "undefined") {
    window.activeOrderId = null;
}

// Fallback aman jika konstanta STORAGE_KEYS belum terdefinisi
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

    // Tampilkan default menu terlebih dahulu agar halaman tidak kosong semenjak awal
    if (typeof setDefaultMenu === "function") {
        setDefaultMenu();
    }
    if (typeof renderMenu === "function") {
        renderMenu();
    }

    // Tampilkan skeleton loading jika ada fungsinya
    if (typeof showSkeletonLoading === "function") {
        showSkeletonLoading();
    }
    
    // Tarik data menu terbaru dari Google Sheets API
    if (typeof loadMenuFromSheet === "function") {
        await loadMenuFromSheet();
    }
    
    // Render ulang setelah data dari API berhasil didapatkan
    if (typeof renderMenu === "function") {
        renderMenu();
    }

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
    if (event.target === quickModal && typeof closeQuickAddModal === "function") closeQuickAddModal();
    if (event.target === paymentChoiceModal && typeof BrassChoiceModal === "function") BrassChoiceModal();
};
