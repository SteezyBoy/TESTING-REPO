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
//      menjatuhkan/mengosongkan seluruh menu (ini akar masalah lama:
//      kalau satu item error, seluruh proses render berhenti di
//      tengah jalan padahal list sudah dikosongkan duluan).
//   4. Sebelum menu lama ditimpa data baru, data baru itu divalidasi
//      dulu secara menyeluruh. Kalau tidak valid/kosong -> data lama
//      (yang sudah terbukti tampil) tidak disentuh sama sekali.
//   5. Ada "penanda generasi" (renderGeneration) untuk mencegah race
//      condition antara ganti kategori (tab) dan proses load API
//      yang selesai di waktu yang hampir bersamaan.
//   6. Ada watchdog: kalau setelah render ternyata DOM menu-list
//      kosong padahal seharusnya ada isinya, sistem otomatis
//      mencoba render ulang dari data yang masih valid.
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
// Util: normalisasi 1 baris data menu mentah dari API jadi item
// siap pakai, atau null kalau datanya memang tidak layak ditampilkan.
// Dibungkus try/catch sendiri supaya 1 baris rusak tidak pernah bisa
// menjatuhkan proses parsing baris-baris lainnya.
// ----------------------------------------------------------------
function normalizeMenuRow(item) {
    try {
        if (!item || typeof item !== "object") return null;

        const name = String(item.name || "").trim();
        if (!name) return null; // tanpa nama, item tidak berguna untuk ditampilkan

        const price = parsePriceValue(item.price);
        if (!isFinite(price) || price < 0) return null; // harga tidak valid

        // Format kategori bisa "makanan|Appetizer" (baru) atau cuma "makanan"/"Appetizer" (lama)
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
            // Kategori asing/lama (Appetizer, Soup, Main Course, dll) selalu masuk "makanan"
            categoryKey = "makanan";
        }

        return {
            categoryKey,
            data: {
                name,
                category: displayLabel,
                bestSeller: item.bestSeller === true || item.bestSeller === "true",
                image: typeof item.image === "string" ? item.image : "",
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
// Bangun ulang seluruh struktur { makanan, minuman, dessert } dari
// array mentah hasil API. Tidak pernah melempar exception keluar.
// ----------------------------------------------------------------
function buildMenuFromRawList(rawList) {
    const result  = { makanan: [], minuman: [], dessert: [] };
    let skipped    = 0;
    rawList.forEach(rawItem => {
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
    return result;
}

function countMenuItems(menu) {
    if (!menu) return 0;
    return (menu.makanan?.length || 0) + (menu.minuman?.length || 0) + (menu.dessert?.length || 0);
}

// ----------------------------------------------------------------
// fetch dengan timeout, supaya request yang menggantung tidak bikin
// halaman terasa "freeze" / menu hilang tanpa kejelasan.
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
// Menu default TIDAK PERNAH dihapus kecuali data baru dari API
// sudah lolos validasi penuh (totalItems > 0).
// ----------------------------------------------------------------
async function loadMenuFromSheet() {
    if (isMenuApiLoading) return; // cegah fetch dobel kalau dipanggil ulang cepat
    isMenuApiLoading = true;

    const url = getAppsScriptUrl();
    if (!url) {
        console.warn("[menu] Apps Script URL belum diset, tetap pakai menu default.");
        isMenuApiLoading = false;
        return;
    }

    try {
        const res = await fetchWithTimeout(url + "?action=getMenu", 10000);
        if (!res.ok) {
            console.warn(`[menu] API merespon status ${res.status}, tetap pakai menu yang sedang tampil.`);
            return;
        }

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (parseErr) {
            console.error("[menu] Respons API bukan JSON valid, tetap pakai menu yang sedang tampil. Cuplikan respons:", text.substring(0, 200));
            return;
        }

        if (!data || !Array.isArray(data.menu)) {
            console.warn("[menu] Format respons API tidak sesuai (field 'menu' tidak ada/bukan array), tetap pakai menu yang sedang tampil.");
            return;
        }

        if (data.menu.length === 0) {
            console.warn("[menu] Sheet menu kosong di server, tetap pakai menu yang sedang tampil.");
            return;
        }

        const newMenu    = buildMenuFromRawList(data.menu);
        const totalItems = countMenuItems(newMenu);

        if (totalItems === 0) {
            console.warn("[menu] Semua baris dari API tidak valid setelah divalidasi, tetap pakai menu yang sedang tampil.");
            return;
        }

        // Data baru lolos validasi -> aman untuk dipakai
        lastKnownGoodMenu = menuData; // simpan yang lama sebagai cadangan
        menuData = newMenu;
        console.log(`[menu] Menu berhasil dimuat dari API: ${totalItems} item.`);
        safeRenderMenu();
    } catch (err) {
        if (err && err.name === "AbortError") {
            console.error("[menu] Fetch ke API timeout (>10s), tetap pakai menu yang sedang tampil.");
        } else {
            console.error("[menu] Gagal fetch menu dari API, tetap pakai menu yang sedang tampil:", err);
        }
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
// Dipanggil manual oleh user lewat tombol "Reload Menu" kalau-kalau
// menu pernah gagal tampil. Tidak menghapus apa pun, cuma mengulang
// proses load dari awal.
// ----------------------------------------------------------------
async function reloadMenuManually() {
    showShareToast("🔄 Memuat ulang menu...");
    await loadMenuFromSheet();
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
// Kalau renderMenu() melempar error apa pun, sistem otomatis
// mencoba pulih (rollback ke data terakhir yang valid) daripada
// membiarkan menu-list kosong begitu saja.
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

    // Watchdog: pastikan render yang berjalan masih yang paling baru
    // (mencegah race condition saat ganti kategori cepat-cepat).
    requestAnimationFrame(() => {
        if (myGeneration !== renderGeneration) return; // sudah ada render lebih baru, abaikan
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
            // Satu kartu gagal dibangun TIDAK boleh menghentikan kartu lainnya.
            console.warn("[menu] Gagal membangun kartu menu untuk item, dilewati:", item, err);
        }
    });
    menuList.appendChild(fragment);

    // Kalau ternyata semua item gagal dibangun (kasus ekstrem), tampilkan
    // empty state yang ramah daripada layar putih kosong.
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

    // Skeleton loading tetap dipakai (fitur lama dipertahankan), tapi sekarang
    // diberi "penanda generasi" sendiri supaya kalau ada proses lain (misalnya
    // loadMenuFromSheet selesai di waktu yang hampir sama, atau user klik tab
    // lain dengan cepat) tidak saling menimpa / membuat menu hilang.
    showSkeletonLoading();
    const myGeneration = ++renderGeneration;
    setTimeout(() => {
        if (myGeneration !== renderGeneration) return; // sudah ada aksi lebih baru, batalkan render basi ini
        renderGeneration--; // biar safeRenderMenu() di bawah yang menentukan generasi final
        safeRenderMenu();
    }, 200);
}
