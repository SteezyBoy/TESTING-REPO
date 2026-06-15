async function sendOrderAndMonitor() {
    if (!tableNumber) {
        showShareToast("❌ Table number not found. Please scan table QR code.");
        return;
    }
    if (cart.length === 0) {
        showShareToast("Cart is empty!");
        return;
    }
    const sendBtn = document.querySelector("#order-summary-screen .send-order-btn");
    if (sendBtn) { sendBtn.innerText = "⏳ Sending..."; sendBtn.disabled = true; }
    try {
        let result;
        const activeCheck = await getActiveOrderByTable(tableNumber);
        if (activeCheck.status === "ok" && activeCheck.orderId) {
            result = await addItemsToOrder({
                orderId: activeCheck.orderId,
                tableNumber: tableNumber,
                items: cart.map(item => ({
                    name: item.name, qty: item.quantity, price: item.price, notes: item.notes || ""
                }))
            });
            if (result.status === "ok") result.orderId = activeCheck.orderId;
        } else {
            result = await submitNewOrder({
                tableNumber: tableNumber,
                items: cart.map(item => ({
                    name: item.name, qty: item.quantity, price: item.price, notes: item.notes || ""
                }))
            });
        }
        if (result.status === "ok") {
            activeOrderId = result.orderId;
            localStorage.setItem(STORAGE_KEYS.activeOrderId, activeOrderId);
            cart = [];
            saveCartToLocal();
            updateCartBadge();
            const statusFab = document.getElementById("orderStatusFab");
            if (statusFab) statusFab.style.display = "flex";
            closeCart();
            setTimeout(() => openOrderStatus(), 400);
            showSuccessPopup("✅ Order sent! Please wait.");
        } else {
            showShareToast("Failed to send order. Try again.");
        }
    } catch (err) {
        console.error(err);
        showShareToast("Network error. Try again.");
    } finally {
        if (sendBtn) { sendBtn.innerText = "✅ Send Order"; sendBtn.disabled = false; }
    }
}

async function openOrderStatus() {
    if (!activeOrderId) {
        showShareToast("No active order.");
        return;
    }
    if (monitorInterval) clearInterval(monitorInterval);
    _showScreen("order-status-screen");
    document.getElementById("cartModal").style.display = "block";
    await loadOrderStatus();
    monitorInterval = setInterval(() => {
        if (activeOrderId) loadOrderStatus();
        else clearInterval(monitorInterval);
    }, 5000);
}

async function loadOrderStatus() {
    if (!activeOrderId) return;
    try {
        const data  = await fetchOrderById(activeOrderId);
        const order = data.order;
        const container = document.getElementById("status-items-list");
        const totalEl   = document.getElementById("status-total");
        const headerEl  = document.getElementById("status-order-id");
        if (!order || !order.items || order.items.length === 0) {
            if (container) container.innerHTML = '<div class="empty-msg">Order not found.</div>';
            return;
        }
        if (headerEl) headerEl.innerHTML = `Order ID: <strong>${order.id}</strong> &nbsp;•&nbsp; 🪑 Table ${order.table || tableNumber}`;
        if (totalEl)  totalEl.innerHTML  = formatPrice(order.total);
        let html = "";
        order.items.forEach(item => {
            let statusText = "⏳ Waiting";
            let statusClass = "status-waiting";
            const s = (item.status || "").toLowerCase();
            if (s === "diproses")     { statusText = "🍳 Food is being prepared"; statusClass = "status-diproses"; }
            else if (s === "diantar") { statusText = "🛵 Enjoy your meal"; statusClass = "status-diantar"; }
            else if (s === "selesai") { statusText = "✅ Completed"; statusClass = "status-selesai"; }
            html += `
            <div class="status-item-row">
                <div class="status-item-info">
                    <span class="status-item-qty">${item.qty}×</span>
                    <span class="status-item-name">${item.name}</span>
                    ${item.notes && item.notes !== "-" ? `<span class="status-item-note">📝 ${item.notes}</span>` : ""}
                </div>
                <div class="status-item-right">
                    <span class="status-item-price">${formatPrice(item.subtotal)}</span>
                    <span class="item-status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>`;
        });
        if (container) container.innerHTML = html;
        const allDelivered = order.items.every(i => ["diantar","selesai"].includes((i.status||"").toLowerCase()));
        const payBtn = document.getElementById("statusPayBtn");
        if (payBtn) payBtn.style.display = allDelivered ? "block" : "none";
    } catch (err) {
        console.error("Failed to load status:", err);
    }
}

function closeOrderStatus() {
    if (monitorInterval) clearInterval(monitorInterval);
    stopCashierPaymentPoll();
    document.getElementById("cartModal").style.display = "none";
}

function showPaymentOptions() {
    if (!activeOrderId) { showShareToast("No active order."); return; }
    openReviewPaymentModal();
}

