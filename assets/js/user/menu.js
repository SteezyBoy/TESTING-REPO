async function loadMenuFromSheet() {
    const url = getAppsScriptUrl();
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
                let categoryKey = "makanan";
                if (cat === "minuman" || cat === "beverage" || cat === "drink" || cat === "drinks") {
                    categoryKey = "minuman";
                } else if (cat === "dessert" || cat === "desserts" || cat === "penutup") {
                    categoryKey = "dessert";
                }
                newMenu[categoryKey].push({
                    name: item.name,
                    category: item.category,
                    bestSeller: item.bestSeller === true,
                    image: item.image,
                    desc: item.desc || "",
                    price: Number(item.price) || 0,
                    available: item.available !== false
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
            console.warn("API menu kosong atau tidak valid, pakai default. data:", JSON.stringify(data).substring(0,100));
            setDefaultMenu();
        }
    } catch (err) {
        console.error("Gagal fetch menu dari API, pakai default:", err);
        setDefaultMenu();
    }
}

function setDefaultMenu() {
    // Coba gunakan DEFAULT_MENU_DATA jika ada
    if (typeof DEFAULT_MENU_DATA !== "undefined" && DEFAULT_MENU_DATA && Object.keys(DEFAULT_MENU_DATA).length > 0) {
        menuData = JSON.parse(JSON.stringify(DEFAULT_MENU_DATA));
        console.log("Default menu loaded from DEFAULT_MENU_DATA");
    } 
    // Jika tidak, gunakan FALLBACK_MENU yang sudah didefinisikan di state.js
    else if (typeof FALLBACK_MENU !== "undefined" && FALLBACK_MENU) {
        menuData = JSON.parse(JSON.stringify(FALLBACK_MENU));
        console.log("Default menu loaded from FALLBACK_MENU (state.js)");
    }
    else {
        // Fallback terakhir (hardcoded) – jaga-jaga jika kedua variabel tidak ada
        console.error("No menu data source available, using emergency fallback");
        menuData = {
            makanan: [
                { name: "Tahu Isi Goreng", category: "Appetizer", bestSeller: true, image: "images/TAHU ISI GORENG.jpeg", desc: "Tahu renyah", price: 35000, available: true },
                { name: "Nasi Goreng", category: "Main Course", bestSeller: true, image: "images/NASI GORENG KAMPUNG.jpeg", desc: "Nasi goreng spesial", price: 75000, available: true }
            ],
            minuman: [
                { name: "Es Teh", category: "Beverage", bestSeller: false, image: "images/ES TEH.jpeg", desc: "Teh manis dingin", price: 25000, available: true }
            ],
            dessert: [
                { name: "Klepon", category: "Dessert", bestSeller: true, image: "images/KLEPON.jpeg", desc: "Klepon kelapa", price: 30000, available: true }
            ]
        };
    }

    // Pastikan semua item memiliki properti available (default true)
    ["makanan", "minuman", "dessert"].forEach(cat => {
        if (menuData[cat]) {
            menuData[cat] = menuData[cat].map(item => ({ ...item, available: item.available !== false }));
        } else {
            menuData[cat] = [];
        }
    });
}

function getFilteredAndSortedItems() {
    let items = currentCategory === "all" ? getAllItems() : [...(menuData[currentCategory] || [])];
    items = items.filter(item => item.available !== false);
    if (currentSearchKeyword.trim() !== "") {
        items = items.filter(item => item.name.toLowerCase().includes(currentSearchKeyword.toLowerCase()));
    }
    const sortValue = document.getElementById("sortMenu")?.value;
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
    if (items.length === 0) {
        if (currentSearchKeyword.trim() !== "") {
            showEmptyState(currentSearchKeyword);
        } else {
            showEmptyCategoryState();
        }
        return;
    }
    items.forEach((item, index) => {
        const safeName = item.name.replace(/'/g, "\\'");
        const card = document.createElement("div");
        card.className = "menu-card";
        card.style.animationDelay = `${index * 0.06}s`;
        card.innerHTML = `
            <div class="image-wrapper">
                ${item.bestSeller ? `<div class="best-seller">🔥 BEST SELLER</div>` : ''}
                <img src="${item.image}" alt="${item.name}" loading="lazy" class="menu-img"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22240%22><rect fill=%22%23f1f5f9%22 width=%22400%22 height=%22240%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2240%22>🍽️</text></svg>'">
            </div>
            <div class="menu-info">
                <div class="food-tag">${item.category}</div>
                <h3>${item.name}</h3>
                <div class="price">${formatPrice(item.price)}</div>
                <p>${item.desc.substring(0, 80)}${item.desc.length > 80 ? '...' : ''}</p>
                <div class="card-actions">
                    <button class="detail-btn" onclick="openModalByName('${safeName}')">View Details</button>
                    ${item.available !== false ? `<button class="add-to-cart-btn" onclick="openQuickAddPopup('${safeName}')">+ Add To Cart</button>` : '<button class="add-to-cart-btn" style="background:#64748b;cursor:not-allowed;" disabled>❌ Out of Stock</button>'}
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
    document.getElementById("searchInput").value = "";
    currentSearchKeyword = "";
    renderMenu();
}

function searchMenu() { currentSearchKeyword = document.getElementById("searchInput").value; renderMenu(); }
function sortMenu() { renderMenu(); }
function changeCategory(btn, category) {
    document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentCategory = category;
    currentSearchKeyword = "";
    document.getElementById("searchInput").value = "";
    showSkeletonLoading();
    setTimeout(() => renderMenu(), 400);
}
