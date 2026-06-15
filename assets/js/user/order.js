// assets/js/user/order.js - Perbaikan polling cashier
// (potongan yang perlu diubah, sisanya sama)

// Tambahkan fungsi stopCashierPaymentPoll di luar jika belum ada
function stopCashierPaymentPoll() {
    if (cashierPollInterval) { 
        clearInterval(cashierPollInterval); 
        cashierPollInterval = null; 
    }
}

// Perbaiki closeCashierWaitScreen
function closeCashierWaitScreen() {
    stopCashierPaymentPoll(); // ini penting
    document.getElementById("cashier-wait-screen").style.display = "none";
    document.getElementById("cartModal").style.display = "none";
    // Jika perlu kembali ke status order, bisa ditambahkan
}

// Pastikan startCashierPaymentPoll menggunakan interval yang sama
function startCashierPaymentPoll() {
    stopCashierPaymentPoll(); // bersihkan dulu
    cashierPollInterval = setInterval(checkCashierPaymentStatus, 3000);
}

// Perbaiki checkCashierPaymentStatus agar tidak error jika order hilang
async function checkCashierPaymentStatus() {
    if (!activeOrderId) {
        stopCashierPaymentPoll();
        return;
    }
    try {
        const data  = await fetchOrderById(activeOrderId);
        const order = data.order;
        if (!order) {
            // order tidak ditemukan, hentikan polling
            stopCashierPaymentPoll();
            return;
        }
        if (order.paymentStatus === "Lunas") {
            stopCashierPaymentPoll();
            document.getElementById("cashierWaitStatus").innerHTML = "✅ Payment confirmed!";
            finalizePaymentAndClose();
        }
    } catch (err) { 
        console.error("Failed to check payment status:", err);
        // jangan hentikan polling, coba lagi nanti
    }
}

// Perbaiki finalizeQrisPayment agar tidak error
async function finalizeQrisPayment() {
    if (!activeOrderId) return;
    try {
        const result = await finalizeQrisPayment(activeOrderId);
        if (result.status === "ok") {
            clearTableSession();
            activeOrderId = null;
            const fab = document.getElementById("orderStatusFab");
            if (fab) fab.style.display = "none";
            _showScreen("cart-screen");
            document.getElementById("cartModal").style.display = "none";
            showSuccessPopup("✅ Payment successful! Thank you.");
            setTimeout(() => location.reload(), 1800);
        } else {
            showShareToast("Payment failed. Try again.");
        }
    } catch(e) {
        console.error(e);
        showShareToast("Network error.");
    }
}