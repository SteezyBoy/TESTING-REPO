/**
 * File: assets/js/user/payment.js
 * Menangani logika popup QRIS dan verifikasi pembayaran.
 */

function payWithQRIS(totalAmount, orderId) {
    const qrisModal = document.getElementById('qrisModal');
    const amountDisplay = document.getElementById('qrisTotalAmount');
    
    // Set nominal tagihan
    if (amountDisplay) {
        amountDisplay.innerText = "Rp " + parseInt(totalAmount).toLocaleString('id-ID'); 
    }
    
    // Tampilkan modal QRIS
    if (qrisModal) qrisModal.style.display = 'block';

    // Set event listener untuk konfirmasi pembayaran
    const confirmBtn = document.getElementById('btnConfirmQris');
    if (confirmBtn) {
        // Clone node untuk mencegah multiple event listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.replaceWith(newConfirmBtn);
        
        newConfirmBtn.addEventListener('click', function() {
            // Tutup modal
            if (qrisModal) qrisModal.style.display = 'none';
            // Eksekusi finalisasi ke backend
            finalizeQrisPayment(orderId);
        });
    }
}

function finalizeQrisPayment(orderId) {
    const statusEl = document.getElementById('statusText');
    if (statusEl) statusEl.innerText = "Status: MEMVERIFIKASI PEMBAYARAN...";

    // Kirim konfirmasi ke backend
    google.script.run
        .withSuccessHandler(function(response) {
            if(response && response.status === 'success') {
                // Sukses: Update UI tanpa memanggil fungsi ini lagi (Solusi Bug Rekursi)
                if (statusEl) statusEl.innerText = "Status: DIBAYAR (SEDANG DISIAPKAN)";
                const payBtn = document.getElementById('btnPayQRIS');
                if (payBtn) payBtn.style.display = 'none';
                
                alert("Pembayaran berhasil dikonfirmasi! Pesanan Anda segera disiapkan.");
            } else {
                alert("Verifikasi gagal: " + (response ? response.message : "Sistem gagal memverifikasi."));
                if (statusEl) statusEl.innerText = "Status: UNPAID";
            }
        })
        .withFailureHandler(function(error) {
            console.error("Gagal mengonfirmasi pembayaran:", error);
            alert("Kesalahan jaringan saat verifikasi pembayaran. Silakan cek koneksi Anda.");
            if (statusEl) statusEl.innerText = "Status: UNPAID";
        })
        .confirmPayment(orderId);
}