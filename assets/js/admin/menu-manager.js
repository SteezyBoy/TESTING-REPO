// assets/js/admin/menu-manager.js - render, CRUD, dan sync menu ke Sheets

// ====================================================================
// Helper: gabungkan semua item dari adminMenuData jadi 1 array flat,
// masing-masing item dibubuhi _cat (kategori utama) supaya bisa
// dikirim balik ke kategori yang benar saat sync / edit.
// ====================================================================
function getAllAdminItems() {
    const result = [];
    ["makanan", "minuman", "dessert"].forEach(catKey => {
        (adminMenuData[catKey] || []).forEach((item, idx) => {
            result.push({ ...item, _cat: catKey, _idx: idx });
        });
    });
    return result;
}

// ====================================================================
// Render daftar menu di panel admin
// ====================================================================
function renderAdminMenuList() {
    const container = document.getElementById("menu-list-admin");
    const countEl    = document.getElementById("menuCount");
    if (!container) return;

    const items = getAllAdminItems();
    if (countEl) countEl.textContent = items.length;

    if (items.length === 0) {
        container.innerHTML = `<div style="text-align:center;color:var(--muted);padding:30px;">Belum ada menu. Klik "+ Add Item" untuk menambahkan.</div>`;
        return;
    }

    const catLabel = { makanan: "🍛 Food", minuman: "🥤 Beverage", dessert: "🍨 Dessert" };

    container.innerHTML = items.map(item => `
        <div class="admin-menu-card" style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border,#e2e8f0);border-radius:10px;margin-bottom:10px;">
            <img src="${item.image || ''}" alt="${item.name}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;background:#f1f5f9;"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2256%22 height=%2256%22><rect fill=%22%23f1f5f9%22 width=%2256%22 height=%2256%22/></svg>'">
            <div style="flex:1;min-width:0;">
                <div style="font-weight:600;">${item.name} ${item.bestSeller ? '🔥' : ''} ${item.available === false ? '<span style="color:#ef4444;font-size:12px;">(Out of Stock)</span>' : ''}</div>
                <div style="font-size:13px;color:var(--muted);">${catLabel[item._cat] || item._cat} ${item.category ? '· ' + item.category : ''} · ${formatPrice(item.price)}</div>
            </div>
            <button class="filter-btn" onclick="editMenuItem('${item._cat}', ${item._idx})">✏️ Edit</button>
            <button class="filter-btn" onclick="deleteMenuItem('${item._cat}', ${item._idx})" style="color:#ef4444;">🗑️</button>
        </div>
    `).join("");
}

// ====================================================================
// Modal: open untuk Add baru
// ====================================================================
function openAddMenu() {
    editingMenuIndex = null;
    document.getElementById("menuModalTitle").textContent = "➕ Add Menu Item";
    document.getElementById("fName").value = "";
    document.getElementById("fPrice").value = "";
    document.getElementById("fCategory").value = "makanan";
    document.getElementById("fSubcat").value = "";
    document.getElementById("fDesc").value = "";
    document.getElementById("fImage").value = "";
    document.getElementById("fBestSeller").checked = false;
    document.getElementById("fOutOfStock").checked = false;
    document.getElementById("menuModal").classList.add("open");
}

// ====================================================================
// Modal: open untuk Edit item yang sudah ada
// catKey = "makanan" | "minuman" | "dessert", idx = index di array itu
// ====================================================================
function editMenuItem(catKey, idx) {
    const item = (adminMenuData[catKey] || [])[idx];
    if (!item) return;
    editingMenuIndex = { cat: catKey, idx };
    document.getElementById("menuModalTitle").textContent = "✏️ Edit Menu Item";
    document.getElementById("fName").value = item.name || "";
    document.getElementById("fPrice").value = item.price || "";
    document.getElementById("fCategory").value = catKey;
    document.getElementById("fSubcat").value = item.category || "";
    document.getElementById("fDesc").value = item.desc || "";
    document.getElementById("fImage").value = item.image || "";
    document.getElementById("fBestSeller").checked = !!item.bestSeller;
    document.getElementById("fOutOfStock").checked = item.available === false;
    document.getElementById("menuModal").classList.add("open");
}

function closeMenuModal() {
    document.getElementById("menuModal").classList.remove("open");
    editingMenuIndex = null;
}

