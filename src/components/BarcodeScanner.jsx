import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function BarcodeScanner({
  onScanned,
  onClose,
  products = [],
}) {
  const videoRef = useRef(null);

  // ZXing controls returned by decodeFromVideoElement()
  const controlsRef = useRef(null);

  // Camera stream
  const streamRef = useRef(null);
  const trackRef = useRef(null);
  const scanningRef = useRef(false);

  // Prevent duplicate scans
  const lastScanRef = useRef({
    code: null,
    time: 0,
  });

  const feedbackTimerRef = useRef(null);

  const [error, setError] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    startScanner();

    return () => {
      clearTimeout(feedbackTimerRef.current);
      stopScanner();
    };
  }, []);

  async function startScanner() {
    try {
      setError("");

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setError(
          "Camera access is not supported by this browser."
        );
        return;
      }

      /*
       * Get camera ourselves so we can also support torch.
       */
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
        },
        audio: false,
      });

      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];

      trackRef.current = track;

      /*
       * Give the stream to the video.
       *
       * Do NOT call video.play() manually here.
       */
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      /*
       * Create ZXing reader.
       */
      const reader = new BrowserMultiFormatReader();

      /*
       * ZXing controls the decoding process.
       *
       * IMPORTANT:
       * save the returned controls object.
       */
      const controls = await reader.decodeFromVideoElement(
        videoRef.current,
        (result, error) => {

          // Ignore barcode results while showing feedback
          if (scanningRef.current) {
            return;
          }

          if (result) {
            const code = result.getText()?.trim();

            if (code) {
              processBarcode(code);
            }
          }

          /*
           * NotFoundException is normal while scanning.
           *
           * Do NOT display it as an error.
           */
        }
      );

      controlsRef.current = controls;
    } catch (err) {
      console.error("Scanner error:", err);

      if (err?.name === "NotAllowedError") {
        setError(
          "Camera permission was denied. Please allow camera access."
        );
      } else if (err?.name === "NotFoundError") {
        setError(
          "No camera was found on this device."
        );
      } else {
        setError(
          "Camera could not be started. Please try again."
        );
      }
    }
  }

  function processBarcode(code) {
    if (scanningRef.current) {
      return;
    }


    const now = Date.now();


    /*
     * Prevent the same barcode from being scanned
     * repeatedly while it remains in front of camera.
     */
    if (
      lastScanRef.current.code === code &&
      now - lastScanRef.current.time < 1500
    ) {
      return;
    }

    lastScanRef.current = {
      code,
      time: now,
    };

    scanningRef.current = true;
    /*
     * Find product.
     */
    const product = products.find(
      (p) =>
        String(p.barcode).trim() ===
        String(code).trim()
    );

    /*
     * Vibrate on successful scan.
     */
    if (navigator.vibrate) {
      navigator.vibrate(80);
    }

    if (product) {
      /*
       * Add product to cart.
       *
       * NewBill handles the actual cart update.
       */
      onScanned(code);

      /*
       * Show product feedback.
       */
      showSuccess(product, code);
    } else {
      /*
       * Barcode scanned but product doesn't exist.
       */
      showNotFound(code);
    }
  }


  function showSuccess(product, code) {
    clearTimeout(feedbackTimerRef.current);

    setFeedback({
      type: "success",
      product,
      code,
    });

    /*
     * Show product for exactly ~2 second.
     */
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
      scanningRef.current = false;
    }, 2000);
  }

  function showNotFound(code) {
    clearTimeout(feedbackTimerRef.current);

    setFeedback({
      type: "error",
      code,
    });

    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
      scanningRef.current = false;
    }, 2000);
  }

  function stopScanner() {
    /*
     * Stop ZXing decoding.
     */
    try {
      controlsRef.current?.stop();
    } catch (err) {
      console.error("Error stopping ZXing:", err);
    }

    controlsRef.current = null;

    /*
     * Stop camera.
     */
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    trackRef.current = null;

    /*
     * Detach video stream.
     */
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setTorchOn(false);
  }

  async function toggleTorch() {
    const track = trackRef.current;

    if (!track) return;

    try {
      const capabilities = track.getCapabilities?.();

      if (!capabilities?.torch) {
        return;
      }

      const next = !torchOn;

      await track.applyConstraints({
        advanced: [
          {
            torch: next,
          },
        ],
      });

      setTorchOn(next);
    } catch (err) {
      console.error(
        "Torch is not supported:",
        err
      );
    }
  }

  function closeScanner() {
    stopScanner();
    onClose?.();
  }

  return (
    <div className="barcode-scanner">

      {/* CAMERA */}
      <video
        ref={videoRef}
        className="barcode-video"
        autoPlay
        muted
        playsInline
      />

      {/* SCANNER FRAME */}
      <div className="scanner-overlay">
        <div className="scanner-frame">
          <div className="scanner-laser" />
        </div>
      </div>

      {/* TOP BAR */}
      <div className="scanner-top">

        <div>
          <h2>Scan Barcode</h2>

          <p>
            Point camera at a product barcode
          </p>
        </div>

        <button
          type="button"
          className={`torch-btn ${torchOn ? "active" : ""
            }`}
          onClick={toggleTorch}
        >
          🔦
        </button>

      </div>

      {/* CAMERA ERROR */}
      {error && (
        <div className="scanner-error">
          <div style={{ fontSize: 40 }}>
            📷
          </div>

          <p>{error}</p>
        </div>
      )}

      {/* SCAN FEEDBACK */}
      {feedback && (
        <div className="scanner-feedback">

          {feedback.type === "success" ? (
            <>
              <div className="scanner-success-icon">
                ✓
              </div>

              <div className="scanner-product">

                {/* {feedback.product.img && (
                  <img
                    src={feedback.product.img}
                    alt=""
                  />
                )} */}

                <div>

                  <div className="scanner-added">
                    Added to cart
                  </div>

                  <div className="scanner-product-title">
                    {feedback.product.titleEn}
                  </div>
                  <div className="scanner-product-title">
                    {feedback.product.titleUr}
                  </div>

                  <div className="scanner-code">
                    {feedback.code}
                  </div>

                </div>

              </div>
            </>
          ) : (
            <>
              <div className="scanner-error-icon">
                !
              </div>

              <div className="scanner-not-found">
                Product not found
              </div>

              <div className="scanner-code">
                {feedback.code}
              </div>
            </>
          )}

        </div>
      )}

      {/* BOTTOM */}
      <div className="scanner-bottom">

        <button
          type="button"
          onClick={closeScanner}
        >
          Close scanner
        </button>

      </div>

    </div>
  );
}