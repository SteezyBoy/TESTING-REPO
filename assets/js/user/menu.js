// ================================================================
// HERITAGE NUSANTARA - Menu Loader & Renderer (JALUR BARU / v2)
// ----------------------------------------------------------------
// File ini ditulis ulang total untuk memperbaiki bug "menu tampil
// sebentar lalu hilang". Prinsip yang dipakai di sini:
//
//   1. Menu default SELALU tampil dulu, instan, tanpa menunggu API.
//   2. Fetch ke Apps Script dibatasi waktu (timeout) supaya tidak
//      menggantung dan membuat halaman terasa "kosong".
//   3. Setiap baris/item dari Sheet diproses satu-satu dengan
//      try/catch sendiri. Satu baris data yang rusak TIDAK akan
//      menjatuhkan/mengosongkan seluruh menu.
//   4. Sebelum menu lama ditimpa data baru, data baru itu divalidasi
//      dulu secara menyeluruh. Kalau tidak valid/kosong -> data lama
//      tidak disentuh sama sekali.
//   5. Ada "penanda generasi" (renderGeneration) untuk mencegah race
//      condition antara ganti kategori (tab) dan proses load API.
//   6. Ada watchdog untuk mengulang render jika DOM ternyata kosong.
//   7. SUMBER FOTO DIPAKSA LOKAL (Hanya dari folder images/ GitHub).
// ================================================================

let renderGeneration = 0;          // dipakai untuk membatalkan render basi
let lastKnownGoodMenu = null;      // backup menu terakhir yang TERBUKTI berhasil tampil
let isMenuApiLoading  = false;     // mencegah double-fetch tumpang tindih

// ----------------------------------------------------------------
// Util: ambil angka harga dari berbagai format string
// ("Rp 35.000", "35000", 35000, " 35,000 ") -> 35000
// ----------------------------------------------------------------
function parsePriceValue(raw) {
    if (typeof raw === "number" && isFinite(raw)) return raw;
    if (raw === null || raw === undefined) return NaN;
    const cleaned = String(raw).replace(/[^\d]/g, "");
    if (cleaned === "") return NaN;
    return Number(cleaned);
}

// ----------------------------------------------------------------
// Util: Memaksa sumber foto hanya dari folder images/ di GitHub
// Mengamankan aplikasi dari link Google Drive yang rusak/blank
// ----------------------------------------------------------------
function getLocalImage(menuName, apiImage) {
    // Jika data API sudah berupa format lokal (cth: "images/..."), gunakan itu
    if (apiImage && apiImage.startsWith("images/")) return apiImage;

    // Cari kecocokan foto di DEFAULT_MENU_DATA yang sudah terbukti valid jalurnya
    if (typeof DEFAULT_MENU_DATA !== "undefined") {
        for (const cat in DEFAULT_MENU_DATA) {
            const found = DEFAULT_MENU_DATA[cat].find(m => m.name.toLowerCase() === menuName.toLowerCase());
            if (found && found.image) return found.image;
        }
    }
    
    // Fallback: Bentuk jalur secara manual berdasarkan nama (contoh: "images/KLEPON.jpeg")
    return "images/" + menuName.toUpperCase() + ".jpeg";
}

