// server.js
// Entry point — bootstrap dan start server dengan dynamic port manager

const app = require("./src/app");
const config = require("./config");
const { startAllConfiguredPorts, getAllPrinters } = require("./src/helpers/config-manager");

// 1. Port utama (Web Dashboard & Default Printer)
app.listen(config.serverPort, () => {
  const data = getAllPrinters();
  console.log(`Print proxy dashboard jalan di http://localhost:${config.serverPort}`);
  console.log(`Printer terdaftar: ${Object.keys(data.printers).join(", ")}`);
  console.log(`Default Printer: ${data.defaultPrinter}`);

  // 2. Buka semua port dedicated yang tersimpan untuk masing-masing kasir
  startAllConfiguredPorts(app);
});
