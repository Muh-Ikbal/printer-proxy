# Panduan Troubleshooting & FAQ

Dokumen ini memuat solusi untuk masalah umum yang sering ditemui saat implementasi printer kasir di lingkungan produksi.

---

## 1. Masalah Izin Akses USB di Linux (`Permission Denied`)

### Gejala:
Error di terminal:
```
Error: EACCES: permission denied, open '/dev/usb/lp0'
```

### Penyebab:
Secara default, Linux membatasi akses ke perangkat `/dev/usb/lp*` hanya untuk user `root` atau grup `lp`.

### Solusi:
1. **Tambahkan user Anda ke grup `lp` dan `dialout`:**
   ```bash
   sudo usermod -aG lp,dialout $USER
   ```
   *(Setelah menjalankan perintah di atas, lakukan **Log out** lalu **Log in** kembali agar grup diterapkan)*.

2. **Beri izin baca/tulis sementara:**
   ```bash
   sudo chmod 666 /dev/usb/lp*
   ```

3. **Solusi Permanen via aturan `udev`:**
   Buat file aturan udev di `/etc/udev/rules.d/99-usb-printers.rules`:
   ```bash
   echo 'KERNEL=="lp*", SUBSYSTEM=="usbmisc", MODE="0666"' | sudo tee /etc/udev/rules.d/99-usb-printers.rules
   sudo udevadm control --reload-rules && sudo udevadm trigger
   ```

---

## 2. Port Sudah Digunakan (`EADDRINUSE`)

### Gejala:
```
Error: listen EADDRINUSE: address already in use :::8000
```

### Penyebab:
Ada proses Node.js lama atau web server lain yang sedang mendengarkan di port yang sama.

### Solusi:
1. Cari proses yang sedang memakai port:
   ```bash
   lsof -i :8000
   ```
2. Hentikan proses tersebut:
   ```bash
   kill -9 <PID>
   ```
   atau cepat dengan:
   ```bash
   fuser -k 8000/tcp
   ```

---

## 3. Odoo POS Menampilkan Ikon Merah ("Printer Disconnected")

### Pemeriksaan:
1. **Periksa Alamat IP & Port:**
   Pastikan di Odoo POS kolom **Proxy IP** diisi dengan alamat IP LAN komputer proxy dan port kasirnya, misal:
   ```
   192.168.1.50:8001
   ```
   *(Jangan masukkan `http://`, cukup `IP:PORT`)*.

2. **Periksa Firewall Komputer Proxy:**
   Pastikan port 8000 hingga 8010 dibuka pada firewall Linux:
   ```bash
   sudo ufw allow 8000:8010/tcp
   ```
   Atau di Windows Defender Firewall, tambahkan Inbound Rule untuk mengizinkan port TCP 8000–8010.

3. **Masalah Mixed Content (Odoo HTTPS vs Proxy HTTP):**
   Jika server Odoo Anda diakses menggunakan **`https://`**, browser modern akan memblokir request ke proxy lokal yang menggunakan **`http://`** (*Blocked Mixed Content*).
   
   **Solusi:**
   - Akses Odoo via `http://` jika berada di jaringan lokal kasir.
   - Atau atur browser kasir: buka `chrome://flags` $\rightarrow$ cari *"Insecure origins treated as secure"* $\rightarrow$ masukkan IP Proxy Anda (`http://192.168.1.50:8001`).

---

## 4. Printer Windows Tidak Mau Mencetak via UNC (`\\localhost\...`)

### Gejala:
Error tidak dapat membuka koneksi printer di Windows.

### Solusi:
1. Buka **Control Panel** $\rightarrow$ **Devices and Printers**.
2. Klik kanan printer kasir Anda $\rightarrow$ pilih **Printer properties**.
3. Buka tab **Sharing** $\rightarrow$ Centang **Share this printer**.
4. Beri nama share sederhana tanpa spasi, contoh: `KASIR1`.
5. Buka tab **Security** $\rightarrow$ Pastikan grup `Everyone` memiliki hak akses **Print**.
6. Masukkan target di Print Proxy: `\\localhost\KASIR1`.

---

## 5. Cara Menjalankan sebagai Service Otomatis (Autostart)

Agar Print Proxy otomatis menyala saat komputer dinyalakan tanpa perlu membuka terminal manual:

### Opsi A: Menggunakan PM2 (Paling Direkomendasikan)
PM2 adalah process manager handal untuk Node.js.

1. Install PM2 secara global:
   ```bash
   sudo npm install -g pm2
   ```
2. Jalankan aplikasi dengan PM2:
   ```bash
   cd /home/technoindo/print-proxy
   pm2 start server.js --name "odoo-print-proxy"
   ```
3. Simpan agar auto-start saat booting komputer:
   ```bash
   pm2 startup
   pm2 save
   ```
4. Perintah berguna lainnya:
   - Cek status: `pm2 status`
   - Cek log cetak: `pm2 logs odoo-print-proxy`
   - Restart: `pm2 restart odoo-print-proxy`

### Opsi B: Menggunakan Systemd (Linux)
1. Buat file service:
   ```bash
   sudo nano /etc/systemd/system/print-proxy.service
   ```
2. Isi konfigurasi:
   ```ini
   [Unit]
   Description=Odoo Print Proxy Service
   After=network.target

   [Service]
   Type=simple
   User=technoindo
   WorkingDirectory=/home/technoindo/print-proxy
   ExecStart=/usr/bin/node /home/technoindo/print-proxy/server.js
   Restart=always
   RestartSec=5
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```
3. Aktifkan dan jalankan:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable print-proxy
   sudo systemctl start print-proxy
   ```
