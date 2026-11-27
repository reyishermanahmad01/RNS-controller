import { ControllerState, RgbMode } from '../types/controller';
import { createZipBytesAsync } from './zipBuilder';

interface ApkBundleAssets {
  js: string;
  css: string;
}

const WEBINTOAPP_FREE_ZIP_LIMIT_BYTES = 1_900_000;

async function fetchRealAppBundle(): Promise<ApkBundleAssets> {
  const endpoints = ['/__rns_apk_bundle.json', '/rns-apk-bundle.json'];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as Partial<ApkBundleAssets>;
        if (typeof data.js === 'string' && data.js.length > 0) {
          return {
            js: data.js,
            css: typeof data.css === 'string' ? data.css : '',
          };
        }
      }
    } catch {
      // Try next endpoint
    }
  }
  throw new Error('Gagal menyiapkan paket aplikasi mandiri. Muat ulang halaman lalu coba lagi.');
}

function buildBootSnapshot(
  state: ControllerState,
  options?: { stripInlineMedia?: boolean }
): string {
  const customization = options?.stripInlineMedia
    ? {
        ...state.customization,
        backgroundImageUrl: state.customization.backgroundImageUrl?.startsWith('data:')
          ? ''
          : state.customization.backgroundImageUrl,
        customLogoUrl: state.customization.customLogoUrl?.startsWith('data:')
          ? ''
          : state.customization.customLogoUrl,
      }
    : state.customization;

  const snapshot: Partial<ControllerState> = {
    activeModeId: state.activeModeId,
    speed: state.speed,
    brightness: state.brightness,
    solidColor: state.solidColor,
    favorites: state.favorites,
    combo: state.combo,
    special: state.special,
    led: { ...state.led, testOverride: 'none' },
    device: { ...state.device, connectionStatus: 'simulation' },
    customization,
    cloudMeta: state.cloudMeta,
  };
  return JSON.stringify(snapshot).replace(/</g, '\\u003c');
}

function buildApkIndexHtml(
  state: ControllerState,
  inlineBundle?: ApkBundleAssets,
  options?: { stripInlineMedia?: boolean }
): string {
  const title = (state.customization.appName || 'RNS Controller').replace(/</g, '&lt;');
  const bootJson = buildBootSnapshot(state, options);

  const cssTag = inlineBundle
    ? `<style>${inlineBundle.css}</style>`
    : `<link rel="stylesheet" href="./app.css" />`;

  const scriptTag = inlineBundle
    ? `<script>${inlineBundle.js.replace(/<\/script>/gi, '<\\/script>')}</script>`
    : `<script src="./app.js" defer></script>`;

  return `<!doctype html>
<html lang="id" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#090C12" />
    <title>${title}</title>
    ${cssTag}
  </head>
  <body class="bg-[#090C12] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-100">
    <div id="root"></div>
    <script>
      window.__RNS_APK_MODE__ = true;
      window.__RNS_BOOT_STATE__ = ${bootJson};
    </script>
    ${scriptTag}
  </body>
</html>`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 15000);
}

/**
 * Generates and downloads a 100% identical self-contained HTML version of the full React app.
 */
export async function downloadStandaloneHtmlApp(
  state: ControllerState,
  _modesArg?: RgbMode[]
): Promise<void> {
  const bundle = await fetchRealAppBundle();
  const html = buildApkIndexHtml(state, bundle);
  triggerDownload(new Blob([html], { type: 'text/html;charset=utf-8' }), 'RNS-RGB-Controller.html');
}

/**
 * Generates and downloads a WebIntoApp-ready Deflate-compressed ZIP package (< 2 MB)
 * containing index.html, app.css, and app.js at ZIP root.
 */
export async function downloadApkZipBundle(
  state: ControllerState,
  _modesArg?: RgbMode[]
): Promise<void> {
  const bundle = await fetchRealAppBundle();
  const encoder = new TextEncoder();

  const indexHtml = buildApkIndexHtml(state);
  let zipBytes = await createZipBytesAsync([
    { name: 'index.html', data: encoder.encode(indexHtml) },
    { name: 'app.css', data: encoder.encode(bundle.css) },
    { name: 'app.js', data: encoder.encode(bundle.js) },
  ]);

  // If custom uploaded base64 wallpaper/logo pushes ZIP close to WebIntoApp's 2 MB free cap,
  // strip inline data: URLs from initial boot snapshot (Cloud OTA will still hydrate them).
  if (zipBytes.length > WEBINTOAPP_FREE_ZIP_LIMIT_BYTES) {
    const compactHtml = buildApkIndexHtml(state, undefined, { stripInlineMedia: true });
    zipBytes = await createZipBytesAsync([
      { name: 'index.html', data: encoder.encode(compactHtml) },
      { name: 'app.css', data: encoder.encode(bundle.css) },
      { name: 'app.js', data: encoder.encode(bundle.js) },
    ]);
  }

  const copy = new Uint8Array(zipBytes.length);
  copy.set(zipBytes);
  triggerDownload(new Blob([copy], { type: 'application/zip' }), 'RNS-RGB-Controller-APK.zip');
}

export async function downloadAppIconPng(): Promise<void> {
  const res = await fetch('/pwa-512x512.png');
  const blob = await res.blob();
  triggerDownload(blob, 'rns-icon-512.png');
}

export async function downloadProjectArchiveZip(kind: 'full' | 'integration'): Promise<void> {
  const filename =
    kind === 'integration'
      ? 'RNS-ANDROID-INTEGRATION.zip'
      : 'RNS-FULL-SOURCE-CODE-FINAL.zip';
  const res = await fetch(`/${filename}`, { cache: 'no-store' });
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (!res.ok || contentType.includes('text/html')) {
    throw new Error(`Arsip ${filename} belum tersedia di server preview.`);
  }
  const blob = await res.blob();
  triggerDownload(new Blob([blob], { type: 'application/zip' }), filename);
}
