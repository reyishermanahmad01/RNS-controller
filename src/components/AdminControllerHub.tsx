import React, { useState } from 'react';
import {
  Bluetooth,
  Car,
  Cpu,
  Globe,
  Plus,
  Radio,
  RefreshCw,
  ScanBarcode,
  Send,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Wifi,
} from 'lucide-react';
import {
  AdminMultiControllerState,
  BlePacketFormat,
  BleTargetZone,
  ControllerFamily,
  ControllerProtocol,
  MultiControllerProfile,
  RgbMode,
} from '../types/controller';
import { BleSessionInfo } from '../utils/bluetoothController';

interface AdminControllerHubProps {
  hubState: AdminMultiControllerState;
  activeColorHex: string;
  activeModeId: number;
  brightness: number;
  speed: number;
  hubStatus: { connected: boolean; message: string | null };
  bleSession: BleSessionInfo;
  moduleModes: RgbMode[];
  scanningModes: boolean;
  onSelectProfile: (id: string) => void;
  onAddProfile: (profile: Omit<MultiControllerProfile, 'id'>) => void;
  onUpdateProfile: (id: string, patch: Partial<MultiControllerProfile>) => void;
  onDeleteProfile: (id: string) => void;
  onUpdateDmxChannel: (index: number, value: number) => void;
  onSetDmxChannelsBulk: (values: number[]) => void;
  onUpdateCarZone: (zone: AdminMultiControllerState['carZone']) => void;
  onConnectHubProfile: () => void;
  onSendSyncPacket: () => void;
  onScanBle: (zone?: BleTargetZone) => void;
  onDisconnectBle: (connectionId?: string) => void;
  onSetBleZone: (connectionId: string, zone: BleTargetZone) => void;
  onSetBleFormat: (connectionId: string, format: BlePacketFormat) => void;
  onSendRawBle: (payload: string, isHex: boolean) => void;
  onSelectModuleMode: (id: number) => void;
  onDiscoverModuleModes: (profileId: string) => void;
  onToggleShowFactoryModes: (enabled: boolean) => void;
  onOpenBarcodeScanner: () => void;
}

const FAMILY_META: Record<
  ControllerFamily,
  { label: string; badge: string; icon: React.ComponentType<{ className?: string }> }
> = {
  esp8266: { label: 'ESP8266 / ESP32', badge: 'Wi-Fi', icon: Cpu },
  bluetooth: { label: 'Bluetooth BLE / HC-05', badge: 'BT', icon: Bluetooth },
  dmx: { label: 'DMX512 / Art-Net', badge: 'DMX', icon: SlidersHorizontal },
  car: { label: 'Modul Mobil (CAR)', badge: 'CAR', icon: Car },
  wled: { label: 'WLED / Pixel HTTP', badge: 'WLED', icon: Globe },
  custom: { label: 'Modul Kustom', badge: 'MOD', icon: Radio },
};

const PROTOCOL_OPTIONS: { id: ControllerProtocol; label: string }[] = [
  { id: 'websocket', label: 'WebSocket (Wi-Fi WS)' },
  { id: 'ble', label: 'Bluetooth (BLE / Bridge)' },
  { id: 'artnet-ws', label: 'Art-Net / DMX Bridge' },
  { id: 'http-json', label: 'HTTP JSON (WLED/REST)' },
];

const BLE_FORMATS: { id: BlePacketFormat; label: string; desc: string }[] = [
  { id: 'rns-json', label: 'RNS JSON', desc: 'ESP32 / HM-10 / HC-05 / JDY UART' },
  { id: 'elk-bledom', label: 'ELK-BLEDOM', desc: 'LED Strip / LotusLantern BLE' },
  { id: 'triones', label: 'Triones', desc: 'HappyLighting / MagicHome BLE' },
  { id: 'dmx-ble', label: 'DMX BLE', desc: 'Wireless DMX512 Bluetooth' },
];

const DMX_CHANNEL_LABELS = [
  'CH1 Dimmer',
  'CH2 Red',
  'CH3 Green',
  'CH4 Blue',
  'CH5 White',
  'CH6 Strobe',
  'CH7 Mode',
  'CH8 Speed',
];

