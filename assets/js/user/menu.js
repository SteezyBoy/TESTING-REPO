// ========================================================
// FILE: assets/js/user/menu.js (SAFE VERSION)
// ========================================================

async function loadMenuFromSheet() {
    // Memastikan API URL tersedia
    const url = (typeof getAppsScriptUrl === 'function') ? getAppsScriptUrl() : null;
    if (!url || url.includes("PASTE")) {
        setDefaultMenu();
        return;
    }
    
    try {
        const res = await fetch(url + "?action=getMenu");
        const data = await res.json();
        if (data && data.menu) {
            // Transformasi data agar sesuai dengan struktur internal
            menuData = { makanan: [], minuman: [], dessert: [] };
            data.menu.forEach(item => {
                const cat = (item.category || "").toLowerCase();
                const key = (cat.includes("minuman") || cat.includes("beverage")) ? "minuman" : 
                            (cat.includes("dessert")) ? "dessert" : "makanan";
                menuData[key].push(item);
            });
        } else {
            setDefaultMenu();
        }
    } catch (e) {
        setDefaultMenu();
    }
}

function setDefaultMenu() {
    if (typeof DEFAULT_MENU_DATA !== "undefined") {
        menuData = JSON.parse(JSON.stringify(DEFAULT_MENU_DATA));
    }
}

function renderMenu() {
    // 1. Ambil data dengan aman
    const list = document.getElementById("menu-list");
    if (!list) return;

    // 2. Tentukan item berdasarkan kategori
    let items = [];
    if (typeof currentCategory === "undefined" || currentCategory === "all") {
        items = [...(menuData.makanan || []), ...(menuData.minuman || []), ...(menuData.dessert || [])];
    } else {
        items = menuData[currentCategory] || [];
    }

    // 3. Filter Aman
    items = items.filter(i => i.available !== false);

    // 4. Render dengan Error Handling
    list.innerHTML = "";
    items.forEach(item => {
        const card = document.createElement("div");
        card.className = "menu-card";
        // Menggunakan string murni untuk menghindari error fungsi yang tidak terdefinisi
        card.innerHTML = `
            <h3>${item.name || 'Menu'}</h3>
            <p>${item.price || 0}</p>
            <button onclick="console.log('Clicked ${item.name}')">Add to Cart</button>
        `;
        list.appendChild(card);
    });
}

// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
    if (typeof menuData === "undefined") setDefaultMenu();
    renderMenu();
});
