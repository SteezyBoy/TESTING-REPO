// ==========================================
// FILE: assets/js/user/menu.js
// ==========================================

async function loadMenuFromSheet() {
    const url = typeof getAppsScriptUrl === 'function' ? getAppsScriptUrl() : null;
    
    if (!url || url === "PASTE_YOUR_APPS_SCRIPT_URL_HERE") {
        console.warn("Apps Script URL not set, using default menu");
        setDefaultMenu();
        return;
    }
    
    try {
        const res = await fetch(url + "?action=getMenu");
        const text = await res.text();
        let data;
        
        try {
            data = JSON.parse(text);
        } catch(parseErr) {
            console.error("API response bukan JSON valid, pakai default menu. Response:", text.substring(0, 200));
            setDefaultMenu();
            return;
        }
        
        if (data && data.menu && Array.isArray(data.menu) && data.menu.length > 0) {
            const newMenu = { makanan: [], minuman: [], dessert: [] };
            
            data.menu.forEach(item => {
                const cat = (item.category || "").toLowerCase().trim();
                let categoryKey = "makanan"; // Default fallback
                
                if (cat === "minuman" || cat === "beverage" || cat === "drink" || cat === "drinks") {
                    categoryKey = "minuman";
                } else if (cat === "dessert" || cat === "desserts" || cat === "penutup") {
                    categoryKey = "dessert";
                }
                
                newMenu[categoryKey].push({
                    name: item.name || "Unnamed Item",
                    category: item.category || "General",
                    bestSeller: item.bestSeller === true || item.bestSeller === "TRUE",
                    image: item.image || "assets/images/placeholder.jpg",
                    desc: item.desc || "",
                    price: Number(item.price) || 0,
                    available: item.available !== false && item.available !== "FALSE" && item.available !== "false"
                });
            });
            
            const totalItems = newMenu.makanan.length + newMenu.minuman.length + newMenu.dessert.length;
            
            if (totalItems > 0) {
                menuData = newMenu;
                console.log("Menu loaded from API:", totalItems, "items");
            } else {
                console.warn("API menu ada tapi 0 item valid, pakai default");
                setDefaultMenu();
            }
        } else {
            console.warn("API menu kosong atau tidak valid, pakai default.");
            setDefaultMenu();
        }
    } catch (err) {
        console.error("Gagal fetch menu dari API, pakai default:", err);
        setDefaultMenu();
    }
}

function setDefaultMenu() {
    if (typeof DEFAULT_MENU_DATA !== "undefined") {
        // Melakukan deep copy agar data asli tidak termodifikasi
        menuData = JSON.parse(JSON.stringify(DEFAULT_MENU_DATA));
        console.log("Default menu loaded successfully.");
    } else {
        console.error("KRITIKAL: DEFAULT_MENU_DATA tidak tersedia!");
        menuData = { makanan: [], minuman: [], dessert: [] };
    }
}

function getFilteredAndSortedItems() {
    // 1. NORMALISASI KATEGORI (Mencegah bug ALL vs all)
    const cat = (typeof currentCategory !== "undefined" && currentCategory) ? currentCategory.toLowerCase() : "all";
    
    let items = [];
    
    // 2. EKSTRAKSI AMAN DARI menuData
    if (typeof menuData !== "undefined" && menuData !== null) {
        if (cat === "all") {
            for (const key in menuData) {
                if (Array.isArray(menuData[key])) {
                    items = items.concat(menuData[key]);
                }
            }
        } else {
            items = Array.isArray(menuData[cat]) ? [...menuData[cat]] : [];
        }
    }

    // 3. FAILSAFE (ANTI-GAGAL): Jika array tetap kosong, paksa tarik dari DEFAULT_MENU_DATA
    if (items.length === 0 && typeof DEFAULT_MENU_DATA !== "undefined") {
        console.warn("Data kosong, memaksa fallback ke DEFAULT_MENU_DATA");
        if (cat === "all") {
            for (const key in DEFAULT_MENU_DATA) {
                if (Array.isArray(DEFAULT_MENU_DATA[key])) {
                    items = items.concat(DEFAULT_MENU_DATA[key]);
                }
            }
        } else {
            items = Array.isArray(DEFAULT_MENU_DATA[cat]) ? [...DEFAULT_MENU_DATA[cat]] : [];
        }
    }

    // 4. FILTER KETERSEDIAAN (Hanya sembunyikan jika secara eksplisit "false")
    items = items.filter(item => {
        if (item.available === false || item.available === "FALSE" || item.available === "false") {
            return false;
        }
        return true;
    });
    
    // 5. FILTER PENCARIAN
    if (typeof currentSearchKeyword !== "undefined" && currentSearchKeyword.trim() !== "") {
        const keyword = currentSearchKeyword.toLowerCase().trim();
        items = items.filter(item => item.name && item.name.toLowerCase().includes(keyword));
    }
    
    // 6. SORTING MENU
    const sortSelect = document.getElementById("sortMenu");
    const sortValue = sortSelect ? sortSelect.value : "";
    
    if (sortValue === "az") items.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortValue === "za") items.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortValue === "low") items.sort((a, b) => a.price - b.price);
    else if (sortValue === "high") items.sort((a, b) => b.price - a.price);
    
    return items;
}

