import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import {
  Bluetooth,
  Camera,
  CheckCircle2,
  Flashlight,
  ImageUp,
  Keyboard,
  QrCode,
  RefreshCw,
  ScanBarcode,
  Trash2,
  Wifi,
  X,
} from 'lucide-react';
import {
  BlePacketFormat,
  ControllerProtocol,
  ScannedModuleRecord,
} from '../types/controller';
import { ParsedModuleBarcode, parseModuleBarcode } from '../utils/moduleBarcodeParser';

interface BarcodeScannerModalProps {
  open: boolean;
  scannedModules: ScannedModuleRecord[];
  onClose: () => void;
  onApplyScannedModule: (
    parsed: ParsedModuleBarcode,
    action: 'connect' | 'save'
  ) => void;
  onReconnectSavedModule: (record: ScannedModuleRecord) => void;
  onDeleteSavedModule: (id: string) => void;
}

interface NativeBarcodeResult {
  rawValue?: string;
  format?: string;
}

interface NativeBarcodeDetector {
  detect(source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<NativeBarcodeResult[]>;
}

interface NativeBarcodeDetectorCtor {
  new (options?: { formats?: string[] }): NativeBarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

const REQUESTED_BARCODE_FORMATS = [
  'qr_code',
  'code_128',
  'code_39',
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'data_matrix',
  'itf',
];

function getNativeBarcodeDetector(): NativeBarcodeDetectorCtor | null {
  const win = window as unknown as { BarcodeDetector?: NativeBarcodeDetectorCtor };
  return typeof win.BarcodeDetector === 'function' ? win.BarcodeDetector : null;
}

async function createSafeNativeDetector(): Promise<NativeBarcodeDetector | null> {
  const NativeDetector = getNativeBarcodeDetector();
  if (!NativeDetector) return null;

  try {
    if (typeof NativeDetector.getSupportedFormats === 'function') {
      const supported = await NativeDetector.getSupportedFormats().catch((): string[] => []);
      const filtered = REQUESTED_BARCODE_FORMATS.filter((f) => supported.includes(f));
      if (filtered.length > 0) {
        return new NativeDetector({ formats: filtered });
      }
      if (supported.length > 0) {
        return new NativeDetector();
      }
      return null;
    }
    return new NativeDetector({ formats: REQUESTED_BARCODE_FORMATS });
  } catch {
    try {
      return new NativeDetector();
    } catch {
      return null;
    }
  }
}

function mapZxingFormatLabel(fmt: BarcodeFormat | undefined): string {
  switch (fmt) {
    case BarcodeFormat.QR_CODE:
      return 'QR Code';
    case BarcodeFormat.CODE_128:
      return 'Code 128';
    case BarcodeFormat.CODE_39:
      return 'Code 39';
    case BarcodeFormat.EAN_13:
      return 'EAN-13';
    case BarcodeFormat.EAN_8:
      return 'EAN-8';
    case BarcodeFormat.UPC_A:
      return 'UPC-A';
    case BarcodeFormat.UPC_E:
      return 'UPC-E';
    case BarcodeFormat.DATA_MATRIX:
      return 'Data Matrix';
    case BarcodeFormat.ITF:
      return 'ITF';
    default:
      return 'Barcode';
  }
}

async function waitForVideoReady(videoEl: HTMLVideoElement): Promise<void> {
  if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) return;
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      videoEl.removeEventListener('loadedmetadata', finish);
      videoEl.removeEventListener('canplay', finish);
      resolve();
    };
    videoEl.addEventListener('loadedmetadata', finish);
    videoEl.addEventListener('canplay', finish);
    window.setTimeout(finish, 900);
  });
}

