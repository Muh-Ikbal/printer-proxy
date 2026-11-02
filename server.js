// server.js
// Entry point — bootstrap dan start server dengan dynamic port manager

const app = require("./src/app");
const config = require("./config");
const { startAllConfiguredPorts, getAllPrinters } = require("./src/helpers/config-manager");

// 1. Port utama (Web Dashboard & Default Printer)
app.listen(config.serverPort, () => {
  const data = getAllPrinters();
  const printerNames = Object.keys(data.printers);

  console.log(`Print proxy dashboard jalan di http://localhost:${config.serverPort}`);

  if (printerNames.length === 0) {
    console.log(`Belum ada printer terdaftar.`);
    console.log(`Silakan buka dashboard di browser untuk menambahkan printer kasir / dotmatrix.`);
  } else {
    console.log(`Printer terdaftar: ${printerNames.join(", ")}`);
    console.log(`Default Printer: ${data.defaultPrinter || "(belum dipilih)"}`);
  }

  // 2. Buka semua port dedicated yang tersimpan untuk masing-masing kasir
  startAllConfiguredPorts(app);
});
