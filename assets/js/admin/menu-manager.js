// assets/js/admin/menu-manager.js - tambah notifikasi sync
async function syncMenuToSheets() {
    if (!getAdminScriptUrl()) return;
    try {
        const allItems = getAllAdminItems().map(i => ({
            category: i._cat, name: i.name, price: i.price,
            desc: i.desc, image: i.image, bestSeller: i.bestSeller,
            available: i.available !== false
        }));
        const result = await syncMenuToApi(allItems);
        if (result.status === "ok") {
            showAdminToast("✅ Menu synced to sheets!");
        } else {
            showAdminToast("❌ Sync failed: " + (result.message || "Unknown error"));
        }
    } catch (e) { 
        console.warn("Failed to sync menu:", e);
        showAdminToast("❌ Sync error: " + e.message);
    }
}