// ----------------------------------------------------------------
// Util: normalisasi 1 baris data menu mentah dari API jadi item
// siap pakai, atau null kalau datanya memang tidak layak ditampilkan.
// ----------------------------------------------------------------
function normalizeMenuRow(item) {
    try {
        if (!item || typeof item !== "object") return null;

        const name = String(item.name || "").trim();
        if (!name) return null; // tanpa nama, item tidak berguna untuk ditampilkan

        const price = parsePriceValue(item.price);
        if (!isFinite(price) || price < 0) return null; // harga tidak valid

        // Format kategori
        const rawCat = String(item.category || "").trim();
        const parts  = rawCat.split("|").map(s => s.trim()).filter(Boolean);
        const first  = (parts[0] || "").toLowerCase();
        const second = parts[1] || "";
        const displayLabel = second || parts[0] || "Menu";

        let categoryKey;
        if (first === "makanan" || first === "food") {
            categoryKey = "makanan";
        } else if (first === "minuman" || first === "beverage" || first === "drink" || first === "drinks" || first === "minum") {
            categoryKey = "minuman";
        } else if (first === "dessert" || first === "desserts" || first === "penutup") {
            categoryKey = "dessert";
        } else {
            categoryKey = "makanan";
        }

        // Terapkan fungsi pemaksaan gambar lokal
        const finalImage = getLocalImage(name, typeof item.image === "string" ? item.image : "");

        return {
            categoryKey,
            data: {
                name,
                category: displayLabel,
                bestSeller: item.bestSeller === true || item.bestSeller === "true",
                image: finalImage,
                desc: typeof item.desc === "string" ? item.desc : "",
                price,
                available: item.available !== false && item.available !== "false"
            }
        };
    } catch (err) {
        console.warn("[menu] Baris menu dilewati karena error parsing:", err, item);
        return null;
    }
}

// ----------------------------------------------------------------
// Bangun ulang seluruh struktur { makanan, minuman, dessert }
// ----------------------------------------------------------------
function buildMenuFromRawList(rawList) {
    const result     = { makanan: [], minuman: [], dessert: [] };
    const rawCounts  = { makanan: 0, minuman: 0, dessert: 0 };
    let skipped      = 0;

    rawList.forEach(rawItem => {
        try {
            if (rawItem && typeof rawItem === "object") {
                const rawCat = String(rawItem.category || "").trim();
                const first  = (rawCat.split("|")[0] || "").trim().toLowerCase();
                let key;
                if (first === "makanan" || first === "food") key = "makanan";
                else if (first === "minuman" || first === "beverage" || first === "drink" || first === "drinks" || first === "minum") key = "minuman";
                else if (first === "dessert" || first === "desserts" || first === "penutup") key = "dessert";
                else key = "makanan";
                rawCounts[key]++;
            }
        } catch (e) { /* abaikan, tidak kritikal */ }

        const normalized = normalizeMenuRow(rawItem);
        if (normalized) {
            result[normalized.categoryKey].push(normalized.data);
        } else {
            skipped++;
        }
    });
    if (skipped > 0) {
        console.warn(`[menu] ${skipped} baris menu dari API diabaikan (data tidak lengkap/tidak valid).`);
    }
    return { result, rawCounts };
}

function countMenuItems(menu) {
    if (!menu) return 0;
    return (menu.makanan?.length || 0) + (menu.minuman?.length || 0) + (menu.dessert?.length || 0);
}

// ----------------------------------------------------------------
// Gabungkan hasil API dengan menu yang sedang tampil
// ----------------------------------------------------------------
function mergeMenuPerCategory(currentMenu, apiResult, rawCounts) {
    const merged = { makanan: [], minuman: [], dessert: [] };
    ["makanan", "minuman", "dessert"].forEach(key => {
        if (apiResult[key] && apiResult[key].length > 0) {
            merged[key] = apiResult[key];
        } else if (rawCounts[key] === 0) {
            merged[key] = []; 
        } else {
            merged[key] = currentMenu[key] || []; 
            console.warn(`[menu] Kategori "${key}" ada di Sheet tapi semua barisnya gagal divalidasi -> tetap pakai data lama untuk kategori ini.`);
        }
    });
    return merged;
}

// ----------------------------------------------------------------
// fetch dengan timeout
// ----------------------------------------------------------------
async function fetchWithTimeout(url, timeoutMs = 10000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal });
        return res;
    } finally {
        clearTimeout(timer);
    }
}

