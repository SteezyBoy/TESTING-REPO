// --- FUNGSI PEMBANTU (Mencegah ReferenceError) ---
if (typeof formatPrice !== 'function') {
    window.formatPrice = function(val) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
    };
}

// --- LOGIKA UTAMA ---
async function renderMenu() {
    const menuList = document.getElementById("menu-list");
    if (!menuList) return;

    // Pastikan menuData sudah ada
    if (typeof menuData === 'undefined') {
        console.error("menuData tidak ditemukan!");
        return;
    }

    // Ambil semua item dari semua kategori jika "all"
    let items = [];
    const cat = (typeof currentCategory === 'undefined') ? 'all' : currentCategory;
    
    if (cat === 'all') {
        items = [...(menuData.makanan || []), ...(menuData.minuman || []), ...(menuData.dessert || [])];
    } else {
        items = menuData[cat] || [];
    }

    menuList.innerHTML = "";
    
    if (items.length === 0) {
        menuList.innerHTML = '<p style="text-align:center; padding:20px;">Menu sedang tidak tersedia</p>';
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'menu-card';
        div.innerHTML = `
            <img src="${item.image || ''}" onerror="this.src='data:image/svg+xml,...'" style="width:100%; height:150px; object-fit:cover;">
            <h3>${item.name || 'Menu'}</h3>
            <p>${formatPrice(item.price || 0)}</p>
            <button onclick="console.log('Added ${item.name}')">Tambah</button>
        `;
        menuList.appendChild(div);
    });
}

// Inisialisasi sederhana tanpa dependensi rumit
document.addEventListener('DOMContentLoaded', () => {
    // Paksa load menu agar muncul
    if (typeof loadMenuFromSheet === 'function') {
        loadMenuFromSheet().then(() => renderMenu());
    } else {
        renderMenu();
    }
});
