import React from 'react';
import {
  Bluetooth,
  BluetoothConnected,
  CheckCircle2,
  Cpu,
  Info,
  Layers,
  Lock,
  Plus,
  ScanBarcode,
  Sliders,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  BlePacketFormat,
  BleTargetZone,
  ControllerState,
  DeviceConfig,
  NavTab,
  ScannedModuleRecord,
} from '../types/controller';
import { BleSessionInfo, isWebBluetoothSupported } from '../utils/bluetoothController';

interface CustomerConnectViewProps {
  state: ControllerState;
  device: DeviceConfig;
  connectionNote: string | null;
  bleSession: BleSessionInfo;
  bleNotice: string | null;
  onUpdateDevice: <K extends keyof DeviceConfig>(key: K, value: DeviceConfig[K]) => void;
  onConnectToggle: () => void;
  onScanBle: (zone?: BleTargetZone, formatOverride?: BlePacketFormat) => void;
  onSetBleZone: (connectionId: string, zone: BleTargetZone) => void;
  onSetBleFormat: (connectionId: string, format: BlePacketFormat) => void;
  onDisconnectBle: (connectionId?: string) => void;
  onOpenTab: (tab: NavTab) => void;
  onCycleSein: () => void;
  onToggleBrake: () => void;
  onToggleReverse: () => void;
  onTriggerWelcome: () => void;
  onOpenComboEditor: () => void;
  onOpenBarcodeScanner: () => void;
  onReconnectScannedModule: (record: ScannedModuleRecord) => void;
}

