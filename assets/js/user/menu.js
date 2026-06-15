async function loadMenuFromSheet() {
    const url = getAppsScriptUrl();
    if (!url || url === "https://script.google.com/macros/s/AKfycbzsgvy9iwKfdW4PSY3lKHs1xNAsOTTZYL7NHTfdOI1YBJqi9O_9gzXPaluzJoxK7BYK/exec") { 
        console.warn("Apps Script URL not set or using fallback, keeping default menu");
        // Tidak perlu setDefaultMenu lagi karena sudah ada dari init
        return;
    }
    try {
        const res = await fetch(url + "?action=getMenu");
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch(parseErr) {
            console.error("API response bukan JSON valid, tetap pakai default menu. Response:", text.substring(0, 200));
            return; // Tetap pakai menu yang sudah ada (default)
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
                // Hanya tambahkan jika item valid
                if (item.name && item.price) {
                    newMenu[categoryKey].push({
                        name: item.name,
                        category: item.category || categoryKey,
                        bestSeller: item.bestSeller === true,
                        image: item.image || "",
                        desc: item.desc || "",
                        price: Number(item.price) || 0,
                        available: item.available !== false
                    });
                }
            });
            const totalItems = newMenu.makanan.length + newMenu.minuman.length + newMenu.dessert.length;
            if (totalItems > 0) {
                menuData = newMenu;
                console.log("Menu loaded from API:", totalItems, "items");
                renderMenu(); // Refresh tampilan dengan data API
            } else {
                console.warn("API menu kosong, tetap pakai default");
                // tidak perlu setDefaultMenu, karena sudah ada
            }
        } else {
            console.warn("API menu tidak valid, tetap pakai default");
        }
    } catch (err) {
        console.error("Gagal fetch menu dari API, tetap pakai default:", err);
        // Tidak perlu setDefaultMenu, karena sudah ada
    }
}

function setDefaultMenu() {
    if (typeof DEFAULT_MENU_DATA !== "undefined" && DEFAULT_MENU_DATA) {
        menuData = JSON.parse(JSON.stringify(DEFAULT_MENU_DATA));
        console.log("Default menu loaded:", menuData.makanan.length + menuData.minuman.length + menuData.dessert.length, "items");
    } else {
        console.error("DEFAULT_MENU_DATA tidak tersedia!");
        menuData = { makanan: [], minuman: [], dessert: [] };
    }
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
    // Tampilkan skeleton loading sebentar lalu render
    showSkeletonLoading();
    setTimeout(() => renderMenu(), 300);
}
