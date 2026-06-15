// --- SISTEM MENU INDEPENDENT RUNNER ---

// Memastikan menuData selalu ada sebagai objek aman
window.menuData = window.menuData || { makanan: [], minuman: [], dessert: [] };

async function safeRenderMenu() {
    const container = document.getElementById("menu-list");
    if (!container) return;

    // 1. Data Retrieval: Mengambil data dari variabel global (yang diisi oleh init.js)
    // Jika menuData kosong, paksa gunakan DEFAULT_MENU_DATA dari default-menu.js
    let activeData = window.menuData;
    if ((!activeData.makanan.length && !activeData.minuman.length) && typeof DEFAULT_MENU_DATA !== 'undefined') {
        activeData = DEFAULT_MENU_DATA;
    }

    // 2. Filter Kategori (Mencegah error 'all')
    const cat = (typeof window.currentCategory === 'undefined' || window.currentCategory === 'all') 
                ? 'all' : window.currentCategory.toLowerCase();
    
    let items = [];
    if (cat === 'all') {
        items = [...(activeData.makanan || []), ...(activeData.minuman || []), ...(activeData.dessert || [])];
    } else {
        items = activeData[cat] || [];
    }

    // 3. Render Aman
    container.innerHTML = "";
    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align:center; padding: 40px;">
                <p>Menu belum tersedia saat ini.</p>
            </div>`;
        return;
    }

    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "menu-card";
        div.innerHTML = `
            <img src="${item.image}" onerror="this.src='data:image/svg+xml,...'" style="width:100%">
            <h3>${item.name}</h3>
            <p>${item.price}</p>
        `;
        container.appendChild(div);
    });
}

// Inisialisasi mandiri
window.addEventListener('load', () => {
    setTimeout(safeRenderMenu, 500); // Tunggu semua script lain selesai loading
});
