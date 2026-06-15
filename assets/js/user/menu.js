// --- DEKLARASI AMAN (Mencegah ReferenceError: menuData is not defined) ---
window.menuData = window.menuData || { makanan: [], minuman: [], dessert: [] };
window.currentCategory = window.currentCategory || 'all';
window.currentSearchKeyword = window.currentSearchKeyword || '';

// --- FUNGSI FORMAT HARGA AMAN ---
function formatPrice(price) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price || 0);
}

// --- FUNGSI UTAMA RENDER ---
async function renderMenu() {
    const menuList = document.getElementById("menu-list");
    if (!menuList) return;

    // Ambil data berdasarkan kategori
    let items = [];
    const cat = window.currentCategory.toLowerCase();
    
    if (cat === 'all') {
        items = [...(menuData.makanan || []), ...(menuData.minuman || []), ...(menuData.dessert || [])];
    } else {
        items = menuData[cat] || [];
    }

    // Filter Ketersediaan & Pencarian
    items = items.filter(i => i.available !== false);
    if (window.currentSearchKeyword) {
        items = items.filter(i => i.name.toLowerCase().includes(window.currentSearchKeyword.toLowerCase()));
    }

    // Render HTML
    menuList.innerHTML = items.length > 0 ? "" : '<p style="text-align:center; padding:20px;">Menu sedang tidak tersedia</p>';
    
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'menu-card';
        div.innerHTML = `
            <img src="${item.image || ''}" onerror="this.src='data:image/svg+xml,...'" style="width:100%; height:150px; object-fit:cover;">
            <h3>${item.name || 'Menu'}</h3>
            <p>${formatPrice(item.price)}</p>
            <button onclick="alert('Item ditambahkan')">Tambah</button>
        `;
        menuList.appendChild(div);
    });
}

// --- INISIALISASI ---
document.addEventListener('DOMContentLoaded', () => {
    // Jika API belum load, gunakan data default dari default-menu.js jika ada
    if (typeof DEFAULT_MENU_DATA !== 'undefined') {
        window.menuData = JSON.parse(JSON.stringify(DEFAULT_MENU_DATA));
    }
    renderMenu();
});
