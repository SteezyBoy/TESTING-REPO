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
async function initMenuPipeline() {
    // 1) Tampilkan menu default DULU, instan, tanpa menunggu apa pun.
    //    Ini memastikan user tidak pernah melihat halaman kosong.
    setDefaultMenu();
    safeRenderMenu();

    // 2) Baru setelah itu, coba ambil menu terbaru dari Google Sheet.
    //    Kalau gagal/timeout/data rusak, menu default di atas TETAP tampil
    //    (lihat loadMenuFromSheet & safeRenderMenu di menu.js untuk detail
    //    proteksinya).
    await loadMenuFromSheet();
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