// ----------------------------------------------------------------
// JALUR UTAMA: load menu dari Google Sheet via Apps Script.
// Mengembalikan boolean (true/false) agar sinkron dengan init.js
// ----------------------------------------------------------------
async function loadMenuFromSheet() {
    if (isMenuApiLoading) return false; 
    isMenuApiLoading = true;

    const url = getAppsScriptUrl();
    if (!url) {
        console.warn("[menu] Apps Script URL belum diset, tetap pakai menu default.");
        isMenuApiLoading = false;
        return false;
    }

    try {
        const res = await fetchWithTimeout(url + "?action=getMenu", 10000);
        if (!res.ok) {
            console.warn(`[menu] API merespon status ${res.status}, tetap pakai menu yang sedang tampil.`);
            return false;
        }

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (parseErr) {
            console.error("[menu] Respons API bukan JSON valid, tetap pakai menu yang sedang tampil.");
            return false;
        }

        if (!data || !Array.isArray(data.menu)) {
            console.warn("[menu] Format respons API tidak sesuai.");
            return false;
        }

        if (data.menu.length === 0) {
            console.warn("[menu] Sheet menu kosong di server.");
            return false;
        }

        const { result: apiMenu, rawCounts } = buildMenuFromRawList(data.menu);
        const totalValidFromApi = countMenuItems(apiMenu);

        if (totalValidFromApi === 0 && rawCounts.makanan === 0 && rawCounts.minuman === 0 && rawCounts.dessert === 0) {
            console.warn("[menu] Tidak ada baris dari API yang bisa dikenali kategorinya.");
            return false;
        }

        const merged = mergeMenuPerCategory(menuData, apiMenu, rawCounts);
        const totalMerged = countMenuItems(merged);

        if (totalMerged === 0) {
            console.warn("[menu] Hasil gabungan menu kosong total.");
            return false;
        }

        lastKnownGoodMenu = menuData; 
        menuData = merged;
        console.log(`[menu] Menu diperbarui dari API: ${totalValidFromApi} item valid dari API, total tampil sekarang ${totalMerged} item.`);
        return true; 
    } catch (err) {
        if (err && err.name === "AbortError") {
            console.error("[menu] Fetch ke API timeout (>10s).");
        } else {
            console.error("[menu] Gagal fetch menu dari API:", err);
        }
        return false;
    } finally {
        isMenuApiLoading = false;
    }
}

function setDefaultMenu() {
    if (typeof DEFAULT_MENU_DATA !== "undefined" && DEFAULT_MENU_DATA) {
        menuData = JSON.parse(JSON.stringify(DEFAULT_MENU_DATA));
        console.log("[menu] Default menu dimuat:", countMenuItems(menuData), "item");
    } else {
        console.error("[menu] DEFAULT_MENU_DATA tidak tersedia!");
        menuData = { makanan: [], minuman: [], dessert: [] };
    }
}

// ----------------------------------------------------------------
// Dipanggil manual oleh user lewat tombol "Reload Menu" 
// ----------------------------------------------------------------
async function reloadMenuManually() {
    showShareToast("🔄 Memuat ulang menu...");
    const isSuccess = await loadMenuFromSheet();
    if (!isSuccess && countMenuItems(menuData) === 0) {
        setDefaultMenu();
    }
    safeRenderMenu();
    showShareToast("✅ Menu diperbarui");
}

function getFilteredAndSortedItems() {
    let items = currentCategory === "all" ? getAllItems() : [...(menuData[currentCategory] || [])];
    items = items.filter(item => item && item.available !== false);
    if (currentSearchKeyword.trim() !== "") {
        const kw = currentSearchKeyword.toLowerCase();
        items = items.filter(item => (item.name || "").toLowerCase().includes(kw));
    }
    const sortValue = document.getElementById("sortMenu")?.value;
    if (sortValue === "az") items.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortValue === "za") items.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortValue === "low") items.sort((a, b) => a.price - b.price);
    else if (sortValue === "high") items.sort((a, b) => b.price - a.price);
    return items;
}

