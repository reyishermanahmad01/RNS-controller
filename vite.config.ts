import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {build, defineConfig, Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

async function compileApkIifeBundle(): Promise<{js: string; css: string}> {
  const outDir = path.join(os.tmpdir(), `rns-apk-iife-${process.pid}`);
  await build({
    configFile: false,
    logLevel: 'silent',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir,
      emptyOutDir: true,
      minify: 'esbuild',
      cssCodeSplit: false,
      sourcemap: false,
      rollupOptions: {
        input: path.resolve(__dirname, 'src/main.tsx'),
        output: {
          format: 'iife',
          entryFileNames: 'app.js',
          assetFileNames: 'app.[ext]',
        },
      },
    },
  });

  const jsPath = path.join(outDir, 'app.js');
  const cssPath = path.join(outDir, 'app.css');
  const js = fs.existsSync(jsPath) ? fs.readFileSync(jsPath, 'utf-8') : '';
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf-8') : '';
  fs.rmSync(outDir, {recursive: true, force: true});
  return {js, css};
}

function rnsApkBundlePlugin(): Plugin {
  let cachedJson: string | null = null;
  let cachedAt = 0;
  let inflight: Promise<string> | null = null;

  const getBundleJson = async (): Promise<string> => {
    if (cachedJson && Date.now() - cachedAt < 5000) {
      return cachedJson;
    }
    if (!inflight) {
      inflight = compileApkIifeBundle()
        .then((bundle) => {
          const json = JSON.stringify(bundle);
          cachedJson = json;
          cachedAt = Date.now();
          return json;
        })
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  };

  return {
    name: 'rns-apk-iife-bundle',
    configureServer(server) {
      server.middlewares.use('/__rns_apk_bundle.json', async (_req, res, next) => {
        try {
          const json = await getBundleJson();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(json);
        } catch (err) {
          next(err);
        }
      });
    },
    async closeBundle(error?: Error): Promise<void> {
      if (error) return;
      const distDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(distDir)) return;
      const json = await getBundleJson();
      fs.writeFileSync(path.join(distDir, 'rns-apk-bundle.json'), json, 'utf-8');
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      rnsApkBundlePlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: '/',
          name: 'RNS RGB Controller',
          short_name: 'RNS RGB',
          description: 'Kontroler lampu stoplamp RGB motor berbasis Wemos D1 Mini ESP8266 dengan simulator LED real-time.',
          theme_color: '#090C12',
          background_color: '#090C12',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          globIgnores: ['**/rns-apk-bundle.json'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          navigateFallbackDenylist: [/^\/__\//, /\.zip$/i],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
