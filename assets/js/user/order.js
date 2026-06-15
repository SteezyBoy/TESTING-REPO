if (result.status === "ok") {
    activeOrderId = result.orderId;
    localStorage.setItem(
        STORAGE_KEYS.activeOrderId,
        activeOrderId
    );

    cart = [];
