document.addEventListener('DOMContentLoaded', () => {
    // === DOM Elements ===
    const radioButtons = document.querySelectorAll('input[name="metode_bayar"]');
    const detailContainers = document.querySelectorAll('.detail-bayar');
    const tambahKeranjangButtons = document.querySelectorAll('.tambah-keranjang');
    const daftarKeranjang = document.getElementById('daftar-keranjang');
    const totalBelanjaSpan = document.getElementById('total-belanja');
    const ongkirSpan = document.getElementById('ongkir');
    const grandTotalSpan = document.getElementById('grand-total');
    const biayaTambahanSpan = document.getElementById('biaya-tambahan');
    const biayaTambahanRow = document.querySelector('.biaya-tambahan-row'); // Tambahkan elemen ini
    const pembayaranForm = document.getElementById('pembayaran-form');
    const checkoutButton = document.getElementById('checkout-button');
    const peringatanKeranjang = document.getElementById('peringatan-keranjang');
    
    // Nomor WhatsApp tujuan
    const WHATSAPP_NUMBER = '6285136236798'; // NOMOR TELAH DIUBAH
    
    // === State Keranjang ===
    let keranjang = [];
    const ONGKIR_STANDAR = 10000;
    const BIAYA_COD = 5000;

    // === Fungsi Utilitas ===
    const formatRupiah = (number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(number);
    };

    // Fungsi untuk menyembunyikan semua detail pembayaran
    const hideAllDetails = () => {
        detailContainers.forEach(detail => detail.style.display = 'none');
    };

    // Tampilkan detail saat radio button dipilih
    radioButtons.forEach(radio => {
        radio.addEventListener('change', (event) => {
            hideAllDetails();
            const value = event.target.value;
            const detailElement = document.querySelector(`.${value}-detail`);
            if (detailElement) {
                detailElement.style.display = 'block';
            }
            hitungTotal(); // Panggil hitungTotal untuk update Grand Total
        });
    });

    // Sembunyikan semua saat halaman dimuat
    hideAllDetails();

    // === Fungsi Keranjang ===

    // Menghitung dan memperbarui total
    const hitungTotal = () => {
        let subtotal = keranjang.reduce((sum, item) => sum + (item.harga * item.qty), 0);
        let ongkosKirim = ONGKIR_STANDAR;
        let metodeBayarTerpilih = document.querySelector('input[name="metode_bayar"]:checked')?.value;
        let biayaTambahan = 0;

        if (metodeBayarTerpilih === 'cod') {
            biayaTambahan = BIAYA_COD;
            biayaTambahanRow.style.display = 'flex'; // Tampilkan baris biaya tambahan
            biayaTambahanSpan.textContent = formatRupiah(BIAYA_COD);
        } else {
            biayaTambahanRow.style.display = 'none'; // Sembunyikan baris biaya tambahan
            biayaTambahanSpan.textContent = formatRupiah(0);
        }

        let grandTotal = subtotal + ongkosKirim + biayaTambahan;

        // Update DOM
        totalBelanjaSpan.textContent = formatRupiah(subtotal);
        ongkirSpan.textContent = formatRupiah(ongkosKirim);
        grandTotalSpan.textContent = formatRupiah(grandTotal);
        
        // Aktifkan/nonaktifkan tombol checkout
        const isKeranjangEmpty = keranjang.length === 0;
        const isPaymentSelected = metodeBayarTerpilih !== undefined;
        checkoutButton.disabled = isKeranjangEmpty || !isPaymentSelected; // Tombol nonaktif jika keranjang kosong ATAU pembayaran belum dipilih
        peringatanKeranjang.style.display = isKeranjangEmpty ? 'block' : 'none';
        
        return { subtotal, grandTotal, ongkosKirim, biayaTambahan };
    };

    // Merender ulang daftar keranjang
    const renderKeranjang = () => {
        daftarKeranjang.innerHTML = '';

        if (keranjang.length === 0) {
            const li = document.createElement('li');
            li.textContent = "Keranjang Anda kosong.";
            li.style.cssText = "justify-content: center; color: #999;";
            daftarKeranjang.appendChild(li);
        } else {
            keranjang.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${item.nama} (x${item.qty})</span>
                    <span>
                        ${formatRupiah(item.harga * item.qty)} 
                        <button class="remove-item" data-id="${item.id}" title="Hapus 1 Item">Hapus 1</button>
                        <button class="remove-item-all" data-id="${item.id}" title="Hapus Semua Item">Semua</button>
                    </span>
                `;
                daftarKeranjang.appendChild(li);
            });
        }
        
        hitungTotal();
    };

    // Menangani klik tombol "Tambah ke Keranjang"
    tambahKeranjangButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const id = event.target.dataset.id;
            const nama = event.target.dataset.nama;
            const harga = parseInt(event.target.dataset.harga);

            const existingItem = keranjang.find(item => item.id === id);

            if (existingItem) {
                existingItem.qty += 1;
            } else {
                keranjang.push({ id, nama, harga, qty: 1 });
            }

            renderKeranjang();
        });
    });
    
    // Menangani klik tombol "Hapus" pada keranjang
    daftarKeranjang.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-item')) {
            const id = event.target.dataset.id;
            const itemIndex = keranjang.findIndex(item => item.id === id);

            if (itemIndex > -1) {
                keranjang[itemIndex].qty -= 1;
                if (keranjang[itemIndex].qty <= 0) {
                    keranjang.splice(itemIndex, 1); // Hapus jika qty = 0
                }
                renderKeranjang();
            }
        }
        
        if (event.target.classList.contains('remove-item-all')) {
            const id = event.target.dataset.id;
            const itemIndex = keranjang.findIndex(item => item.id === id);

            if (itemIndex > -1) {
                keranjang.splice(itemIndex, 1); // Hapus semua
                renderKeranjang();
            }
        }
    });

    // === Form Submission (Pengiriman WhatsApp) ===
    pembayaranForm.addEventListener('submit', (event) => {
        event.preventDefault();
        
        if (keranjang.length === 0) {
            alert("Keranjang belanja masih kosong!");
            return;
        }
        
        // 1. Ambil data form dan total
        const formData = new FormData(pembayaranForm);
        const data = Object.fromEntries(formData.entries());
        const { grandTotal, subtotal, ongkosKirim, biayaTambahan } = hitungTotal();
        
        // Ambil label pembayaran yang dipilih
        const metodeBayarLabelElement = document.querySelector(`input[name="metode_bayar"][value="${data.metode_bayar}"] + label`);
        const metodeBayarLabel = metodeBayarLabelElement ? metodeBayarLabelElement.textContent.trim() : data.metode_bayar.toUpperCase();

        // 2. Buat Teks Pesan
        let pesan = `*Pemesanan Buah Segar Baru*\n\n`;
        pesan += `*Nama:* ${data.nama}\n`;
        pesan += `*Telepon:* ${data.telepon}\n`;
        pesan += `*Alamat Pengiriman:* ${data.alamat}\n\n`;
        
        pesan += `*Detail Pesanan:*\n`;
        keranjang.forEach((item, index) => {
            pesan += `${index + 1}. ${item.nama} (x${item.qty}) - ${formatRupiah(item.harga * item.qty)}\n`;
        });
        
        pesan += `\n--- Rincian Biaya ---\n`;
        pesan += `Subtotal: ${formatRupiah(subtotal)}\n`;
        pesan += `Ongkir: ${formatRupiah(ongkosKirim)}\n`;
        if (biayaTambahan > 0) {
            pesan += `Biaya Tambahan (COD): ${formatRupiah(biayaTambahan)}\n`;
        }
        pesan += `*Total Bayar: ${formatRupiah(grandTotal)}*\n\n`;
        pesan += `*Metode Pembayaran:* ${metodeBayarLabel}\n\n`;
        pesan += `Mohon konfirmasi pesanan ini. Terima kasih!`;

        // 3. Format URL WhatsApp
        const encodedPesan = encodeURIComponent(pesan);
        const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedPesan}`;

        // 4. Redirect ke WhatsApp
        window.open(whatsappURL, '_blank');
        
        // Opsional: Reset form dan keranjang setelah redirect
        setTimeout(() => {
            alert("Pemesanan berhasil! Anda akan diarahkan ke WhatsApp untuk konfirmasi dan pembayaran. Tekan kirim di WhatsApp.");
            
            keranjang = [];
            renderKeranjang();
            pembayaranForm.reset();
            hideAllDetails();
        }, 100); 
    });

    // Inisialisasi tampilan keranjang
    renderKeranjang();
});
