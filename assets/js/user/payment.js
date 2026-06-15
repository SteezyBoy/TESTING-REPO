function closeCashierWaitScreen() {
    stopCashierPaymentPoll();
    document.getElementById("cashier-wait-screen").style.display = "none";
    document.getElementById("cartModal").style.display = "none";
}