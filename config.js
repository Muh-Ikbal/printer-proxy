// config.js
// Kamu bisa daftarkan beberapa printer sekaligus (mis. kasir 1 pakai USB,
// kasir 2 pakai LAN, printer dapur pakai Bluetooth). Saat mencetak, tinggal
// sebut nama profilnya di request, atau kirim koneksi ad-hoc (lihat README).

// Deteksi OS otomatis: Windows (win32) vs Linux (linux) vs macOS (darwin)
const isWindows = process.platform === "win32";

module.exports = {
  // Port HTTP server proxy utama (Dashboard Web)
  serverPort: 8000,

  // Profil default kalau request tidak menyebutkan printer mana yang dipakai
  defaultPrinter: "kasir1",

  // Daftar printer kasir.
  // Properti 'port' opsional: untuk multi-kasir Odoo POS, cukup beri port unik per kasir
  // sehingga kasir 1 di Odoo isi IP:8001, kasir 2 isi IP:8002, dst.
  printers: {
    kasir1: {
      port: 8001, // Odoo POS Kasir 1 -> isi IP:8001
      mode: isWindows ? "printer" : "usb",
      target: isWindows ? "EPSON TM-T82" : "/dev/usb/lp0",
    },

    kasir2: {
      port: 8002, // Odoo POS Kasir 2 -> isi IP:8002
      mode: isWindows ? "printer" : "usb",
      target: isWindows ? "POS-80" : "/dev/usb/lp1",
    },

    kasirBluetooth: {
      mode: "bluetooth",
      target: isWindows ? "COM5" : "/dev/rfcomm0",
    },

    dapurLan: {
      mode: "lan",
      target: { address: "192.168.1.100", port: 9100 },
    },

    dotmatrix: {
      mode: isWindows ? "printer" : "usb",
      target: isWindows ? "EPSON LQ-310 ESC/P2" : "/dev/usb/lp1",
    },
  },

  // Lebar kertas printer: 48 karakter (standar kertas thermal 80mm / PosBox bawaan)
  // atau 33 karakter jika menggunakan printer mini 58mm
  charsPerLine: 33,
};
