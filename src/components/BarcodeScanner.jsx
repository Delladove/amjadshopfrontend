import { useEffect, useRef, useState } from "react";

/* Tries the native BarcodeDetector API first (fast, no download, works offline
   on supported browsers). Falls back to the ZXing library, lazy-loaded from a
   CDN only when needed. If the camera itself isn't available, falls back to a
   manual numeric-entry field so scanning is never a dead end. */
export default function BarcodeScanner({ onScanned, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detectorRef = useRef(null);
  const zxingReaderRef = useRef(null);
  const activeRef = useRef(true);

  const [status, setStatus] = useState("Starting camera…");
  const [manual, setManual] = useState(false);
  const [manualValue, setManualValue] = useState("");

  useEffect(() => {
    activeRef.current = true;
    start();
    return () => {
      activeRef.current = false;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    stop();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("Camera not supported on this device — enter the code manually.");
      setManual(true);
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    } catch {
      setStatus("Camera permission denied — enter the code manually.");
      setManual(true);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = streamRef.current;
    try { await video.play(); } catch {}
    setStatus("Point the camera at a barcode");

    if ("BarcodeDetector" in window) {
      try {
        detectorRef.current = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
        scanLoopNative();
        return;
      } catch {
        /* fall through to ZXing */
      }
    }
    setStatus("Loading scanner…");
    try {
      await loadZXing();
      startZXing();
    } catch {
      setStatus("Couldn't load the scanner — enter the code manually.");
      setManual(true);
    }
  }

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (zxingReaderRef.current) { try { zxingReaderRef.current.reset(); } catch {} zxingReaderRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  }

  function scanLoopNative() {
    if (!activeRef.current || !videoRef.current) return;
    detectorRef.current
      .detect(videoRef.current)
      .then((codes) => {
        if (codes && codes.length) handleCode(codes[0].rawValue);
        else if (activeRef.current) rafRef.current = requestAnimationFrame(scanLoopNative);
      })
      .catch(() => { if (activeRef.current) rafRef.current = requestAnimationFrame(scanLoopNative); });
  }

  function loadZXing() {
    return new Promise((resolve, reject) => {
      if (window.ZXing) return resolve();
      const s = document.createElement("script");
      s.src = "https://unpkg.com/@zxing/[email protected]/umd/index.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("ZXing failed to load"));
      document.head.appendChild(s);
    });
  }

  function startZXing() {
    zxingReaderRef.current = new window.ZXing.BrowserMultiFormatReader();
    setStatus("Point the camera at a barcode");
    zxingReaderRef.current.decodeFromVideoElement(videoRef.current, (result) => {
      if (result) handleCode(result.getText());
    }).catch(() => {});
  }

  function handleCode(code) {
    onScanned(String(code).trim());
    setStatus(`✓ Scanned ${code}`);
    if (detectorRef.current && activeRef.current) {
      setTimeout(() => { if (activeRef.current) scanLoopNative(); }, 900);
    }
  }

  function submitManual() {
    const val = manualValue.trim();
    if (!val) return;
    handleCode(val);
    setManualValue("");
  }

  return (
    <div className="scanner open" style={scannerStyle}>
      <button className="scanner-close" style={closeBtnStyle} onClick={onClose}>×</button>
      <video ref={videoRef} playsInline muted style={{ flex: 1, width: "100%", objectFit: "cover", background: "#000" }} />
      <div style={frameStyle} />
      <div style={statusStyle}>{status}</div>
      {manual && (
        <div style={manualWrapStyle}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter barcode number"
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            style={{ flex: 1, padding: "12px 14px", borderRadius: 12, border: "none", fontSize: 15 }}
          />
          <button onClick={submitManual} style={{ padding: "12px 18px", borderRadius: 12, background: "var(--brass)", color: "#fff", fontWeight: 800, border: "none" }}>Add</button>
        </div>
      )}
    </div>
  );
}

const scannerStyle = { position: "fixed", inset: 0, zIndex: 80, background: "#000", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column" };
const closeBtnStyle = { position: "absolute", top: "calc(14px + env(safe-area-inset-top,0))", right: 16, zIndex: 5, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,.18)", color: "#fff", fontSize: 26, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" };
const frameStyle = { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "78%", maxWidth: 320, height: 120, border: "3px solid var(--brass)", borderRadius: 14, boxShadow: "0 0 0 999px rgba(0,0,0,.35)", pointerEvents: "none" };
const statusStyle = { position: "absolute", bottom: 110, left: 16, right: 16, textAlign: "center", color: "#fff", fontSize: 14, fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,.6)" };
const manualWrapStyle = { position: "absolute", left: 16, right: 16, bottom: 24, display: "flex", gap: 8 };
