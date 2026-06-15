// ==========================================
// FILE: assets/js/user/menu.js
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initMenu();
});

let currentMenuData = {}; // Tempat menyimpan data menu aktif

// 1. Fungsi Utama untuk Inisialisasi Data
async function initMenu() {
    showLoading(true);
    try {
        // Coba ambil data dari API (Pastikan API_URL ada di config.js)
        const response = await fetch(API_URL + "?action=getMenu");
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        // Validasi apakah data dari API benar-benar ada isinya
        if (data && Object.keys(data).length > 0) {
            currentMenuData = data;
        } else {
            throw new Error("Data API kosong");
        }
    } catch (error) {
        console.warn("API Gagal atau tidak dapat diakses. Menggunakan Default Menu.", error);
        
        // Sistem Fallback: Gunakan data dari assets/js/shared/default-menu.js
        if (typeof defaultMenu !== 'undefined') {
            currentMenuData = defaultMenu;
        } else {
            console.error("KRITIKAL: File default-menu.js tidak ditemukan atau gagal dimuat.");
        }
    } finally {
        showLoading(false);
        renderMenu('ALL'); // Render semua menu saat pertama kali halaman dimuat
        setupCategoryFilters();
    }
}

// 2. Fungsi untuk Menampilkan Menu ke Layar
function renderMenu(category) {
    // Pastikan ID ini sesuai dengan yang ada di index.html Anda
    const menuContainer = document.getElementById('menu-container'); 
    const emptyState = document.getElementById('empty-state'); 

    if (!menuContainer) return;
    menuContainer.innerHTML = ''; // Bersihkan kontainer sebelum render ulang

    let itemsToRender = [];

    // LOGIKA PERBAIKAN BUG: Penanganan khusus untuk kategori "ALL"
    if (category === 'ALL') {
        // Menggabungkan semua array dari setiap kategori menjadi satu array utuh
        for (const cat in currentMenuData) {
            if (Array.isArray(currentMenuData[cat])) {
                itemsToRender = itemsToRender.concat(currentMenuData[cat]);
            }
        }
    } else {
        // Ambil data berdasarkan kategori spesifik (FOOD, DESSERT, dll)
        itemsToRender = currentMenuData[category] || [];
    }

    // Tampilkan Empty State jika data kosong (seperti pada gambar)
    if (itemsToRender.length === 0) {
        if (emptyState) emptyState.style.display = 'flex'; // atau 'block'
        menuContainer.style.display = 'none';
        return;
    }

    // Sembunyikan Empty State jika data tersedia
    if (emptyState) emptyState.style.display = 'none';
    menuContainer.style.display = 'grid'; // Sesuaikan dengan layout CSS Anda

    // Render HTML untuk setiap item menu
    itemsToRender.forEach(item => {
        // Fallback gambar jika gambar error atau kosong
        const imgSrc = item.image ? item.image : 'assets/images/placeholder.jpg';
        
        const menuItemHTML = `
            <div class="menu-card" data-id="${item.id || item.name}">
                <div class="menu-image">
                    <img src="${imgSrc}" alt="${item.name}" onerror="this.src='assets/images/placeholder.jpg'">
                </div>
                <div class="menu-info">
                    <h3 class="menu-title">${item.name}</h3>
                    <p class="menu-price">${formatRupiah(item.price)}</p>
                    <button class="add-to-cart-btn" onclick="addToCart(${item.id || `'${item.name}'`})">
                        Tambah
                    </button>
                </div>
            </div>
        `;
        menuContainer.insertAdjacentHTML('beforeend', menuItemHTML);
    });
}

// 3. Fungsi untuk Mengelola Tombol Kategori
function setupCategoryFilters() {
    // Pastikan class ini sesuai dengan class tombol di HTML Anda (misal: class="category-btn")
    const filterButtons = document.querySelectorAll('.category-btn'); 
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Hapus status aktif dari semua tombol
            filterButtons.forEach(b => b.classList.remove('active'));
            
            // Tambahkan status aktif pada tombol yang sedang diklik
            e.currentTarget.classList.add('active');

            // Ambil kategori dari atribut data (misal: data-category="FOOD")
            // Jika atribut Anda bernama lain, sesuaikan bagian ini.
            const selectedCategory = e.currentTarget.getAttribute('data-category') || 
                                     e.currentTarget.textContent.trim().toUpperCase();
            
            renderMenu(selectedCategory);
        });
    });
}

// 4. Utility Functions (Opsional, pastikan ini tidak bentrok dengan utils.js Anda)
function showLoading(isLoading) {
    const loader = document.getElementById('loading-spinner'); // Sesuaikan ID
    if (loader) {
        loader.style.display = isLoading ? 'block' : 'none';
    }
}

// Format harga (Bisa dihapus jika sudah ada di utils.js)
function formatRupiah(angka) {
    if (!angka) return "Rp 0";
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka);
}
