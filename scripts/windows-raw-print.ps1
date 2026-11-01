# scripts/windows-raw-print.ps1
# Mengirim data mentah (RAW ESC/POS atau ESC/P) langsung ke antrian Windows Print Spooler (winspool.drv).
# Kompatibel dengan Windows 7, 8, 10, 11 (Semua edisi 32-bit & 64-bit).
# Zero-Dependency: Tidak memerlukan driver C++ tambahan atau software pihak ketiga.

param (
    [Parameter(Mandatory=$true)]
    [string]$PrinterName,

    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

if (-not (Test-Path -LiteralPath $FilePath)) {
    Write-Error "[WinRawPrint] File sumber '$FilePath' tidak ditemukan."
    exit 2
}

$rawPrintCode = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class WinSpoolerRawPrint {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static bool PrintRawFile(string printerName, string filePath) {
        if (!File.Exists(filePath)) {
            throw new FileNotFoundException("File tidak ditemukan: " + filePath);
        }

        byte[] bytes = File.ReadAllBytes(filePath);
        if (bytes.Length == 0) {
            return true; // Tidak ada data untuk dicetak
        }

        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);

        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "RAW_PRINT_JOB";
        di.pDataType = "RAW";

        bool success = false;
        int lastWin32Error = 0;

        if (OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
            try {
                if (StartDocPrinter(hPrinter, 1, di)) {
                    try {
                        if (StartPagePrinter(hPrinter)) {
                            try {
                                int dwWritten = 0;
                                success = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
                                if (!success) {
                                    lastWin32Error = Marshal.GetLastWin32Error();
                                }
                            } finally {
                                EndPagePrinter(hPrinter);
                            }
                        } else {
                            lastWin32Error = Marshal.GetLastWin32Error();
                        }
                    } finally {
                        EndDocPrinter(hPrinter);
                    }
                } else {
                    lastWin32Error = Marshal.GetLastWin32Error();
                }
            } finally {
                ClosePrinter(hPrinter);
            }
        } else {
            lastWin32Error = Marshal.GetLastWin32Error();
            Marshal.FreeCoTaskMem(pUnmanagedBytes);
            throw new Exception("Gagal membuka printer '" + printerName + "'. Pastikan nama printer tepat sesuai di Windows (Win32 Error: " + lastWin32Error + ").");
        }

        Marshal.FreeCoTaskMem(pUnmanagedBytes);

        if (!success) {
            throw new Exception("Gagal menulis ke antrian printer '" + printerName + "' (Win32 Error: " + lastWin32Error + ").");
        }

        return true;
    }
}
"@

try {
    Add-Type -TypeDefinition $rawPrintCode -ErrorAction Stop
} catch {
    # Type sudah terdefinisi di sesi PowerShell ini
}

try {
    [WinSpoolerRawPrint]::PrintRawFile($PrinterName, $FilePath) | Out-Null
    Write-Output "OK"
    exit 0
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