const CAR_ZONES: { id: AdminMultiControllerState['carZone']; label: string }[] = [
  { id: 'all', label: 'Semua Zona' },
  { id: 'drl', label: 'DRL Depan' },
  { id: 'stoplamp', label: 'Stoplamp' },
  { id: 'cabin', label: 'Ambient Kabin' },
  { id: 'underglow', label: 'Kolong / Underglow' },
];

export const AdminControllerHub: React.FC<AdminControllerHubProps> = ({
  hubState,
  activeColorHex,
  activeModeId,
  brightness,
  speed,
  hubStatus,
  bleSession,
  moduleModes,
  scanningModes,
  onSelectProfile,
  onAddProfile,
  onUpdateProfile,
  onDeleteProfile,
  onUpdateDmxChannel,
  onSetDmxChannelsBulk,
  onUpdateCarZone,
  onConnectHubProfile,
  onSendSyncPacket,
  onScanBle,
  onDisconnectBle,
  onSetBleZone,
  onSetBleFormat,
  onSendRawBle,
  onSelectModuleMode,
  onDiscoverModuleModes,
  onToggleShowFactoryModes,
  onOpenBarcodeScanner,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFamily, setNewFamily] = useState<ControllerFamily>('bluetooth');
  const [newProtocol, setNewProtocol] = useState<ControllerProtocol>('ble');
  const [newIp, setNewIp] = useState('192.168.4.1');
  const [newPort, setNewPort] = useState(81);
  const [rawBleInput, setRawBleInput] = useState('');
  const [rawBleHex, setRawBleHex] = useState(false);

  const activeProfile =
    hubState.profiles.find((p) => p.id === hubState.activeProfileId) || hubState.profiles[0];

  const activeProfileFactoryModes = activeProfile
    ? moduleModes.filter((m) => m.moduleMeta?.profileId === activeProfile.id)
    : [];
  const showInApp = hubState.showFactoryModesInApp !== false;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddProfile({
      name: newName.trim(),
      family: newFamily,
      protocol: newProtocol,
      ipAddress: newIp.trim() || '192.168.4.1',
      port: Number(newPort) || 81,
      dmxUniverse: 0,
      dmxStartChannel: 1,
      dmxChannelMode: '8CH',
      carZone: 'all',
      bleFormat: 'rns-json',
    });
    setNewName('');
    setShowAddForm(false);
  };

  const applyColorToDmx = () => {
    const clean = activeColorHex.replace('#', '');
    const num = parseInt(clean, 16);
    const r = Number.isNaN(num) ? 34 : (num >> 16) & 255;
    const g = Number.isNaN(num) ? 211 : (num >> 8) & 255;
    const b = Number.isNaN(num) ? 238 : num & 255;
    const next = [...hubState.dmxChannels];
    next[0] = Math.round((brightness / 100) * 255);
    next[1] = r;
    next[2] = g;
    next[3] = b;
    next[4] = 0;
    next[6] = Math.min(255, activeModeId % 256);
    next[7] = Math.round((speed / 100) * 255);
    onSetDmxChannelsBulk(next);
  };

  const isBleProfile = activeProfile?.protocol === 'ble' || activeProfile?.family === 'bluetooth';

  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                Hub Multi-Modul (Khusus Admin)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Kontrol modul Bluetooth (BLE / HC-05 / HM-10), semua seri DMX512, CAR Module, WLED, dan ESP8266/ESP32 dari 1 aplikasi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenBarcodeScanner}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171F2E] border border-cyan-400/45 text-cyan-200 text-xs font-semibold hover:text-white min-h-[36px] whitespace-nowrap"
            >
              <ScanBarcode className="w-3.5 h-3.5 text-cyan-400" />
              <span>Scan Barcode</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 min-h-[36px] whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Tutup' : 'Tambah Modul'}</span>
            </button>
          </div>
        </div>

        {/* Add New Module Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreate}
            className="rounded-xl bg-[#0B0F17] border border-cyan-400/30 p-3 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="hub-new-name" className="text-[11px] text-slate-400 block mb-1">
                  Nama Perangkat / Modul
                </label>
                <input
                  id="hub-new-name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Modul Bluetooth Stoplamp / DMX"
                  className="w-full h-9 px-2.5 rounded-lg bg-[#111622] border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-400/60"
                />
              </div>

              <div>
                <label htmlFor="hub-new-family" className="text-[11px] text-slate-400 block mb-1">
                  Jenis Controller
                </label>
                <select
                  id="hub-new-family"
                  value={newFamily}
                  onChange={(e) => {
                    const fam = e.target.value as ControllerFamily;
                    setNewFamily(fam);
                    if (fam === 'bluetooth') {
                      setNewProtocol('ble');
                    } else if (fam === 'dmx') {
                      setNewProtocol('artnet-ws');
                      setNewPort(6454);
                    } else if (fam === 'wled') {
                      setNewProtocol('http-json');
                      setNewPort(80);
                    } else {
                      setNewProtocol('websocket');
                      setNewPort(81);
                    }
                  }}
                  className="w-full h-9 px-2.5 rounded-lg bg-[#111622] border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-400/60"
                >
                  <option value="bluetooth">Bluetooth (BLE / HC-05 / HM-10 / ELK-BLEDOM)</option>
                  <option value="dmx">DMX512 / Art-Net (Semua Seri DMX)</option>
                  <option value="car">CAR Module (DRL / Stoplamp / Ambient)</option>
                  <option value="wled">WLED / Pixel JSON Controller</option>
                  <option value="esp8266">ESP8266 / ESP32 Wi-Fi</option>
                  <option value="custom">Modul Lainnya</option>
                </select>
              </div>

              <div>
                <label htmlFor="hub-new-proto" className="text-[11px] text-slate-400 block mb-1">
                  Protokol Koneksi
                </label>
                <select
                  id="hub-new-proto"
                  value={newProtocol}
                  onChange={(e) => setNewProtocol(e.target.value as ControllerProtocol)}
                  className="w-full h-9 px-2.5 rounded-lg bg-[#111622] border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-400/60"
                >
                  {PROTOCOL_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {newProtocol !== 'ble' && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label htmlFor="hub-new-ip" className="text-[11px] text-slate-400 block mb-1">
                      IP / Host
                    </label>
                    <input
                      id="hub-new-ip"
                      type="text"
                      value={newIp}
                      onChange={(e) => setNewIp(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg bg-[#111622] border border-white/[0.08] text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400/60"
                    />
                  </div>
                  <div>
                    <label htmlFor="hub-new-port" className="text-[11px] text-slate-400 block mb-1">
                      Port
                    </label>
                    <input
                      id="hub-new-port"
                      type="number"
                      value={newPort}
                      onChange={(e) => setNewPort(Number(e.target.value) || 80)}
                      className="w-full h-9 px-2 rounded-lg bg-[#111622] border border-white/[0.08] text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400/60"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400"
            >
              Simpan Modul Baru
            </button>
          </form>
        )}

        {/* Profile Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {hubState.profiles.map((prof) => {
            const meta = FAMILY_META[prof.family] || FAMILY_META.custom;
            const Icon = meta.icon;
            const isSelected = prof.id === activeProfile.id;
            return (
              <div
                key={prof.id}
                onClick={() => onSelectProfile(prof.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectProfile(prof.id);
                  }
                }}
                className={`cursor-pointer rounded-xl p-3 border transition-colors flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-400/50'
                    : 'bg-[#0B0F17] border-white/[0.06] hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-[#171F2E] text-cyan-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100 truncate">
                      {prof.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate">
                      {meta.badge} ·{' '}
                      {prof.protocol === 'ble'
                        ? `BLE (${prof.bleFormat || 'rns-json'})`
                        : `${prof.protocol} · ${prof.ipAddress}:${prof.port}`}
                    </div>
                  </div>
                </div>

                {hubState.profiles.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Hapus modul ${prof.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProfile(prof.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Active Profile Connection & Parameters */}
      {activeProfile && (
        <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/[0.06]">
            <div>
              <div className="text-sm font-semibold text-slate-100">{activeProfile.name}</div>
              <div className="text-[11px] text-slate-400">
                Mode aktif: <span className="font-mono text-cyan-300">#{activeModeId}</span> · Kecerahan{' '}
                <span className="font-mono">{brightness}%</span> · Kecepatan{' '}
                <span className="font-mono">{speed}%</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {isBleProfile ? (
                <>
                  <button
                    type="button"
                    onClick={() => onScanBle('rear')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 min-h-[36px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ BT Belakang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onScanBle('front')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171F2E] border border-cyan-400/35 text-cyan-200 text-xs font-semibold hover:border-cyan-400 min-h-[36px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ BT Depan</span>
                  </button>
                  {bleSession.connected && (
                    <button
                      type="button"
                      onClick={() => onDisconnectBle()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 text-red-300 border border-red-400/30 text-xs font-semibold min-h-[36px]"
                    >
                      <Bluetooth className="w-3.5 h-3.5" />
                      <span>Putuskan Semua ({bleSession.count})</span>
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={onConnectHubProfile}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold min-h-[36px] ${
                    hubStatus.connected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                  }`}
                >
                  <Wifi className="w-3.5 h-3.5" />
                  <span>{hubStatus.connected ? 'Terhubung' : 'Hubungkan'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onSendSyncPacket}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171F2E] border border-white/[0.08] text-xs font-medium text-slate-200 hover:text-white min-h-[36px]"
              >
                <Send className="w-3.5 h-3.5 text-cyan-400" />
                <span>Kirim ke Modul</span>
              </button>
            </div>
          </div>

          {hubStatus.message && (
            <div className="rounded-xl bg-[#0B0F17] border border-cyan-400/25 px-3 py-2 text-xs text-cyan-200">
              {hubStatus.message}
            </div>
          )}

          {/* BLUETOOTH BLE / HC-05 / LED STRIP MULTI-CONCURRENT CONSOLE */}
          {isBleProfile && (
            <div className="space-y-3 rounded-xl bg-[#0B0F17] border border-white/[0.06] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-100">
                  Multi-Bluetooth BLE Aktif (Modul Belakang + Depan Bersamaan)
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                    bleSession.connected
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {bleSession.connected
                    ? `${bleSession.count} MODUL TERHUBUNG`
                    : 'BELUM TERHUBUNG'}
                </span>
              </div>

              {bleSession.connections.length > 0 && (
                <div className="space-y-1.5">
                  {bleSession.connections.map((conn) => (
                    <div
                      key={conn.id}
                      className="rounded-lg bg-[#111622] border border-white/[0.08] p-2 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-100 truncate">
                            {conn.deviceName}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            {conn.zone === 'front'
                              ? 'Depan · Ikut mode belakang, kebal rem'
                              : conn.zone === 'rear'
                                ? 'Belakang · Mode + Rem F1'
                                : 'Semua Zona · Sinkron Penuh'}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {(['rear', 'front', 'all'] as BleTargetZone[]).map((z) => (
                            <button
                              key={z}
                              type="button"
                              onClick={() => onSetBleZone(conn.id, z)}
                              className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                                conn.zone === z
                                  ? z === 'front'
                                    ? 'bg-amber-500/20 border border-amber-400/50 text-amber-200'
                                    : 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-200'
                                  : 'bg-[#0B0F17] border border-white/[0.06] text-slate-400 hover:text-white'
                              }`}
                            >
                              {z === 'rear' ? 'Belakang' : z === 'front' ? 'Depan' : 'Semua'}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => onDisconnectBle(conn.id)}
                            className="px-2 py-1 rounded bg-red-500/10 text-red-300 hover:bg-red-500/20 text-[10px] font-semibold ml-1"
                            title="Putuskan perangkat ini"
                          >
                            Putus
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] text-slate-400 mr-1">Format:</span>
                        {BLE_FORMATS.map((fmt) => (
                          <button
                            key={fmt.id}
                            type="button"
                            onClick={() => onSetBleFormat(conn.id, fmt.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                              conn.format === fmt.id
                                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
                                : 'bg-[#0B0F17] text-slate-400 border border-white/[0.05]'
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

              <div>
                <span className="text-[11px] text-slate-400 block mb-1.5">
                  Format Protokol Modul Bluetooth
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {BLE_FORMATS.map((fmt) => {
                    const selected = (activeProfile.bleFormat || 'rns-json') === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() =>
                          onUpdateProfile(activeProfile.id, {
                            bleFormat: fmt.id,
                            protocol: 'ble',
                          })
                        }
                        className={`p-2 rounded-lg border text-left transition-colors ${
                          selected
                            ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200'
                            : 'bg-[#111622] border-white/[0.06] text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <div className="text-xs font-semibold">{fmt.label}</div>
                        <div className="text-[10px] text-slate-400">{fmt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label htmlFor="ble-svc-uuid" className="text-[11px] text-slate-400 block mb-1">
                    Custom Service UUID (Opsional)
                  </label>
                  <input
                    id="ble-svc-uuid"
                    type="text"
                    value={activeProfile.bleServiceUuid || ''}
                    onChange={(e) =>
                      onUpdateProfile(activeProfile.id, { bleServiceUuid: e.target.value })
                    }
                    placeholder="Auto (0xFFE0 / 0xFFF0 / NUS)"
                    className="w-full h-9 px-2.5 rounded-lg bg-[#111622] border border-white/[0.08] text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60"
                  />
                </div>
                <div>
                  <label htmlFor="ble-char-uuid" className="text-[11px] text-slate-400 block mb-1">
                    Custom Write Char UUID (Opsional)
                  </label>
                  <input
                    id="ble-char-uuid"
                    type="text"
                    value={activeProfile.bleCharUuid || ''}
                    onChange={(e) =>
                      onUpdateProfile(activeProfile.id, { bleCharUuid: e.target.value })
                    }
                    placeholder="Auto deteksi GATT Write"
                    className="w-full h-9 px-2.5 rounded-lg bg-[#111622] border border-white/[0.08] text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60"
                  />
                </div>
              </div>

              {/* Manual Text / Hex Command Sender */}
              <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">Kirim Perintah Manual (Teks / HEX)</span>
                  <button
                    type="button"
                    onClick={() => setRawBleHex((v) => !v)}
                    className="text-cyan-400 font-mono"
                  >
                    Mode: {rawBleHex ? 'HEX BYTES' : 'TEXT / JSON'}
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={rawBleInput}
                    onChange={(e) => setRawBleInput(e.target.value)}
                    placeholder={
                      rawBleHex ? '7E 00 05 03 FF 00 00 00 EF' : '{"mode":1,"welcome":true}'
                    }
                    aria-label="Perintah Bluetooth manual"
                    className="flex-1 h-9 px-2.5 rounded-lg bg-[#111622] border border-white/[0.08] text-xs font-mono text-slate-100 placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (rawBleInput.trim()) onSendRawBle(rawBleInput.trim(), rawBleHex);
                    }}
                    className="px-3 h-9 rounded-lg bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 whitespace-nowrap"
                  >
                    Kirim
                  </button>
                </div>
              </div>

              {bleSession.lastHex && (
                <div className="text-[10px] font-mono text-slate-400 break-all">
                  Paket terakhir: {bleSession.lastHex}
                </div>
              )}

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tips: Untuk Bluetooth BLE langsung dari HP tanpa kabel, buka aplikasi di <strong>Google Chrome Android (HTTPS)</strong>. Untuk modul <strong>HC-05 / HM-10</strong> yang disambung ke RX/TX ESP8266 (9600 baud), firmware `.ino` RNS sudah otomatis menerima perintah JSON-nya.
              </p>
            </div>
          )}

          {/* IP / PORT SETTINGS FOR WIFI & BRIDGE PROFILES */}
          {!isBleProfile && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label htmlFor="active-prof-ip" className="text-[11px] text-slate-400 block mb-1">
                  Alamat IP / Gateway Bridge
                </label>
                <input
                  id="active-prof-ip"
                  type="text"
                  value={activeProfile.ipAddress}
                  onChange={(e) => onUpdateProfile(activeProfile.id, { ipAddress: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-lg bg-[#0B0F17] border border-white/[0.08] text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400/60"
                />
              </div>

              <div>
                <label htmlFor="active-prof-port" className="text-[11px] text-slate-400 block mb-1">
                  Port Koneksi
                </label>
                <input
                  id="active-prof-port"
                  type="number"
                  value={activeProfile.port}
                  onChange={(e) =>
                    onUpdateProfile(activeProfile.id, { port: Number(e.target.value) || 80 })
                  }
                  className="w-full h-9 px-2.5 rounded-lg bg-[#0B0F17] border border-white/[0.08] text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400/60"
                />
              </div>

              <div>
                <label htmlFor="active-prof-proto" className="text-[11px] text-slate-400 block mb-1">
                  Protokol Modul
                </label>
                <select
                  id="active-prof-proto"
                  value={activeProfile.protocol}
                  onChange={(e) =>
                    onUpdateProfile(activeProfile.id, {
                      protocol: e.target.value as ControllerProtocol,
                    })
                  }
                  className="w-full h-9 px-2.5 rounded-lg bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-400/60"
                >
                  {PROTOCOL_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* CAR MODULE ZONE SELECTOR */}
          {activeProfile.family === 'car' && (
            <div className="pt-2 border-t border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  Zona Lampu Mobil (CAR Module)
                </span>
                <span className="text-[11px] font-mono text-cyan-300">{hubState.carZone}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CAR_ZONES.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => onUpdateCarZone(z.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      hubState.carZone === z.id
                        ? 'bg-cyan-500 text-slate-950 font-semibold'
                        : 'bg-[#0B0F17] text-slate-300 border border-white/[0.06] hover:text-white'
                    }`}
                  >
                    {z.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DMX512 MASTER & 8-CHANNEL FADER CONSOLE */}
          {activeProfile.family === 'dmx' && (
            <div className="pt-3 border-t border-white/[0.06] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-100">
                  Konsol DMX512 / Art-Net (Semua Seri DMX)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={applyColorToDmx}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[11px] font-medium hover:bg-cyan-500/30"
                  >
                    Sync Warna & Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetDmxChannelsBulk([0, 0, 0, 0, 0, 0, 0, 0])}
                    className="px-2.5 py-1 rounded-lg bg-[#0B0F17] border border-white/[0.08] text-[11px] text-slate-300 hover:text-white"
                  >
                    Blackout
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetDmxChannelsBulk([255, 255, 255, 255, 255, 0, 0, 0])}
                    className="px-2.5 py-1 rounded-lg bg-[#0B0F17] border border-white/[0.08] text-[11px] text-slate-200 hover:text-white"
                  >
                    Full White
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="dmx-universe" className="text-[11px] text-slate-400 block mb-1">
                    Universe
                  </label>
                  <input
                    id="dmx-universe"
                    type="number"
                    min={0}
                    max={15}
                    value={activeProfile.dmxUniverse ?? 0}
                    onChange={(e) =>
                      onUpdateProfile(activeProfile.id, {
                        dmxUniverse: Math.max(0, Math.min(15, Number(e.target.value) || 0)),
                      })
                    }
                    className="w-full h-9 px-2.5 rounded-lg bg-[#0B0F17] border border-white/[0.08] text-xs font-mono text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="dmx-start-ch" className="text-[11px] text-slate-400 block mb-1">
                    Start CH (1-512)
                  </label>
                  <input
                    id="dmx-start-ch"
                    type="number"
                    min={1}
                    max={512}
                    value={activeProfile.dmxStartChannel ?? 1}
                    onChange={(e) =>
                      onUpdateProfile(activeProfile.id, {
                        dmxStartChannel: Math.max(1, Math.min(512, Number(e.target.value) || 1)),
                      })
                    }
                    className="w-full h-9 px-2.5 rounded-lg bg-[#0B0F17] border border-white/[0.08] text-xs font-mono text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="dmx-ch-mode" className="text-[11px] text-slate-400 block mb-1">
                    Mode Channel
                  </label>
                  <select
                    id="dmx-ch-mode"
                    value={activeProfile.dmxChannelMode ?? '8CH'}
                    onChange={(e) =>
                      onUpdateProfile(activeProfile.id, {
                        dmxChannelMode: e.target.value as MultiControllerProfile['dmxChannelMode'],
                      })
                    }
                    className="w-full h-9 px-2 rounded-lg bg-[#0B0F17] border border-white/[0.08] text-xs font-mono text-slate-100"
                  >
                    <option value="3CH">3CH RGB</option>
                    <option value="4CH">4CH RGBW</option>
                    <option value="8CH">8CH Fixture</option>
                    <option value="24CH">24CH Matrix</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {DMX_CHANNEL_LABELS.map((label, idx) => {
                  const val = hubState.dmxChannels[idx] ?? 0;
                  return (
                    <div
                      key={label}
                      className="rounded-xl bg-[#0B0F17] border border-white/[0.06] p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300 font-medium">{label}</span>
                        <span className="font-mono text-cyan-300 tabular-nums">{val}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={255}
                        value={val}
                        aria-label={label}
                        onChange={(e) => onUpdateDmxChannel(idx, Number(e.target.value))}
                        className="rns-slider w-full"
                        style={{
                          background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${Math.round((val / 255) * 100)}%, #1e293b ${Math.round((val / 255) * 100)}%, #1e293b 100%)`,
                          height: '5px',
                          borderRadius: '9999px',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODE BAWAAN PABRIK MODUL INI (OTOMATIS TAMPIL & SIAP PAKAI DI TAB MODE) */}
          <div className="pt-3 border-t border-white/[0.06] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-100">
                  Mode Bawaan Pabrik Modul ({activeProfile.family === 'esp8266' && activeProfileFactoryModes.length === 0 ? '310 RNS' : activeProfileFactoryModes.length})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onToggleShowFactoryModes(!showInApp)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                    showInApp
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                      : 'bg-[#0B0F17] border-white/[0.08] text-slate-400'
                  }`}
                >
                  {showInApp ? 'Tampil di Tab Mode' : 'Tersembunyi'}
                </button>
                <button
                  type="button"
                  disabled={scanningModes}
                  onClick={() => onDiscoverModuleModes(activeProfile.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-[11px] font-medium hover:bg-cyan-500/30 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${scanningModes ? 'animate-spin' : ''}`} />
                  <span>{scanningModes ? 'Memindai...' : 'Scan Mode Modul'}</span>
                </button>
              </div>
            </div>

            {activeProfileFactoryModes.length === 0 ? (
              <p className="text-[11px] text-slate-400 leading-relaxed">
                310+ mode utama RNS sudah tampil di Tab Mode. Tekan <strong>Scan Mode Modul</strong> bila modul ESP/kustom punya daftar efek tambahan dari firmware-nya (`/modes` atau WebSocket).
              </p>
            ) : (
              <>
                <p className="text-[11px] text-slate-400">
                  Klik mode mana saja di bawah untuk langsung menjalankan program bawaan pabrik ke modul &amp; simulator. Semua mode ini juga otomatis muncul di Tab <strong>Mode</strong> &amp; slide kolektor.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-60 overflow-y-auto pr-1">
                  {activeProfileFactoryModes.map((mode) => {
                    const selected = activeModeId === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => onSelectModuleMode(mode.id)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-colors ${
                          selected
                            ? 'bg-cyan-500/15 border-cyan-400/50 text-white'
                            : 'bg-[#0B0F17] border-white/[0.06] text-slate-300 hover:border-white/[0.16]'
                        }`}
                      >
                        <span
                          className="w-6 h-6 rounded-lg shrink-0 border border-white/10"
                          style={{
                            background: `linear-gradient(135deg, ${mode.primaryColor}, ${mode.secondaryColor})`,
                          }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 text-[10px]">
                            <span className="font-mono font-semibold text-cyan-300">
                              {mode.moduleMeta?.codeLabel || mode.code}
                            </span>
                            <span className="text-slate-500">
                              {mode.moduleMeta?.fromLiveDevice ? 'Live Modul' : 'Pabrik'}
                            </span>
                          </div>
                          <div className="text-xs font-medium truncate">{mode.name}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
