// test/endpoints.test.js
// Pengujian Integrasi Endpoint HTTP Express

const assert = require("assert");
const app = require("../src/app");

async function runEndpointTests() {
  console.log("▶ Menguji Endpoint HTTP Express...");

  const server = app.listen(9999);

  try {
    // 1. Uji GET /system-info
    const resInfo = await fetch("http://localhost:9999/system-info");
    const jsonInfo = await resInfo.json();
    assert.strictEqual(jsonInfo.status, "online");
    assert.strictEqual(typeof jsonInfo.queue, "object");
    console.log("  ✔ Uji GET /system-info lulus (Status: online, Queue status terdeteksi)");

    // 2. Uji GET /logs
    const resLogs = await fetch("http://localhost:9999/logs");
    const jsonLogs = await resLogs.json();
    assert.strictEqual(Array.isArray(jsonLogs.lines), true);
    console.log(`  ✔ Uji GET /logs lulus (${jsonLogs.lines.length} baris log berhasil dimuat)`);

    // 3. Uji POST /dotmatrix/print validasi payload kosong
    const resDm = await fetch("http://localhost:9999/dotmatrix/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const jsonDm = await resDm.json();
    assert.strictEqual(jsonDm.status, "ERROR");
    console.log("  ✔ Uji POST /dotmatrix/print validasi input kosong lulus");

    // 4. Uji POST /hw_proxy/status_json
    const resHw = await fetch("http://localhost:9999/hw_proxy/status_json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1 }),
    });
    const jsonHw = await resHw.json();
    assert.strictEqual(jsonHw.result.status, "connected");
    console.log("  ✔ Uji POST /hw_proxy/status_json emulator Odoo lulus");

    console.log("✅ Semua pengujian Endpoint BERHASIL!\n");
  } finally {
    server.close();
  }
}

module.exports = runEndpointTests;

if (require.main === module) {
  runEndpointTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
