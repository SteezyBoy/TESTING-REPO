function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    localStorage.setItem(STORAGE_KEYS.darkMode, isDarkMode);
    applyDarkMode();
}

function applyDarkMode() {
    document.documentElement.setAttribute("data-theme", isDarkMode ? "dark" : "light");
    const icon = document.getElementById("darkmodeIcon");
    if (icon) icon.textContent = isDarkMode ? "☀️" : "🌙";
}

// ================================================================
// JALUR BARU pemanggilan menu makanan saat halaman dibuka.
// Urutan ini SENGAJA dipisah jadi fungsi sendiri (initMenuPipeline)
// supaya bisa dipanggil ulang kapan pun (misalnya dari tombol reload)
// tanpa harus reload seluruh halaman.
// ================================================================
// ================================================================
// JALUR BARU: Pipeline Menu Anti-Double Render & Flicker
// ================================================================
async function initMenuPipeline() {
    // 1. Tampilkan skeleton loading (jika ada) saat menunggu proses
    if (typeof showSkeletonLoading === "function") showSkeletonLoading();

    // 2. Ambil data menu dari API/Sheet. Fungsi ini sekarang me-return true/false
    const isApiSuccess = await loadMenuFromSheet();

    // 3. Jika API gagal, timeout, atau kosong -> gunakan Default Menu Lokal
    if (!isApiSuccess) {
        console.log("[menu] API kosong/gagal, menggunakan menu default lokal.");
        setDefaultMenu();
    }

    // 4. Render DOM hanya SEKALI di akhir proses (mencegah kedip / hilang)
    safeRenderMenu();
}

document.addEventListener("DOMContentLoaded", async () => {
    applyDarkMode();
    tableNumber = getTableNumber();
    const tableDisplay = document.getElementById("tableDisplay");
    if (tableDisplay) {
        tableDisplay.textContent = tableNumber ? `🪑 Table ${tableNumber}` : "";
        tableDisplay.style.display = tableNumber ? "block" : "none";
    }
    loadCartFromLocal();

    await initMenuPipeline();

    if (activeOrderId) {
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
    if (event.target === modal)              closeModal();
    if (event.target === cartModal)          closeCart();
    if (event.target === quickModal)         closeQuickAddModal();
    if (event.target === paymentChoiceModal) closePaymentChoiceModal();
};