// ====================================================================
// Simpan item (add baru atau update existing), lalu auto-sync ke Sheets
// ====================================================================
async function saveMenuItem() {
    const name      = document.getElementById("fName").value.trim();
    const price     = Number(document.getElementById("fPrice").value);
    const catKey    = document.getElementById("fCategory").value; // makanan/minuman/dessert
    const subcat    = document.getElementById("fSubcat").value.trim();
    const desc      = document.getElementById("fDesc").value.trim();
    const image     = document.getElementById("fImage").value.trim();
    const bestSeller = document.getElementById("fBestSeller").checked;
    const outOfStock = document.getElementById("fOutOfStock").checked;

    if (!name || !price) {
        showAdminToast("❌ Nama dan harga wajib diisi");
        return;
    }

    const newItem = {
        name,
        price,
        category: subcat || catKey,
        desc,
        image,
        bestSeller,
        available: !outOfStock
    };

    if (editingMenuIndex && editingMenuIndex.cat) {
        // Hapus dari kategori lama dulu (jaga-jaga kalau kategori diubah)
        adminMenuData[editingMenuIndex.cat].splice(editingMenuIndex.idx, 1);
    }
    if (!adminMenuData[catKey]) adminMenuData[catKey] = [];
    adminMenuData[catKey].push(newItem);

    closeMenuModal();
    renderAdminMenuList();
    await syncMenuToSheets();
}

// ====================================================================
// Hapus item, lalu auto-sync ke Sheets
// ====================================================================
async function deleteMenuItem(catKey, idx) {
    if (!confirm("Hapus menu ini?")) return;
    adminMenuData[catKey].splice(idx, 1);
    renderAdminMenuList();
    await syncMenuToSheets();
}

// ====================================================================
// Sync seluruh menu (adminMenuData) ke Google Sheets via Apps Script.
// category dikirim sebagai KUNCI UTAMA (makanan/minuman/dessert) supaya
// sisi user (assets/js/user/menu.js) bisa mapping balik dengan benar.
// Sub-kategori asli (Appetizer/Soup/dll) tetap disimpan di field "subcategory".
// ====================================================================
async function syncMenuToSheets() {
    if (!getAdminScriptUrl()) return;
    try {
        const allItems = getAllAdminItems().map(i => ({
            // Kunci utama (makanan/minuman/dessert) + sub-kategori digabung jadi satu string
            // dengan separator "|", supaya tetap cocok dengan kolom "Kategori" yang sudah ada
            // di Sheets (tidak perlu tambah kolom baru). Sisi user akan parsing ulang.
            category: i.category ? `${i._cat}|${i.category}` : i._cat,
            name: i.name,
            price: i.price,
            desc: i.desc,
            image: i.image,
            bestSeller: !!i.bestSeller,
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

// ====================================================================
// Load menu dari Sheets ke adminMenuData saat panel admin dibuka
// ====================================================================
async function loadAdminMenu() {
    try {
        const data = await fetchMenuFromApi();
        if (data && data.menu && Array.isArray(data.menu) && data.menu.length > 0) {
            const newMenu = { makanan: [], minuman: [], dessert: [] };
            data.menu.forEach(item => {
                const rawCat = String(item.category || "");
                const [first, second] = rawCat.split("|").map(s => s.trim());
                const cat = first.toLowerCase();
                const displayLabel = second || first;

                let categoryKey;
                if (cat === "makanan" || cat === "food") {
                    categoryKey = "makanan";
                } else if (cat === "minuman" || cat === "beverage" || cat === "drink" || cat === "drinks") {
                    categoryKey = "minuman";
                } else if (cat === "dessert" || cat === "desserts" || cat === "penutup") {
                    categoryKey = "dessert";
                } else {
                    categoryKey = "makanan";
                }
                if (item.name && item.price) {
                    newMenu[categoryKey].push({
                        name: item.name,
                        category: displayLabel,
                        bestSeller: item.bestSeller === true,
                        image: item.image || "",
                        desc: item.desc || "",
                        price: Number(item.price) || 0,
                        available: item.available !== false
                    });
                }
            });
            adminMenuData = newMenu;
        }
    } catch (e) {
        console.warn("Failed to load menu from API, using default:", e);
    }
    renderAdminMenuList();
}