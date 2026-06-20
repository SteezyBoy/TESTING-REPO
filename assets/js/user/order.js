/**
 * File: assets/js/user/order.js
 * Diperbarui untuk memastikan data keranjang selalu sinkron.
 */

function sendOrderAndMonitor(providedCart, customerInfo) {
    // 1. AMBIL DATA TERBARU: Jika providedCart kosong, coba ambil dari localStorage atau variabel global cart
    let cartData = providedCart;
    if (!cartData || cartData.length === 0) {
        // Coba ambil dari localStorage jika ada
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            cartData = JSON.parse(savedCart);
        } else if (typeof cart !== "undefined") {
            // Atau ambil dari variabel global 'cart' yang biasa dipakai di cart.js
            cartData = cart;
        }
    }

    // 2. VALIDASI AKHIR
    if (!cartData || cartData.length === 0) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Keranjang Anda kosong! Silakan pilih menu terlebih dahulu.'
        });
        return;
    }

    // Ubah tombol menjadi loading state
    const submitBtn = document.getElementById('btnSubmitOrder');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Memproses...";
    }

    // Kirim data ke backend (Google Apps Script)
    google.script.run
        .withSuccessHandler(function(response) {
            if (response && response.status === 'success') {
                // Berhasil: Bersihkan keranjang agar tidak bisa dipesan dobel
                localStorage.removeItem('cart');
                openOrderStatus(response.orderId, 'UNPAID', response.totalAmount);
            } else {
                alert("Gagal memproses pesanan: " + (response ? response.message : "Data tidak valid."));
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "Pesan Sekarang";
                }
            }
        })
        .withFailureHandler(function(error) {
            console.error("Gagal mengirim pesanan:", error);
            alert("Terjadi kesalahan jaringan. Silakan coba lagi.");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = "Pesan Sekarang";
            }
        })
        .createOrder(cartData, customerInfo);
}

// Fungsi openOrderStatus tetap sama...
function openOrderStatus(orderId, status, totalAmount) {
    const mainView = document.getElementById('mainView');
    if (mainView) mainView.style.display = 'none';
    
    const statusPanel = document.getElementById('orderStatusPanel');
    if (statusPanel) statusPanel.style.display = 'block';
    
    const orderIdEl = document.getElementById('orderIdText');
    const statusEl = document.getElementById('statusText');
    const payBtn = document.getElementById('btnPayQRIS');

    if (orderIdEl) orderIdEl.innerText = "#" + orderId;
    if (statusEl) statusEl.innerText = "Status: " + status;

    if (status === 'UNPAID' && payBtn) {
        payBtn.style.display = 'block';
        const newPayBtn = payBtn.cloneNode(true);
        payBtn.replaceWith(newPayBtn);
        
        newPayBtn.addEventListener('click', function() {
            if (typeof payWithQRIS === "function") {
                payWithQRIS(totalAmount, orderId);
            } else {
                alert("Sistem pembayaran belum siap.");
            }
        });
    } else if (payBtn) {
        payBtn.style.display = 'none';
    }
}