// ----------------------------------------------------------------
// safeRenderMenu(): pembungkus renderMenu() yang anti-gagal-total.
// ----------------------------------------------------------------
function safeRenderMenu() {
    const myGeneration = ++renderGeneration;
    try {
        renderMenu();
    } catch (err) {
        console.error("[menu] renderMenu() gagal, mencoba pulih otomatis:", err);
        if (lastKnownGoodMenu && countMenuItems(lastKnownGoodMenu) > 0) {
            menuData = lastKnownGoodMenu;
        } else {
            setDefaultMenu();
        }
        try { renderMenu(); } catch (err2) {
            console.error("[menu] Render ulang juga gagal:", err2);
        }
    }

    requestAnimationFrame(() => {
        if (myGeneration !== renderGeneration) return; 
        const menuList = document.getElementById("menu-list");
        const expectedItems = getFilteredAndSortedItems().length;
        if (menuList && expectedItems > 0 && menuList.children.length === 0) {
            console.warn("[menu] Watchdog: menu-list kosong padahal seharusnya ada isi. Render ulang...");
            try { renderMenu(); } catch (err3) { console.error("[menu] Watchdog render ulang gagal:", err3); }
        }
    });
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

    const fragment = document.createDocumentFragment();
    items.forEach((item, index) => {
        try {
            const card = buildMenuCardElement(item, index);
            if (card) fragment.appendChild(card);
        } catch (err) {
            console.warn("[menu] Gagal membangun kartu menu untuk item, dilewati:", item, err);
        }
    });
    menuList.appendChild(fragment);

    if (menuList.children.length === 0) {
        showEmptyCategoryState();
    }
}

function buildMenuCardElement(item, index) {
    const name  = String(item.name || "Menu");
    const desc  = String(item.desc || "");
    const price = Number(item.price) || 0;
    const safeName = name.replace(/'/g, "\\'");

    const card = document.createElement("div");
    card.className = "menu-card";
    card.style.animationDelay = `${index * 0.06}s`;
    card.innerHTML = `
        <div class="image-wrapper">
            ${item.bestSeller ? `<div class="best-seller">🔥 BEST SELLER</div>` : ''}
            <img src="${item.image || ''}" alt="${name}" loading="lazy" class="menu-img"
                 onerror="this.onerror=null;this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22240%22><rect fill=%22%23f1f5f9%22 width=%22400%22 height=%22240%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2240%22>🍽️</text></svg>'">
        </div>
        <div class="menu-info">
            <div class="food-tag">${item.category || ''}</div>
            <h3>${name}</h3>
            <div class="price">${formatPrice(price)}</div>
            <p>${desc.substring(0, 80)}${desc.length > 80 ? '...' : ''}</p>
            <div class="card-actions">
                <button class="detail-btn" onclick="openModalByName('${safeName}')">View Details</button>
                ${item.available !== false ? `<button class="add-to-cart-btn" onclick="openQuickAddPopup('${safeName}')">+ Add To Cart</button>` : '<button class="add-to-cart-btn" style="background:#64748b;cursor:not-allowed;" disabled>❌ Out of Stock</button>'}
            </div>
        </div>`;
    return card;
}

function showEmptyState(keyword) {
    const menuList = document.getElementById("menu-list");
    if (!menuList) return;
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
    if (!menuList) return;
    menuList.innerHTML = `
    <div class="empty-state">
        <div class="empty-state-icon">🍽️</div>
        <h3>Menu sedang tidak tersedia</h3>
        <p>Silakan pilih kategori lain, atau tekan tombol reload menu di atas.</p>
    </div>`;
}

function clearSearch() {
    document.getElementById("searchInput").value = "";
    currentSearchKeyword = "";
    safeRenderMenu();
}

function searchMenu() { currentSearchKeyword = document.getElementById("searchInput").value; safeRenderMenu(); }
function sortMenu() { safeRenderMenu(); }

function changeCategory(btn, category) {
    document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentCategory = category;
    currentSearchKeyword = "";
    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.value = "";

    showSkeletonLoading();
    const myGeneration = ++renderGeneration;
    setTimeout(() => {
        if (myGeneration !== renderGeneration) return; 
        renderGeneration--; 
        safeRenderMenu();
    }, 200);
}
