// src/routes/posbox.js
// Odoo PosBox emulator endpoints (dipanggil oleh Odoo POS standar / ProxyDevice)

const express = require("express");
const config = require("../../config");
const { buildPrinter } = require("../helpers/printer-builder");
const { renderXmlReceipt } = require("../helpers/xml-renderer");
const { getAllPrinters } = require("../helpers/config-manager");

const router = express.Router({ mergeParams: true });

function getRequestedPrinter(req) {
  const dynamicConfig = getAllPrinters();

  // 1. Port-based routing (jika Odoo connect ke port khusus misal 8001 -> tp1)
  const localPort = req.socket && req.socket.localPort;
  if (localPort) {
    if (config.portMapping && config.portMapping[localPort]) {
      return config.portMapping[localPort];
    }
    const allPrinters = { ...config.printers, ...(dynamicConfig.printers || {}) };
    for (const [name, p] of Object.entries(allPrinters)) {
      if (p.port && p.port === localPort) return name;
    }
  }

  // 2. Parameter URL path (:printer, e.g. /kasir1/hw_proxy/...)
  if (req.params && req.params.printer) return req.params.printer;
  const match = req.originalUrl && req.originalUrl.match(/^\/([^\/\?]+)\/hw_proxy/);
  if (match && match[1]) return match[1];

  // 3. Query parameter (?printer=tp1)
  if (req.query && req.query.printer) return req.query.printer;

  // 4. Body parameter
  if (req.body && req.body.printer) return req.body.printer;
  if (req.body && req.body.params && req.body.params.printer) return req.body.params.printer;

  // 5. Header (x-printer: tp1)
  if (req.headers && req.headers["x-printer"]) return req.headers["x-printer"];

  // 6. IP mapping jika ada di config (misal IP laptop kasir -> nama printer)
  if (config.ipMapping) {
    const clientIp = (req.ip || req.connection.remoteAddress || "").replace(/^.*:/, "");
    if (config.ipMapping[clientIp]) return config.ipMapping[clientIp];
  }

  // 7. Default fallback
  return dynamicConfig.defaultPrinter || config.defaultPrinter;
}

// Status POSBox
router.all("/status_json", (req, res) => {
  const id = (req.body && req.body.id) || 1;
  res.json({
    jsonrpc: "2.0",
    id,
    result: {
      status: "connected",
      drivers: {
        escpos: { status: "connected", messages: [] },
      },
    },
  });
});

// Ping
router.all("/hello", (req, res) => {
  res.send("ping");
});

// Handshake
router.all("/handshake", (req, res) => {
  const id = (req.body && req.body.id) || 1;
  res.json({ jsonrpc: "2.0", id, result: true });
});

// Buka laci kasir
router.post("/open_cashbox", async (req, res) => {
  const id = (req.body && req.body.id) || 1;
  const printerName = getRequestedPrinter(req);
  try {
    const printer = buildPrinter({ printerName });
    printer.openCashDrawer();
    await printer.execute();
    res.json({ jsonrpc: "2.0", id, result: true });
  } catch (err) {
    res.status(500).json({ jsonrpc: "2.0", id, error: { message: err.message } });
  }
});

// Cetak struk POS Odoo bawaan (XML Receipt)
router.post(["/print_xml_receipt", "/print_receipt"], async (req, res) => {
  const id = (req.body && req.body.id) || 1;
  const receiptXml = (req.body && req.body.params && req.body.params.receipt) ||
                     (req.body && req.body.receipt) ||
                     (typeof req.body === "string" ? req.body : null);

  if (!receiptXml) {
    return res.status(400).json({ jsonrpc: "2.0", id, error: { message: "Receipt XML data is missing" } });
  }

  const printerName = getRequestedPrinter(req);

  try {
    const printer = buildPrinter({ printerName });
    await renderXmlReceipt(printer, receiptXml);
    await printer.execute();
    console.log(`[POSBox] Berhasil mencetak XML receipt dari Odoo ke printer: '${printerName}'`);
    res.json({ jsonrpc: "2.0", id, result: true });
  } catch (err) {
    console.error(`[POSBox] Gagal mencetak XML receipt ke '${printerName}':`, err.message);
    res.status(500).json({ jsonrpc: "2.0", id, error: { message: err.message } });
  }
});

module.exports = router;