function renderMenu() {
    const items = getFilteredAndSortedItems();
    const menuList = document.getElementById("menu-list");
    
    if (!menuList) return;
    
    menuList.innerHTML = "";
    
    // Tampilkan Empty State hanya jika data benar-benar kosong setelah melewati Failsafe
    if (items.length === 0) {
        if (typeof currentSearchKeyword !== "undefined" && currentSearchKeyword.trim() !== "") {
            showEmptyState(currentSearchKeyword);
        } else {
            showEmptyCategoryState();
        }
        return;
    }
    
    // Render item menu
    items.forEach((item, index) => {
        // Amankan string nama agar tidak merusak fungsi onclick saat ada tanda kutip tunggal
        const safeName = item.name ? item.name.replace(/'/g, "\\'") : "Unknown";
        const card = document.createElement("div");
        
        card.className = "menu-card";
        card.style.animationDelay = `${index * 0.06}s`;
        
        const imgSrc = item.image || "assets/images/placeholder.jpg";
        const descText = item.desc || "";
        const formattedPrice = typeof formatPrice === "function" ? formatPrice(item.price) : "Rp " + item.price;
        
        card.innerHTML = `
            <div class="image-wrapper">
                ${item.bestSeller ? `<div class="best-seller">🔥 BEST SELLER</div>` : ''}
                <img src="${imgSrc}" alt="${safeName}" loading="lazy" class="menu-img"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22240%22><rect fill=%22%23f1f5f9%22 width=%22400%22 height=%22240%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2240%22>🍽️</text></svg>'">
            </div>
            <div class="menu-info">
                <div class="food-tag">${item.category || "Menu"}</div>
                <h3>${item.name || "Unnamed Item"}</h3>
                <div class="price">${formattedPrice}</div>
                <p>${descText.substring(0, 80)}${descText.length > 80 ? '...' : ''}</p>
                <div class="card-actions">
                    <button class="detail-btn" onclick="openModalByName('${safeName}')">View Details</button>
                    ${item.available !== false && item.available !== "FALSE" && item.available !== "false" ? 
                        `<button class="add-to-cart-btn" onclick="openQuickAddPopup('${safeName}')">+ Add To Cart</button>` : 
                        '<button class="add-to-cart-btn" style="background:#64748b;cursor:not-allowed;" disabled>❌ Out of Stock</button>'}
                </div>
            </div>`;
        menuList.appendChild(card);
    });
}

function showEmptyState(keyword) {
    const menuList = document.getElementById("menu-list");
    menuList.innerHTML = `
    <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>Menu tidak ditemukan</h3>
        <p>Tidak ada hasil untuk "<strong>${keyword}</strong>"</p>
        <button class="empty-state-btn" onclick="clearSearch()">Clear Search</button>
    </div>`;
}

function showEmptyCategoryState() {
    const menuList = document.getElementById("menu-list");
    menuList.innerHTML = `
    <div class="empty-state">
        <div class="empty-state-icon">🍽️</div>
        <h3>Menu sedang tidak tersedia</h3>
        <p>Silakan pilih kategori lain atau hubungi staf kami.</p>
    </div>`;
}

function clearSearch() {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.value = "";
    if (typeof currentSearchKeyword !== "undefined") {
        currentSearchKeyword = "";
    }
    renderMenu();
}

function searchMenu() { 
    const searchInput = document.getElementById("searchInput");
    if (typeof currentSearchKeyword !== "undefined") {
        currentSearchKeyword = searchInput ? searchInput.value : ""; 
    }
    renderMenu(); 
}

function sortMenu() { 
    renderMenu(); 
}

function changeCategory(btn, category) {
    document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    // Simpan kategori baru
    if (typeof currentCategory !== "undefined") {
        currentCategory = category;
    }
    
    if (typeof currentSearchKeyword !== "undefined") {
        currentSearchKeyword = "";
    }
    
    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.value = "";
    
    if (typeof showSkeletonLoading === "function") {
        showSkeletonLoading();
    }
    
    setTimeout(() => renderMenu(), 400);
}
