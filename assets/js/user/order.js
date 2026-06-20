/**
 * File: assets/js/user/order.js
 * Menangani pengiriman keranjang ke backend dan transisi ke halaman status pesanan.
 */

function sendOrderAndMonitor(customerInfo) { // Hapus argumen cartData
    // AMBIL DATA TERBARU dari fungsi global
    const cartData = getCartData(); 

    if (!cartData || cartData.length === 0) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: 'Keranjang Anda kosong!' });
        return;
    }
    
    // ... sisa kode pengiriman Anda tetap sama ...
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
                // Lanjut ke halaman status/pembayaran
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
            alert("Terjadi kesalahan jaringan atau server sibuk. Silakan coba lagi.");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = "Pesan Sekarang";
            }
        })
        .createOrder(cartData, customerInfo);
}

function openOrderStatus(orderId, status, totalAmount) {
    // Sembunyikan tampilan utama (menu/keranjang)
    const mainView = document.getElementById('mainView');
    if (mainView) mainView.style.display = 'none';
    
    // Tampilkan panel status pesanan
    const statusPanel = document.getElementById('orderStatusPanel');
    if (statusPanel) statusPanel.style.display = 'block';
    
    // Update data di UI
    const orderIdEl = document.getElementById('orderIdText');
    const statusEl = document.getElementById('statusText');
    const payBtn = document.getElementById('btnPayQRIS');

    if (orderIdEl) orderIdEl.innerText = "#" + orderId;
    if (statusEl) statusEl.innerText = "Status: " + status;

    // Tampilkan tombol bayar hanya jika status UNPAID
    if (status === 'UNPAID' && payBtn) {
        payBtn.style.display = 'block';
        
        // Hapus listener lama untuk mencegah dobel klik (bug duplikasi)
        const newPayBtn = payBtn.cloneNode(true);
        payBtn.replaceWith(newPayBtn);
        
        newPayBtn.addEventListener('click', function() {
            // Memanggil fungsi dari payment.js
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