export const CustomerConnectView: React.FC<CustomerConnectViewProps> = ({
  state,
  device,
  connectionNote,
  bleSession,
  bleNotice,
  onUpdateDevice,
  onConnectToggle,
  onScanBle,
  onSetBleZone,
  onSetBleFormat,
  onDisconnectBle,
  onOpenTab,
  onCycleSein,
  onToggleBrake,
  onToggleReverse,
  onTriggerWelcome,
  onOpenComboEditor,
  onOpenBarcodeScanner,
  onReconnectScannedModule,
}) => {
  const wifiConnected = device.connectionStatus === 'connected';
  const wifiConnecting = device.connectionStatus === 'connecting';
  const bleSupported = isWebBluetoothSupported();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-100 tracking-tight">
            Koneksi Modul LED DMX &amp; Wi-Fi
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Sambungkan MODUL DMX Versi Terbaru (4-Kabel BLE), RNS Wi-Fi, atur LED &amp; Password.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenBarcodeScanner}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 min-h-[36px]"
          >
            <ScanBarcode className="w-3.5 h-3.5" />
            <span>Scan Barcode</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenTab('led')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111622] border border-white/[0.08] text-xs font-medium text-slate-200 hover:border-cyan-400/50 min-h-[36px]"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Atur LED / IC</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenTab('schedule')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111622] border border-white/[0.08] text-xs font-medium text-slate-200 hover:border-cyan-400/50 min-h-[36px]"
          >
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Password</span>
          </button>
        </div>
      </div>

      {/* Ringkasan Status Aktif */}
      <div className="grid grid-cols-2 gap-2.5">
        <div
          className={`rounded-2xl border p-3 flex items-center gap-2.5 ${
            wifiConnected
              ? 'bg-emerald-500/10 border-emerald-400/35'
              : 'bg-[#111622] border-white/[0.08]'
          }`}
        >
          <span
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              wifiConnected
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-[#171F2E] text-cyan-400'
            }`}
          >
            {wifiConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          </span>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400">Status Wi-Fi</div>
            <div className="text-xs font-semibold text-slate-100 truncate">
              {wifiConnected ? 'Terhubung' : wifiConnecting ? 'Menyambung...' : 'Belum Terhubung'}
            </div>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-3 flex items-center gap-2.5 ${
            bleSession.connected
              ? 'bg-emerald-500/10 border-emerald-400/35'
              : 'bg-[#111622] border-white/[0.08]'
          }`}
        >
          <span
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              bleSession.connected
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-[#171F2E] text-cyan-400'
            }`}
          >
            {bleSession.connected ? (
              <BluetoothConnected className="w-4 h-4" />
            ) : (
              <Bluetooth className="w-4 h-4" />
            )}
          </span>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400">Status Bluetooth</div>
            <div className="text-xs font-semibold text-slate-100 truncate">
              {bleSession.connected ? bleSession.deviceName || 'Terhubung' : 'Belum Terhubung'}
            </div>
          </div>
        </div>
      </div>

      {/* KARTU UNGGULAN: MODUL DMX VERSI TERBARU (LED LAMP -> LED DMX · 4 KABEL DATA) */}
      <section className="rounded-2xl bg-[#111622] border border-cyan-400/35 p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3.5 items-start">
          <img
            src="/assets/aistudio/Screenshot_2026-11-22-21-47-08-129_com.ss.android.ugc.trill_6503eb1d.jpg"
            alt="Modul DMX 4 Data Kabel Clariss Audioworks LED LAMP ke LED DMX"
            className="w-full sm:w-28 h-36 sm:h-36 object-cover rounded-xl border border-white/10 shrink-0 bg-[#0B0F17]"
          />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-100">
                MODUL DMX Versi Terbaru (LED LAMP → LED DMX)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Mendukung 4 kabel data (<span className="font-mono text-cyan-300">DA1 · DA2 · GND · 5V</span>), Input <span className="font-mono text-slate-200">12V–24V</span> / Output <span className="font-mono text-slate-200">5V</span>. Fitur bawaan: Mode++, Welcome Light, Bisa Password, Bisa Belang, Sein Dinamis, Rem, Mundur &amp; Hazard.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={onOpenBarcodeScanner}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 min-h-[42px] transition-colors"
              >
                <ScanBarcode className="w-4 h-4" />
                <span>Scan Barcode / QR Modul</span>
              </button>
              <button
                type="button"
                onClick={() => onScanBle('all', 'dmx-ble')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#171F2E] border border-cyan-400/45 text-cyan-200 text-xs font-semibold hover:text-white min-h-[42px] transition-colors"
              >
                <Bluetooth className="w-4 h-4 text-cyan-400" />
                <span>Hubungkan LED DMX (BLE)</span>
              </button>
              <button
                type="button"
                onClick={onOpenComboEditor}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171F2E] border border-white/[0.08] text-xs font-medium text-slate-200 hover:text-white min-h-[42px]"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Atur Belang</span>
              </button>
            </div>
          </div>
        </div>

        {(state.scannedModules?.length ?? 0) > 0 && (
          <div className="pt-2.5 border-t border-white/[0.06] space-y-1.5">
            <div className="text-[11px] font-medium text-slate-400">
              Modul Hasil Scan Barcode Tersimpan:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(state.scannedModules || []).slice(0, 4).map((rec) => (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => onReconnectScannedModule(rec)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0B0F17] border border-cyan-400/35 text-[11px] font-medium text-cyan-200 hover:border-cyan-400"
                >
                  <ScanBarcode className="w-3 h-3 text-cyan-400" />
                  <span className="truncate max-w-[160px]">{rec.moduleName}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Test Sinyal Bawaan Modul DMX */}
        <div className="pt-2.5 border-t border-white/[0.06] space-y-2">
          <div className="text-[11px] font-medium text-slate-400">
            Uji Sinyal Langsung ke Modul LED DMX:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={onCycleSein}
              className={`py-2 px-2 rounded-xl text-xs font-semibold border min-h-[38px] ${
                state.sein !== 'off'
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                  : 'bg-[#0B0F17] border-white/[0.07] text-slate-300'
              }`}
            >
              Sein: {state.sein.toUpperCase()}
            </button>
            <button
              type="button"
              onClick={onToggleBrake}
              className={`py-2 px-2 rounded-xl text-xs font-semibold border min-h-[38px] ${
                state.brakeActive
                  ? 'bg-red-500/20 border-red-400/50 text-red-200'
                  : 'bg-[#0B0F17] border-white/[0.07] text-slate-300'
              }`}
            >
              Rem: {state.brakeActive ? 'ON' : 'Siap'}
            </button>
            <button
              type="button"
              onClick={onToggleReverse}
              className={`py-2 px-2 rounded-xl text-xs font-semibold border min-h-[38px] ${
                state.reverseActive
                  ? 'bg-slate-100 text-slate-950 border-white'
                  : 'bg-[#0B0F17] border-white/[0.07] text-slate-300'
              }`}
            >
              Mundur: {state.reverseActive ? 'ON' : 'Siap'}
            </button>
            <button
              type="button"
              onClick={onTriggerWelcome}
              className="py-2 px-2 rounded-xl text-xs font-semibold border bg-[#0B0F17] border-white/[0.07] text-cyan-300 hover:border-cyan-400/50 min-h-[38px]"
            >
              Putar Welcome
            </button>
          </div>
        </div>
      </section>

      {/* KARTU 2: SAMBUNGAN MULTI-BLUETOOTH */}
      <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                bleSession.connected
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-cyan-500/15 text-cyan-400'
              }`}
            >
              {bleSession.connected ? (
                <BluetoothConnected className="w-5 h-5" />
              ) : (
                <Bluetooth className="w-5 h-5" />
              )}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-100">
                Sambungan Multi-Bluetooth
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {bleSession.connected
                  ? `${bleSession.count} modul terhubung serentak`
                  : 'Bisa konek modul Belakang & Depan sekaligus'}
              </p>
            </div>
          </div>

          {bleSession.connected && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-[11px] font-semibold text-emerald-300 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{bleSession.count} Aktif</span>
            </span>
          )}
        </div>

        {!bleSupported && bleSession.via !== 'android-bridge' && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-400/25 px-3 py-2 text-xs text-amber-200 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Browser ini belum mengaktifkan Web Bluetooth. Gunakan Chrome di Android atau aktifkan Bluetooth HP terlebih dahulu.
            </span>
          </div>
        )}

        {bleNotice && (
          <div
            className={`rounded-xl px-3 py-2 text-xs border ${
              bleSession.connected
                ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200'
                : 'bg-[#0B0F17] border-white/[0.08] text-slate-300'
            }`}
          >
            {bleNotice}
          </div>
        )}

        {bleSession.connections.length > 0 && (
          <div className="space-y-2">
            {bleSession.connections.map((conn) => (
              <div
                key={conn.id}
                className="rounded-xl bg-[#0B0F17] border border-emerald-400/25 p-2.5 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100 truncate">
                      {conn.deviceName}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {conn.zone === 'front'
                        ? 'Modul Depan · ikut mode belakang (tanpa rem)'
                        : conn.zone === 'rear'
                          ? 'Modul Belakang · semua mode + rem + mundur'
                          : 'Semua zona · ikut semua kontrol'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {(
                      [
                        { id: 'rear', label: 'Belakang' },
                        { id: 'front', label: 'Depan' },
                        { id: 'all', label: 'Semua' },
                      ] as const
                    ).map((z) => (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => onSetBleZone(conn.id, z.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                          conn.zone === z.id
                            ? z.id === 'front'
                              ? 'bg-cyan-500 text-slate-950'
                              : z.id === 'rear'
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-200 text-slate-950'
                            : 'bg-[#171F2E] text-slate-400 hover:text-white'
                        }`}
                      >
                        {z.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => onDisconnectBle(conn.id)}
                      aria-label={`Putuskan ${conn.deviceName}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Format Paket BLE (LED DMX / RNS JSON / ELK / Triones) */}
                <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 mr-1">Format Modul:</span>
                  {(
                    [
                      { id: 'dmx-ble', label: 'LED DMX (4-Kabel)' },
                      { id: 'rns-json', label: 'RNS Matrix' },
                      { id: 'elk-bledom', label: 'LEDLamp BLE' },
                      { id: 'triones', label: 'Triones' },
                    ] as const
                  ).map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => onSetBleFormat(conn.id, fmt.id)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                        conn.format === fmt.id
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                          : 'bg-[#111622] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onScanBle('rear', 'dmx-ble')}
            className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 min-h-[44px] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah BT Belakang</span>
          </button>

          <button
            type="button"
            onClick={() => onScanBle('front', 'rns-json')}
            className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#171F2E] border border-cyan-400/40 text-cyan-200 text-xs font-semibold hover:text-white min-h-[44px] transition-colors"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>Tambah BT Depan</span>
          </button>
        </div>

        {bleSession.connected && (
          <button
            type="button"
            onClick={() => onDisconnectBle()}
            className="w-full py-2 px-3 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-medium min-h-[38px]"
          >
            Putuskan Semua Bluetooth
          </button>
        )}

        <ol className="text-[11px] text-slate-400 space-y-1 list-decimal list-inside pt-1 border-t border-white/[0.06]">
          <li>Pastikan Bluetooth &amp; Lokasi (GPS) HP dalam keadaan aktif.</li>
          <li>Tekan <strong className="text-slate-200">Hubungkan LED DMX (Bluetooth)</strong> atau <strong className="text-slate-200">Tambah BT Belakang</strong>.</li>
          <li>Tekan <strong className="text-slate-200">Tambah BT Depan</strong> untuk menyambungkan modul lampu depan bersamaan.</li>
        </ol>
      </section>

      {/* KARTU 3: SAMBUNGAN WI-FI */}
      <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                wifiConnected
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-cyan-500/15 text-cyan-400'
              }`}
            >
              {wifiConnected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-100">Sambungan Wi-Fi (ESP8266)</h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                Nama Wi-Fi Lampu:{' '}
                <span className="font-mono text-slate-200">{device.ssid || 'RNS-STOPLAMP-AP'}</span>
              </p>
            </div>
          </div>

          {wifiConnected && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-[11px] font-semibold text-emerald-300 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Aktif</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label htmlFor="cust-wifi-ssid" className="text-[11px] text-slate-400 block mb-1">
              SSID Wi-Fi Modul
            </label>
            <input
              id="cust-wifi-ssid"
              type="text"
              readOnly
              value={device.ssid || 'RNS-STOPLAMP-AP'}
              className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.06] text-xs font-mono text-slate-300"
            />
          </div>
          <div>
            <label htmlFor="cust-wifi-ip" className="text-[11px] text-slate-400 block mb-1">
              Alamat IP Modul
            </label>
            <input
              id="cust-wifi-ip"
              type="text"
              value={device.ipAddress}
              onChange={(e) => onUpdateDevice('ipAddress', e.target.value)}
              placeholder="192.168.4.1"
              className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400/60"
            />
          </div>
        </div>

        {connectionNote && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-400/25 px-3 py-2 text-xs text-amber-200">
            {connectionNote}
          </div>
        )}

        <button
          type="button"
          onClick={onConnectToggle}
          disabled={wifiConnecting}
          className={`w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold min-h-[44px] transition-colors disabled:opacity-60 ${
            wifiConnected
              ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
          }`}
        >
          <Wifi className="w-4 h-4" />
          <span>
            {wifiConnected
              ? 'Putuskan Wi-Fi'
              : wifiConnecting
                ? 'Menyambungkan Wi-Fi...'
                : 'Hubungkan Wi-Fi'}
          </span>
        </button>
      </section>
    </div>
  );
};
