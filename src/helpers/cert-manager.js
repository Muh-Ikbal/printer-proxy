// src/helpers/cert-manager.js
// Mengelola dan menghasilkan sertifikat SSL/TLS (Self-Signed) otomatis
// agar Print Proxy bisa melayani HTTPS untuk Odoo Production IoT Box.

const fs = require("fs");
const path = require("path");
const tls = require("tls");
const { execSync } = require("child_process");

const CERTS_DIR = path.join(__dirname, "../../certs");
const KEY_FILE = path.join(CERTS_DIR, "server.key");
const CERT_FILE = path.join(CERTS_DIR, "server.crt");

let cachedSecureContext = null;

/**
 * Pastikan sertifikat SSL tersedia di komputer lokal.
 * Jika belum ada, otomatis dibuatkan sertifikat unik untuk komputer ini.
 */
async function ensureCertificate() {
  if (!fs.existsSync(CERTS_DIR)) {
    fs.mkdirSync(CERTS_DIR, { recursive: true });
  }

  if (fs.existsSync(KEY_FILE) && fs.existsSync(CERT_FILE)) {
    return { keyPath: KEY_FILE, certPath: CERT_FILE };
  }

  console.log("[SSL] Membuat sertifikat SSL self-signed baru untuk HTTPS Odoo IoT Box...");

  // 1. Coba buat dengan OpenSSL CLI jika tersedia (standar Linux & Git Bash di Windows)
  try {
    const cmd = `openssl req -x509 -newkey rsa:2048 -keyout "${KEY_FILE}" -out "${CERT_FILE}" -days 3650 -nodes -subj "/CN=Odoo-Print-Proxy/O=Technoindo"`;
    execSync(cmd, { stdio: "pipe" });
    console.log("[SSL] Sertifikat SSL berhasil dibuat dengan OpenSSL.");
    return { keyPath: KEY_FILE, certPath: CERT_FILE };
  } catch (err) {
    // 2. Fallback: Di Windows tanpa OpenSSL, gunakan modul selfsigned murni JS
    try {
      const selfsigned = require("selfsigned");
      const pems = await selfsigned.generate(
        [
          { name: "commonName", value: "Odoo Print Proxy" },
          { name: "organizationName", value: "Technoindo" },
        ],
        {
          days: 3650,
          keySize: 2048,
          algorithm: "sha256",
        }
      );
      fs.writeFileSync(KEY_FILE, pems.private, "utf-8");
      fs.writeFileSync(CERT_FILE, pems.cert, "utf-8");
      console.log("[SSL] Sertifikat SSL berhasil dibuat otomatis dengan library selfsigned.");
      return { keyPath: KEY_FILE, certPath: CERT_FILE };
    } catch (fallbackErr) {
      console.error("[SSL] Gagal membuat sertifikat SSL:", fallbackErr.message);
      throw fallbackErr;
    }
  }
}

function getSecureContext() {
  if (cachedSecureContext) return cachedSecureContext;

  if (!fs.existsSync(KEY_FILE) || !fs.existsSync(CERT_FILE)) {
    throw new Error("[SSL] Sertifikat belum diinisialisasi. Panggil ensureCertificate() saat startup.");
  }

  const key = fs.readFileSync(KEY_FILE);
  const cert = fs.readFileSync(CERT_FILE);

  cachedSecureContext = tls.createSecureContext({ key, cert });
  return cachedSecureContext;
}

module.exports = {
  ensureCertificate,
  getSecureContext,
  KEY_FILE,
  CERT_FILE,
};