async function openReviewPaymentModal() {
    if (!activeOrderId) return;
    try {
        const data = await fetchOrderById(activeOrderId);
        const order = data.order;
        if (!order || !order.items) return;
        const container = document.getElementById("reviewPaymentItems");
        container.innerHTML = "";
        let total = 0;
        order.items.forEach(item => {
            total += item.subtotal;
            container.innerHTML += `
            <div class="summary-item">
                <div class="summary-item-left">
                    <span class="summary-item-qty">${item.qty}×</span>
                    <span class="summary-item-name">${item.name}</span>
                    ${item.notes && item.notes !== "-" ? `<span class="summary-item-note">📝 ${item.notes}</span>` : ''}
                </div>
                <span class="summary-item-price">${formatPrice(item.subtotal)}</span>
            </div>`;
        });
        document.getElementById("reviewPaymentTotal").innerText = formatPrice(total);
        _showScreen("review-payment-screen");
    } catch(e) { showShareToast("Failed to load order details."); }
}

function hideReviewPayment() {
    _showScreen("order-status-screen");
}

function proceedToPaymentChoice() {
    document.getElementById("paymentChoiceModal").style.display = "flex";
}

function closePaymentChoiceModal() {
    document.getElementById("paymentChoiceModal").style.display = "none";
}

async function payWithQRIS() {
    closePaymentChoiceModal();
    try {
        await setPaymentMethodQris(activeOrderId);
    } catch(e) {}
    _showScreen("payment-screen");
    stopCashierPaymentPoll();
    const data = await fetchOrderById(activeOrderId).catch(()=>({order:null}));
    const total = data.order ? formatPrice(data.order.total) : "—";
    document.getElementById("payTotalInfo").innerHTML  = `💰 Total: <strong>${total}</strong>`;
    document.getElementById("payTableInfo").innerHTML  = `🪑 Table: <strong>${tableNumber || "—"}</strong>`;
    const now = new Date();
    document.getElementById("payTimeInfo").innerHTML   = `🕐 ${now.toLocaleString("en-US",{dateStyle:"medium",timeStyle:"short"})}`;
    document.getElementById("payOrderId").innerHTML    = `Order ID: ${activeOrderId}`;
}

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
        showShareToast("Network error.");
    }
}

async function payWithCashier() {
    closePaymentChoiceModal();
    if (!activeOrderId) return;
    try {
        const result = await setPaymentMethodCashier(activeOrderId);
        if (result.status !== "ok") { showShareToast("Failed to process cashier payment."); return; }
        openCashierWaitScreen();
        startCashierPaymentPoll();
    } catch (err) {
        console.error(err);
        showShareToast("Network error. Try again.");
    }
}

function openCashierWaitScreen() {
    if (monitorInterval) clearInterval(monitorInterval);
    _showScreen("cashier-wait-screen");
    document.getElementById("cartModal").style.display = "block";
    document.getElementById("cashierWaitOrderId").innerHTML = `Order ID: ${activeOrderId}`;
    document.getElementById("cashierWaitStatus").innerHTML  = "⏳ Waiting for cashier payment confirmation...";
    fetchOrderById(activeOrderId).then(data => {
        if (data.order && data.order.total)
            document.getElementById("cashierWaitTotal").innerHTML = formatPrice(data.order.total);
    }).catch(()=>{});
}

function startCashierPaymentPoll() {
    stopCashierPaymentPoll();
    checkCashierPaymentStatus();
    cashierPollInterval = setInterval(checkCashierPaymentStatus, 3000);
}
function stopCashierPaymentPoll() {
    if (cashierPollInterval) { clearInterval(cashierPollInterval); cashierPollInterval = null; }
}

async function checkCashierPaymentStatus() {
    if (!activeOrderId) return;
    try {
        const data  = await fetchOrderById(activeOrderId);
        const order = data.order;
        if (!order) return;
        if (order.paymentStatus === "Lunas") {
            stopCashierPaymentPoll();
            document.getElementById("cashierWaitStatus").innerHTML = "✅ Payment confirmed!";
            finalizePaymentAndClose();
        }
    } catch (err) { console.error("Failed to check payment status:", err); }
}

function finalizePaymentAndClose() {
    stopCashierPaymentPoll();
    clearTableSession();
    activeOrderId = null;
    const fab = document.getElementById("orderStatusFab");
    if (fab) fab.style.display = "none";
    _showScreen("cart-screen");
    document.getElementById("cartModal").style.display = "none";
    showSuccessPopup("✅ Payment successful! Thank you.");
    setTimeout(() => location.reload(), 1800);
}

function backToOrderStatus() {
    _showScreen("order-status-screen");
}

function _showScreen(id) {
    const screens = ["cart-screen","order-summary-screen","payment-screen","cashier-wait-screen","order-status-screen","review-payment-screen"];
    screens.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = (s === id) ? "block" : "none";
    });
}

async function resumeActiveOrderIfNeeded() {
    if (!activeOrderId) return;
    try {
        const data  = await fetchOrderById(activeOrderId);
        const order = data.order;
        if (!order) { activeOrderId = null; localStorage.removeItem(STORAGE_KEYS.activeOrderId); return; }
        document.getElementById("orderStatusFab").style.display = "flex";
        if (order.paymentStatus === "Menunggu Kasir") {
            openCashierWaitScreen();
            startCashierPaymentPoll();
        }
    } catch(e) { console.warn("resumeActiveOrderIfNeeded:", e); }
}