async function acquireCameraStream(
  facingMode: 'environment' | 'user',
  preferredDeviceId?: string
): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('UNSUPPORTED_MEDIA_DEVICES');
  }

  const attempts: MediaStreamConstraints[] = [];
  if (preferredDeviceId) {
    attempts.push({ audio: false, video: { deviceId: { exact: preferredDeviceId } } });
  }
  if (facingMode === 'environment') {
    attempts.push({
      audio: false,
      video: { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    attempts.push({
      audio: false,
      video: { facingMode: { exact: 'environment' } },
    });
  }
  attempts.push({
    audio: false,
    video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
  });
  attempts.push({ audio: false, video: { facingMode } });
  attempts.push({ audio: false, video: true });

  let lastError: unknown = null;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastError = err;
      const errName = err instanceof Error ? err.name : '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        throw err;
      }
    }
  }

  // Upaya terakhir: coba deviceId dari daftar enumerateDevices(), prioritaskan kamera belakang
  if (navigator.mediaDevices.enumerateDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter((d) => d.kind === 'videoinput' && d.deviceId)
        .sort((a, b) => {
          const aBack = /back|rear|environment/i.test(a.label) ? 0 : 1;
          const bBack = /back|rear|environment/i.test(b.label) ? 0 : 1;
          return facingMode === 'environment' ? aBack - bBack : bBack - aBack;
        });
      for (const dev of videoDevices) {
        try {
          return await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { deviceId: { exact: dev.deviceId } },
          });
        } catch (err) {
          lastError = err;
        }
      }
    } catch {
      // abaikan
    }
  }

  throw lastError instanceof Error ? lastError : new Error('CAMERA_OPEN_FAILED');
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  open,
  scannedModules,
  onClose,
  onApplyScannedModule,
  onReconnectSavedModule,
  onDeleteSavedModule,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraSessionRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);
  const handledScanRef = useRef<boolean>(false);
  const scanBusyRef = useRef<boolean>(false);

  const [scanTab, setScanTab] = useState<'camera' | 'image' | 'manual'>('camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'active' | 'error'>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const [manualInput, setManualInput] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);

  const [parsedResult, setParsedResult] = useState<ParsedModuleBarcode | null>(null);
  const [editName, setEditName] = useState('');
  const [editProtocol, setEditProtocol] = useState<ControllerProtocol>('ble');
  const [editBleFormat, setEditBleFormat] = useState<BlePacketFormat>('dmx-ble');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const stopCamera = useCallback(() => {
    cameraSessionRef.current += 1;
    if (scanTimerRef.current !== null) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    scanBusyRef.current = false;
    if (scanCanvasRef.current) {
      scanCanvasRef.current.width = 0;
      scanCanvasRef.current.height = 0;
      scanCanvasRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // ignore
      }
      videoRef.current.srcObject = null;
    }
    if (mountedRef.current) {
      setTorchSupported(false);
      setTorchOn(false);
      setCameraState('idle');
    }
  }, []);

  const acceptScannedText = useCallback(
    (rawText: string, formatLabel: string) => {
      const trimmed = rawText.trim();
      if (!trimmed) return;
      handledScanRef.current = true;
      stopCamera();
      const parsed = parseModuleBarcode(trimmed, formatLabel);
      setParsedResult(parsed);
      setEditName(parsed.moduleName);
      setEditProtocol(parsed.protocol);
      setEditBleFormat(parsed.bleFormat || 'dmx-ble');
      setImageError(null);
    },
    [stopCamera]
  );

  const startCamera = useCallback(async () => {
    stopCamera();
    const sessionId = ++cameraSessionRef.current;
    handledScanRef.current = false;
    setCameraError(null);
    setCameraState('starting');

    try {
      const stream = await acquireCameraStream(facingMode, selectedDeviceId || undefined);

      // Abort immediately if modal closed, unmounted, or superseded while getUserMedia resolved
      if (!mountedRef.current || sessionId !== cameraSessionRef.current) {
        stream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {
            // ignore
          }
        });
        return;
      }

      const videoEl = videoRef.current;
      if (!videoEl) {
        stream.getTracks().forEach((t) => t.stop());
        setCameraState('error');
        setCameraError('Elemen tampilan kamera belum siap. Tekan "Buka Kamera" kembali.');
        return;
      }

      streamRef.current = stream;
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('webkit-playsinline', 'true');
      videoEl.muted = true;
      videoEl.srcObject = stream;

      await waitForVideoReady(videoEl);
      if (!mountedRef.current || sessionId !== cameraSessionRef.current) {
        stopCamera();
        return;
      }

      try {
        await videoEl.play();
      } catch {
        // Beberapa WebView sudah autoplay otomatis dari srcObject
      }

      if (!mountedRef.current || sessionId !== cameraSessionRef.current) {
        stopCamera();
        return;
      }

      setCameraState('active');
      try {
        setTorchSupported(BrowserMultiFormatReader.mediaStreamIsTorchCompatible(stream));
      } catch {
        setTorchSupported(false);
      }

      if (navigator.mediaDevices?.enumerateDevices) {
        navigator.mediaDevices
          .enumerateDevices()
          .then((list) => {
            if (mountedRef.current && sessionId === cameraSessionRef.current) {
              setCameras(list.filter((d) => d.kind === 'videoinput'));
            }
          })
          .catch(() => {});
      }

      const hints = new Map<DecodeHintType, unknown>();
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.ITF,
      ]);

      const zxingReader = new BrowserMultiFormatReader(hints);
      let nativeDetector = await createSafeNativeDetector();
      if (!mountedRef.current || sessionId !== cameraSessionRef.current) {
        stopCamera();
        return;
      }
      let nativeFailCount = 0;
      let frameIndex = 0;

      const canvas = document.createElement('canvas');
      scanCanvasRef.current = canvas;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      scanTimerRef.current = window.setInterval(async () => {
        if (
          handledScanRef.current ||
          scanBusyRef.current ||
          !streamRef.current ||
          sessionId !== cameraSessionRef.current
        ) {
          return;
        }
        const vid = videoRef.current;
        if (!vid || vid.readyState < 2 || vid.videoWidth === 0 || vid.videoHeight === 0) return;

        scanBusyRef.current = true;
        frameIndex += 1;
        try {
          if (nativeDetector) {
            try {
              const hits = await nativeDetector.detect(vid);
              nativeFailCount = 0;
              const first = hits.find((h) => h.rawValue && h.rawValue.trim());
              if (first?.rawValue && !handledScanRef.current && sessionId === cameraSessionRef.current) {
                acceptScannedText(
                  first.rawValue,
                  (first.format || 'Barcode').toUpperCase().replace(/_/g, ' ')
                );
                return;
              }
            } catch {
              nativeFailCount += 1;
              if (nativeFailCount >= 3) {
                nativeDetector = null;
              }
            }
          }

          if (ctx) {
            // Bergantian antara full-frame (640px) & fokus reticle tengah agar ringan di Android WebView
            const cropCenter = frameIndex % 2 === 0;
            const srcW = vid.videoWidth;
            const srcH = vid.videoHeight;
            const sx = cropCenter ? Math.round(srcW * 0.15) : 0;
            const sy = cropCenter ? Math.round(srcH * 0.15) : 0;
            const sw = cropCenter ? Math.round(srcW * 0.7) : srcW;
            const sh = cropCenter ? Math.round(srcH * 0.7) : srcH;
            const maxDim = 640;
            const scale = Math.min(1, maxDim / Math.max(sw, sh));
            const w = Math.max(120, Math.round(sw * scale));
            const h = Math.max(120, Math.round(sh * scale));
            if (canvas.width !== w) canvas.width = w;
            if (canvas.height !== h) canvas.height = h;
            ctx.drawImage(vid, sx, sy, sw, sh, 0, 0, w, h);

            try {
              const result = zxingReader.decodeFromCanvas(canvas);
              if (result && !handledScanRef.current && sessionId === cameraSessionRef.current) {
                acceptScannedText(
                  result.getText(),
                  mapZxingFormatLabel(result.getBarcodeFormat())
                );
              }
            } catch {
              // Normal saat belum ada barcode di frame kamera
            }
          }
        } finally {
          scanBusyRef.current = false;
        }
      }, 220);
    } catch (err) {
      if (!mountedRef.current || sessionId !== cameraSessionRef.current) return;
      stopCamera();
      setCameraState('error');
      const errName = err instanceof Error ? err.name : '';
      const errMsg = err instanceof Error ? err.message : '';

      if (errMsg === 'UNSUPPORTED_MEDIA_DEVICES') {
        setCameraError(
          'Browser / WebView ini belum mengaktifkan API kamera langsung. Gunakan tombol "Foto Kamera HP" di bawah untuk memotret barcode langsung.'
        );
      } else if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError(
          'Akses kamera diblokir browser/sistem (NotAllowedError). Tekan tombol "Izinkan & Buka Kamera" atau pakai "Foto Kamera HP" untuk memotret barcode langsung.'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError(
          'Kamera tidak ditemukan pada perangkat ini. Anda tetap bisa memakai tombol "Foto Kamera HP" atau "Pilih Gambar".'
        );
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraError(
          'Kamera sedang dipakai oleh aplikasi lain. Tutup aplikasi kamera lain lalu tekan "Buka Kamera" lagi.'
        );
      } else {
        setCameraError(
          `Kamera live belum merespons (${errName || 'error'}). Gunakan tombol "Buka Kamera" lagi atau pakai "Foto Kamera HP".`
        );
      }
    }
  }, [acceptScannedText, facingMode, selectedDeviceId, stopCamera]);

  useEffect(() => {
    if (open) {
      handledScanRef.current = false;
      setScanTab('camera');
      setCameraError(null);
      setImageError(null);
      setImageBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      handledScanRef.current = false;
      setParsedResult(null);
      setCameraError(null);
      setImageError(null);
      setImageBusy(false);
      return;
    }

    if (scanTab === 'camera' && !parsedResult) {
      const raf = requestAnimationFrame(() => {
        void startCamera();
      });
      return () => {
        cancelAnimationFrame(raf);
        stopCamera();
      };
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [open, scanTab, parsedResult, startCamera, stopCamera]);

  const handleToggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchSupported) return;
    const next = !torchOn;
    try {
      await BrowserMultiFormatReader.mediaStreamSetTorch(track, next);
      setTorchOn(next);
    } catch {
      // ignore if unsupported by hardware driver
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImageError(null);
    setImageBusy(true);
    const objectUrl = URL.createObjectURL(file);
    let decodeCanvas: HTMLCanvasElement | null = null;

    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Gagal memuat gambar'));
        img.src = objectUrl;
      });

      const maxDim = 1280;
      const scale = Math.min(1, maxDim / Math.max(1, img.naturalWidth || img.width, img.naturalHeight || img.height));
      const targetW = Math.max(64, Math.round((img.naturalWidth || img.width) * scale));
      const targetH = Math.max(64, Math.round((img.naturalHeight || img.height) * scale));

      decodeCanvas = document.createElement('canvas');
      decodeCanvas.width = targetW;
      decodeCanvas.height = targetH;
      const dCtx = decodeCanvas.getContext('2d', { willReadFrequently: true });
      if (dCtx) {
        dCtx.drawImage(img, 0, 0, targetW, targetH);
      }

      const nativeDetector = await createSafeNativeDetector();
      if (nativeDetector && decodeCanvas) {
        try {
          const hits = await nativeDetector.detect(decodeCanvas);
          const first = hits.find((h) => h.rawValue && h.rawValue.trim());
          if (first?.rawValue) {
            acceptScannedText(
              first.rawValue,
              (first.format || 'Barcode').toUpperCase().replace(/_/g, ' ')
            );
            return;
          }
        } catch {
          // fallback to ZXing
        }
      }

      const hints = new Map<DecodeHintType, unknown>();
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.ITF,
      ]);
      const reader = new BrowserMultiFormatReader(hints);

      try {
        const res = decodeCanvas
          ? reader.decodeFromCanvas(decodeCanvas)
          : await reader.decodeFromImageUrl(objectUrl);
        acceptScannedText(res.getText(), mapZxingFormatLabel(res.getBarcodeFormat()));
        return;
      } catch {
        // Coba crop tengah 65% jika stiker barcode kecil di foto kamera HP
        if (decodeCanvas && dCtx) {
          try {
            const natW = img.naturalWidth || img.width;
            const natH = img.naturalHeight || img.height;
            const cropW = Math.max(120, Math.round(natW * 0.65));
            const cropH = Math.max(120, Math.round(natH * 0.65));
            const cropX = Math.round((natW - cropW) / 2);
            const cropY = Math.round((natH - cropH) / 2);
            const cropScale = Math.min(1, 1024 / Math.max(cropW, cropH));
            decodeCanvas.width = Math.max(120, Math.round(cropW * cropScale));
            decodeCanvas.height = Math.max(120, Math.round(cropH * cropScale));
            dCtx.drawImage(
              img,
              cropX,
              cropY,
              cropW,
              cropH,
              0,
              0,
              decodeCanvas.width,
              decodeCanvas.height
            );
            const centerRes = reader.decodeFromCanvas(decodeCanvas);
            acceptScannedText(
              centerRes.getText(),
              mapZxingFormatLabel(centerRes.getBarcodeFormat())
            );
            return;
          } catch {
            // lanjut ke pesan error
          }
        }
        setImageError(
          'Barcode atau QR tidak terbaca pada foto ini. Pastikan kode terlihat jelas & tidak blur.'
        );
      }
    } catch {
      setImageError('Gagal memproses gambar barcode. Coba foto ulang yang lebih terang.');
    } finally {
      if (decodeCanvas) {
        decodeCanvas.width = 0;
        decodeCanvas.height = 0;
      }
      URL.revokeObjectURL(objectUrl);
      if (mountedRef.current) {
        setImageBusy(false);
      }
    }
  };

  const handleProcessManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    acceptScannedText(manualInput, 'Input Manual');
  };

  const handleConfirmScanned = (action: 'connect' | 'save') => {
    if (!parsedResult) return;
    const finalized: ParsedModuleBarcode = {
      ...parsedResult,
      moduleName: editName.trim() || parsedResult.moduleName,
      protocol: editProtocol,
      family:
        editProtocol === 'ble'
          ? 'bluetooth'
          : editProtocol === 'http-json'
            ? 'wled'
            : editProtocol === 'artnet-ws'
              ? 'dmx'
              : 'esp8266',
      bleFormat: editProtocol === 'ble' ? editBleFormat : undefined,
      ipAddress:
        editProtocol !== 'ble' ? parsedResult.ipAddress || '192.168.4.1' : undefined,
      port:
        editProtocol !== 'ble'
          ? parsedResult.port ||
            (editProtocol === 'http-json' ? 80 : editProtocol === 'artnet-ws' ? 6454 : 81)
          : undefined,
    };
    onApplyScannedModule(finalized, action);
    if (action === 'connect') {
      onClose();
    } else {
      setParsedResult(null);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Scan Barcode dan QR Modul"
    >
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-[#111622] border border-white/[0.1] p-4 sm:p-5 space-y-4 shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/35 text-cyan-400 flex items-center justify-center shrink-0">
              <ScanBarcode className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-sm font-semibold text-slate-100 truncate">
                Scan Barcode / QR Modul
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Dukung QR Code &amp; Barcode stiker kotak modul LED DMX, BLE, WLED &amp; RNS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            aria-label="Tutup scanner barcode"
            className="min-w-[36px] min-h-[36px] rounded-xl bg-[#171F2E] text-slate-300 hover:text-white flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Jika sudah ada hasil scan -> tampilkan Konfirmasi & Sambungkan */}
        {parsedResult ? (
          <div className="space-y-3 rounded-2xl bg-[#0B0F17] border border-cyan-400/40 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-emerald-300">
                    Barcode Modul Terbaca ({parsedResult.formatLabel})
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {parsedResult.summary}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  handledScanRef.current = false;
                  setParsedResult(null);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#171F2E] text-[11px] text-slate-300 hover:text-white shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Scan Ulang</span>
              </button>
            </div>

            <div className="rounded-xl bg-[#111622] border border-white/[0.06] px-3 py-2">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                Isi Kode Terbaca
              </div>
              <div className="text-xs font-mono text-cyan-300 break-all mt-0.5">
                {parsedResult.rawCode}
              </div>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Nama Modul Tersimpan
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-[#111622] border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-400/60"
                />
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block mb-1">
                  Jenis Koneksi Modul
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditProtocol('ble')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                      editProtocol === 'ble'
                        ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                        : 'bg-[#111622] border-white/[0.07] text-slate-400'
                    }`}
                  >
                    <Bluetooth className="w-3.5 h-3.5" />
                    <span>Bluetooth BLE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditProtocol('websocket')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                      editProtocol !== 'ble'
                        ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                        : 'bg-[#111622] border-white/[0.07] text-slate-400'
                    }`}
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    <span>Wi-Fi ESP / WLED</span>
                  </button>
                </div>
              </div>

              {editProtocol === 'ble' && (
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">
                    Format Protokol Bluetooth
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'dmx-ble', label: 'LED DMX (4-Kabel)' },
                        { id: 'elk-bledom', label: 'LEDLamp / ELK' },
                        { id: 'rns-json', label: 'RNS Matrix BLE' },
                        { id: 'triones', label: 'Triones BLE' },
                      ] as const
                    ).map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setEditBleFormat(fmt.id)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border ${
                          editBleFormat === fmt.id
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-semibold'
                            : 'bg-[#111622] border-white/[0.06] text-slate-300'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleConfirmScanned('connect')}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 min-h-[42px]"
              >
                {editProtocol === 'ble' ? (
                  <Bluetooth className="w-4 h-4" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
                <span>Simpan &amp; Hubungkan</span>
              </button>
              <button
                type="button"
                onClick={() => handleConfirmScanned('save')}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#171F2E] border border-white/[0.08] text-xs font-medium text-slate-200 hover:text-white min-h-[42px]"
              >
                <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>Simpan ke Daftar</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Mode Pilihan Input Scan */}
            <div className="grid grid-cols-3 gap-1.5 bg-[#0B0F17] p-1 rounded-xl border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setScanTab('camera')}
                className={`inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-colors ${
                  scanTab === 'camera'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Kamera</span>
              </button>
              <button
                type="button"
                onClick={() => setScanTab('image')}
                className={`inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-colors ${
                  scanTab === 'image'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ImageUp className="w-3.5 h-3.5" />
                <span>Foto</span>
              </button>
              <button
                type="button"
                onClick={() => setScanTab('manual')}
                className={`inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-colors ${
                  scanTab === 'manual'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Input Kode</span>
              </button>
            </div>

            {/* 1. SCAN KAMERA LIVE */}
            {scanTab === 'camera' && (
              <div className="space-y-2.5">
                <div className="relative rounded-2xl overflow-hidden bg-black border border-white/[0.1] aspect-[4/3]">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover"
                  />

                  {/* Reticle Overlay */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="w-52 h-52 sm:w-56 sm:h-56 relative">
                      <span className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-cyan-400 rounded-tl-xl" />
                      <span className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-cyan-400 rounded-tr-xl" />
                      <span className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-cyan-400 rounded-bl-xl" />
                      <span className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-cyan-400 rounded-br-xl" />
                      {cameraState === 'active' && (
                        <span className="absolute left-3 right-3 top-1/2 h-0.5 bg-cyan-400/80 shadow-[0_0_8px_#22d3ee] animate-pulse" />
                      )}
                    </div>
                  </div>

                  {cameraState === 'starting' && (
                    <div className="absolute inset-0 bg-[#090C12]/80 flex items-center justify-center text-xs text-slate-300">
                      Menyalakan kamera scanner...
                    </div>
                  )}

                  {cameraState === 'error' && (
                    <div className="absolute inset-0 bg-[#090C12]/92 p-4 flex flex-col items-center justify-center text-center gap-2.5">
                      <Camera className="w-7 h-7 text-amber-400" />
                      <p className="text-xs text-amber-200 leading-relaxed max-w-xs">
                        {cameraError}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => void startCamera()}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-semibold min-h-[36px]"
                        >
                          Izinkan &amp; Buka Kamera
                        </button>
                        <label className="px-3 py-1.5 rounded-lg bg-[#171F2E] border border-cyan-400/45 text-cyan-200 text-xs font-semibold cursor-pointer min-h-[36px] inline-flex items-center">
                          <span>Foto Kamera HP</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleImageUpload}
                            className="sr-only"
                            disabled={imageBusy}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {cameras.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 shrink-0">Pilih Kamera:</span>
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      className="flex-1 h-8 px-2.5 rounded-lg bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-200"
                    >
                      <option value="">Otomatis ({facingMode === 'environment' ? 'Belakang' : 'Depan'})</option>
                      {cameras.map((cam, idx) => (
                        <option key={cam.deviceId} value={cam.deviceId}>
                          {cam.label || `Kamera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    Arahkan kamera ke stiker QR / Barcode kotak modul.
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {torchSupported && (
                      <button
                        type="button"
                        onClick={() => void handleToggleTorch()}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border ${
                          torchOn
                            ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                            : 'bg-[#171F2E] border-white/[0.08] text-slate-300'
                        }`}
                      >
                        <Flashlight className="w-3.5 h-3.5" />
                        <span>Flash</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDeviceId('');
                        setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'));
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#171F2E] border border-white/[0.08] text-[11px] font-medium text-slate-300 hover:text-white"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Ganti Kamera</span>
                    </button>
                    <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#171F2E] border border-cyan-400/35 text-[11px] font-medium text-cyan-200 cursor-pointer hover:text-white">
                      <Camera className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{imageBusy ? 'Membaca...' : 'Potret Barcode'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageUpload}
                        className="sr-only"
                        disabled={imageBusy}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 2. UPLOAD FOTO BARCODE / SCREENSHOT */}
            {scanTab === 'image' && (
              <div className="rounded-2xl bg-[#0B0F17] border border-dashed border-cyan-400/40 p-5 text-center space-y-3">
                <QrCode className="w-8 h-8 text-cyan-400 mx-auto" />
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-100">
                    Ambil Foto / Pilih Gambar Barcode Modul
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Bisa langsung buka kamera foto HP atau pilih foto stiker kotak LED LAMP → LED DMX dari galeri.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 cursor-pointer min-h-[42px]">
                    <Camera className="w-4 h-4" />
                    <span>{imageBusy ? 'Membaca Barcode...' : 'Buka Kamera Foto HP'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                      className="sr-only"
                      disabled={imageBusy}
                    />
                  </label>

                  <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#171F2E] border border-white/[0.1] text-xs font-semibold text-slate-200 hover:text-white cursor-pointer min-h-[42px]">
                    <ImageUp className="w-4 h-4 text-cyan-400" />
                    <span>Pilih dari Galeri</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="sr-only"
                      disabled={imageBusy}
                    />
                  </label>
                </div>

                {imageError && (
                  <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-400/25 rounded-xl px-3 py-2">
                    {imageError}
                  </p>
                )}
              </div>
            )}

            {/* 3. INPUT KODE BARCODE MANUAL */}
            {scanTab === 'manual' && (
              <form
                onSubmit={handleProcessManual}
                className="rounded-2xl bg-[#0B0F17] border border-white/[0.08] p-4 space-y-3"
              >
                <div>
                  <label htmlFor="manual-barcode-input" className="text-xs font-medium text-slate-200 block mb-1">
                    Masukkan Nomor Barcode / Payload QR Modul
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Contoh: kode stiker modul (<span className="font-mono text-slate-300">C.ID.0096</span>, <span className="font-mono text-slate-300">LEDDMX-3232</span>), MAC Bluetooth, IP Wi-Fi, atau QR text.
                  </p>
                  <input
                    id="manual-barcode-input"
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Ketik atau tempel kode barcode di sini..."
                    className="w-full h-10 px-3 rounded-xl bg-[#111622] border border-white/[0.1] text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400/60"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 min-h-[42px]"
                >
                  Proses Kode Modul
                </button>
              </form>
            )}
          </>
        )}

        {/* Daftar Barcode Modul Tersimpan */}
        {scannedModules.length > 0 && (
          <div className="pt-3 border-t border-white/[0.08] space-y-2">
            <div className="text-xs font-semibold text-slate-200">
              Riwayat Modul Hasil Scan ({scannedModules.length})
            </div>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
              {scannedModules.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-[#0B0F17] border border-white/[0.07] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100 truncate">
                      {item.moduleName}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate">
                      {item.formatLabel} · {item.rawCode}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onReconnectSavedModule(item);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-[11px] font-semibold hover:bg-cyan-400"
                    >
                      Konek
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSavedModule(item.id)}
                      aria-label={`Hapus ${item.moduleName}`}
                      className="p-1.5 rounded-lg bg-[#171F2E] text-slate-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
