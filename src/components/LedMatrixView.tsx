import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  Eye,
  Grid,
  Plus,
  Sparkles,
  Type,
} from 'lucide-react';
import { BUILTIN_MATRIX_MODELS } from '../data/modes';
import {
  ControllerState,
  EyeExpressionId,
  EyeShapeId,
  LedMatrixConfig,
  MatrixEffectId,
  MatrixModelItem,
  RgbMode,
} from '../types/controller';
import { SidePanelPreviewCanvas } from './StoplampVisualizer';

interface LedMatrixViewProps {
  state: ControllerState;
  allModes: RgbMode[];
  isAdmin: boolean;
  onUpdateLedMatrix: (next: LedMatrixConfig) => void;
  onAddMatrixModel: (model: Omit<MatrixModelItem, 'id' | 'isCustom'>) => void;
  onSavePreset: (name: string) => void;
}

const EYE_EXPRESSIONS: { id: EyeExpressionId; label: string }[] = [
  { id: 'angry', label: 'Angry Eyes' },
  { id: 'squint', label: 'Menyipit' },
  { id: 'blink', label: 'Berkedip' },
  { id: 'look-lr', label: 'Lirik L ↔ R' },
  { id: 'auto-cycle', label: 'Otomatis' },
];

const EYE_SHAPES: { id: EyeShapeId; label: string }[] = [
  { id: 'cyber-slit', label: 'Cyber Slit' },
  { id: 'anime', label: 'Tajam Anime' },
  { id: 'round', label: 'Bulat' },
  { id: 'hex', label: 'Hexagon GT' },
];

const MATRIX_EFFECTS: { id: MatrixEffectId; label: string }[] = [
  { id: 'equalizer-rgb', label: 'Equalizer RGB' },
  { id: 'moving-pixel', label: 'Pixel Bergerak' },
  { id: 'scrolling-text', label: 'Tulisan Berjalan' },
  { id: 'digital-wave', label: 'Gelombang Digital' },
  { id: 'running-lines', label: 'Garis Berjalan' },
  { id: 'moving-dots', label: 'Titik Orbit' },
  { id: 'custom-digital', label: 'Spiral Digital' },
];

const DIRECTIONS: { id: LedMatrixConfig['direction']; label: string }[] = [
  { id: 'left', label: 'Kiri' },
  { id: 'right', label: 'Kanan' },
  { id: 'up', label: 'Atas' },
  { id: 'down', label: 'Bawah' },
];

const MATRIX_SWATCHES = ['#22D3EE', '#EF4444', '#F59E0B', '#10B981', '#EC4899', '#A855F7', '#FFFFFF'];

export const LedMatrixView: React.FC<LedMatrixViewProps> = ({
  state,
  allModes,
  isAdmin,
  onUpdateLedMatrix,
  onAddMatrixModel,
  onSavePreset,
}) => {
  const matrix: LedMatrixConfig = state.ledMatrix || {
    enabled: false,
    activeModelId: 'eye-angry',
    category: 'eyes',
    eyeExpression: 'angry',
    eyeShape: 'cyber-slit',
    matrixEffect: 'equalizer-rgb',
    scrollingText: 'RNS RGB',
    primaryColor: '#22D3EE',
    secondaryColor: '#EF4444',
    speed: 65,
    size: 4,
    direction: 'left',
    customModels: [],
  };

  const [presetName, setPresetName] = useState('');
  const [presetSavedNotice, setPresetSavedNotice] = useState<string | null>(null);
  const [showAdminAdd, setShowAdminAdd] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftCat, setDraftCat] = useState<'eyes' | 'matrix'>('eyes');
  const [draftEyeExpr, setDraftEyeExpr] = useState<EyeExpressionId>('angry');
  const [draftEyeShape, setDraftEyeShape] = useState<EyeShapeId>('cyber-slit');
  const [draftMatrixEff, setDraftMatrixEff] = useState<MatrixEffectId>('equalizer-rgb');
  const [draftText, setDraftText] = useState('RNS PRO');
  const [draftC1, setDraftC1] = useState('#22D3EE');
  const [draftC2, setDraftC2] = useState('#EF4444');

  const allModels = useMemo(() => {
    const customList = [
      ...(matrix.customModels || []),
      ...(state.customization.customMatrixModels || []),
    ];
    const dedupCustom: MatrixModelItem[] = [];
    for (const item of customList) {
      if (!dedupCustom.some((x) => x.id === item.id)) {
        dedupCustom.push(item);
      }
    }
    return [...BUILTIN_MATRIX_MODELS, ...dedupCustom];
  }, [matrix.customModels, state.customization.customMatrixModels]);

  const eyeModels = useMemo(() => allModels.filter((m) => m.category === 'eyes'), [allModels]);
  const otherModels = useMemo(() => allModels.filter((m) => m.category === 'matrix'), [allModels]);

  const applyModel = (model: MatrixModelItem) => {
    onUpdateLedMatrix({
      ...matrix,
      enabled: true,
      activeModelId: model.id,
      category: model.category,
      eyeExpression: model.eyeExpression || matrix.eyeExpression,
      eyeShape: model.eyeShape || matrix.eyeShape,
      matrixEffect: model.matrixEffect || matrix.matrixEffect,
      scrollingText: model.scrollingText || matrix.scrollingText,
      primaryColor: model.primaryColor,
      secondaryColor: model.secondaryColor,
      speed: model.speed,
      size: model.size,
      direction: model.direction,
    });
  };

  const handleSaveMatrixPreset = (e: React.FormEvent) => {
    e.preventDefault();
    const label = presetName.trim() || (matrix.category === 'eyes' ? `Matrix Eyes (${matrix.eyeExpression})` : `Matrix (${matrix.matrixEffect})`);
    onSavePreset(label);
    setPresetName('');
    setPresetSavedNotice(`Preset "${label}" tersimpan.`);
    window.setTimeout(() => setPresetSavedNotice(null), 2400);
  };

  const handleCreateAdminModel = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draftName.trim();
    if (!clean) return;
    onAddMatrixModel({
      name: clean,
      category: draftCat,
      ...(draftCat === 'eyes'
        ? { eyeExpression: draftEyeExpr, eyeShape: draftEyeShape }
        : {
            matrixEffect: draftMatrixEff,
            ...(draftMatrixEff === 'scrolling-text' ? { scrollingText: draftText || 'RNS PRO' } : {}),
          }),
      primaryColor: draftC1,
      secondaryColor: draftC2,
      speed: matrix.speed,
      size: matrix.size,
      direction: matrix.direction,
    });
    setDraftName('');
    setShowAdminAdd(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-100 tracking-tight">
            LED Matrix Otomotif
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Digital Eyes, Equalizer RGB, Tulisan Berjalan, dan animasi Matrix penuh 2-panel.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onUpdateLedMatrix({ ...matrix, enabled: !matrix.enabled })}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold min-h-[42px] border transition-colors ${
            matrix.enabled
              ? 'bg-cyan-500 text-slate-950 border-cyan-400'
              : 'bg-[#171F2E] text-slate-200 border-white/[0.08]'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>{matrix.enabled ? 'LED Matrix: AKTIF' : 'Aktifkan LED Matrix'}</span>
        </button>
      </div>

      {/* Live Preview Matrix */}
      <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200">
            Preview LED Matrix ({matrix.category === 'eyes' ? 'Digital Eyes' : 'Matrix Lainnya'})
          </span>
          <span className="font-mono text-[11px] text-cyan-300 tabular-nums">
            {matrix.speed}% · Size {matrix.size}
          </span>
        </div>
        <div className="h-24 sm:h-28 rounded-xl bg-[#070A0F] border border-white/[0.08] overflow-hidden">
          <SidePanelPreviewCanvas state={state} allModes={allModes} side="both" />
        </div>
      </section>

      {/* Category Switcher: Digital Eyes vs Matrix Lainnya */}
      <div className="grid grid-cols-2 gap-1.5 bg-[#0B0F17] p-1 rounded-2xl border border-white/[0.08]">
        <button
          type="button"
          onClick={() => onUpdateLedMatrix({ ...matrix, enabled: true, category: 'eyes' })}
          className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold min-h-[42px] transition-colors ${
            matrix.category === 'eyes'
              ? 'bg-cyan-500 text-slate-950'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Digital Eyes</span>
        </button>

        <button
          type="button"
          onClick={() => onUpdateLedMatrix({ ...matrix, enabled: true, category: 'matrix' })}
          className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold min-h-[42px] transition-colors ${
            matrix.category === 'matrix'
              ? 'bg-cyan-500 text-slate-950'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Matrix Lainnya</span>
        </button>
      </div>

      {/* SECTION A: DIGITAL EYES */}
      {matrix.category === 'eyes' && (
        <div className="space-y-3.5">
          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
            <span className="text-xs font-semibold text-slate-200 block">
              Model Digital Eyes ({eyeModels.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {eyeModels.map((model) => {
                const active = matrix.enabled && matrix.activeModelId === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => applyModel(model)}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left min-h-[46px] transition-colors ${
                      active
                        ? 'bg-cyan-500/15 border-cyan-400/60 text-slate-100'
                        : 'bg-[#0B0F17] border-white/[0.06] text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${model.primaryColor}, ${model.secondaryColor})`,
                        }}
                      />
                      <span className="text-xs font-medium truncate">{model.name}</span>
                    </div>
                    {model.isCustom && (
                      <span className="text-[10px] font-mono text-cyan-300 shrink-0">Admin</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-white/[0.06] space-y-2">
              <span className="text-[11px] text-slate-400 block">Ekspresi Mata</span>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {EYE_EXPRESSIONS.map((exp) => (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() =>
                      onUpdateLedMatrix({ ...matrix, enabled: true, eyeExpression: exp.id })
                    }
                    className={`py-2 px-2 rounded-xl text-[11px] font-medium min-h-[38px] border ${
                      matrix.eyeExpression === exp.id
                        ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 font-semibold'
                        : 'bg-[#0B0F17] border-white/[0.06] text-slate-300'
                    }`}
                  >
                    {exp.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.06] space-y-2">
              <span className="text-[11px] text-slate-400 block">Bentuk Mata</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {EYE_SHAPES.map((shp) => (
                  <button
                    key={shp.id}
                    type="button"
                    onClick={() =>
                      onUpdateLedMatrix({ ...matrix, enabled: true, eyeShape: shp.id })
                    }
                    className={`py-2 px-2 rounded-xl text-[11px] font-medium min-h-[38px] border ${
                      matrix.eyeShape === shp.id
                        ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 font-semibold'
                        : 'bg-[#0B0F17] border-white/[0.06] text-slate-300'
                    }`}
                  >
                    {shp.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* SECTION B: MATRIX LAINNYA */}
      {matrix.category === 'matrix' && (
        <div className="space-y-3.5">
          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
            <span className="text-xs font-semibold text-slate-200 block">
              Model Matrix Lainnya ({otherModels.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {otherModels.map((model) => {
                const active = matrix.enabled && matrix.activeModelId === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => applyModel(model)}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left min-h-[46px] transition-colors ${
                      active
                        ? 'bg-cyan-500/15 border-cyan-400/60 text-slate-100'
                        : 'bg-[#0B0F17] border-white/[0.06] text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${model.primaryColor}, ${model.secondaryColor})`,
                        }}
                      />
                      <span className="text-xs font-medium truncate">{model.name}</span>
                    </div>
                    {model.isCustom && (
                      <span className="text-[10px] font-mono text-cyan-300 shrink-0">Admin</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-white/[0.06] space-y-2">
              <span className="text-[11px] text-slate-400 block">Efek Matrix Langsung</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {MATRIX_EFFECTS.map((eff) => (
                  <button
                    key={eff.id}
                    type="button"
                    onClick={() =>
                      onUpdateLedMatrix({ ...matrix, enabled: true, matrixEffect: eff.id })
                    }
                    className={`py-2 px-2 rounded-xl text-[11px] font-medium min-h-[38px] border ${
                      matrix.matrixEffect === eff.id
                        ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 font-semibold'
                        : 'bg-[#0B0F17] border-white/[0.06] text-slate-300'
                    }`}
                  >
                    {eff.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrolling Text Input */}
            <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
              <label
                htmlFor="matrix-scroll-text"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-200"
              >
                <Type className="w-3.5 h-3.5 text-cyan-400" />
                <span>Teks Matrix Berjalan (Huruf &amp; Angka)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="matrix-scroll-text"
                  type="text"
                  maxLength={24}
                  value={matrix.scrollingText}
                  onChange={(e) =>
                    onUpdateLedMatrix({
                      ...matrix,
                      enabled: true,
                      matrixEffect: 'scrolling-text',
                      scrollingText: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="RNS RGB"
                  className="flex-1 h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] font-mono text-xs text-slate-100 uppercase"
                />
                <button
                  type="button"
                  onClick={() =>
                    onUpdateLedMatrix({
                      ...matrix,
                      enabled: true,
                      matrixEffect: 'scrolling-text',
                    })
                  }
                  className="px-3 h-10 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 whitespace-nowrap"
                >
                  Tampilkan Teks
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* COMMON MATRIX SETTINGS: Warna, Kecepatan, Ukuran, Arah */}
      <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3.5">
        <h3 className="text-sm font-semibold text-slate-100">
          Pengaturan Tampilan Matrix
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-slate-400 block mb-1.5">Warna Utama Matrix</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={matrix.primaryColor}
                onChange={(e) =>
                  onUpdateLedMatrix({ ...matrix, enabled: true, primaryColor: e.target.value.toUpperCase() })
                }
                aria-label="Warna utama LED Matrix"
                className="w-10 h-9 p-0.5 rounded-xl bg-[#0B0F17] border border-white/[0.08] cursor-pointer"
              />
              <div className="flex flex-wrap gap-1">
                {MATRIX_SWATCHES.map((hex) => (
                  <button
                    key={`MP-${hex}`}
                    type="button"
                    onClick={() =>
                      onUpdateLedMatrix({ ...matrix, enabled: true, primaryColor: hex })
                    }
                    className={`w-6 h-6 rounded-full border ${
                      matrix.primaryColor.toUpperCase() === hex ? 'border-white scale-110' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: hex }}
                    aria-label={`Set warna utama ${hex}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 block mb-1.5">Warna Aksen / Pupil Matrix</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={matrix.secondaryColor}
                onChange={(e) =>
                  onUpdateLedMatrix({ ...matrix, enabled: true, secondaryColor: e.target.value.toUpperCase() })
                }
                aria-label="Warna sekunder LED Matrix"
                className="w-10 h-9 p-0.5 rounded-xl bg-[#0B0F17] border border-white/[0.08] cursor-pointer"
              />
              <div className="flex flex-wrap gap-1">
                {MATRIX_SWATCHES.map((hex) => (
                  <button
                    key={`MS-${hex}`}
                    type="button"
                    onClick={() =>
                      onUpdateLedMatrix({ ...matrix, enabled: true, secondaryColor: hex })
                    }
                    className={`w-6 h-6 rounded-full border ${
                      matrix.secondaryColor.toUpperCase() === hex ? 'border-white scale-110' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: hex }}
                    aria-label={`Set warna aksen ${hex}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300">Kecepatan Animasi Matrix</span>
              <span className="font-mono text-cyan-300 tabular-nums">{matrix.speed}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={matrix.speed}
              onChange={(e) =>
                onUpdateLedMatrix({ ...matrix, enabled: true, speed: Number(e.target.value) })
              }
              className="rns-slider w-full"
              style={{
                background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${matrix.speed}%, #1e293b ${matrix.speed}%, #1e293b 100%)`,
                height: '6px',
                borderRadius: '9999px',
              }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300">Ukuran Elemen / Mata</span>
              <span className="font-mono text-cyan-300 tabular-nums">{matrix.size} / 5</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={matrix.size}
              onChange={(e) =>
                onUpdateLedMatrix({ ...matrix, enabled: true, size: Number(e.target.value) })
              }
              className="rns-slider w-full"
              style={{
                background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${((matrix.size - 1) / 4) * 100}%, #1e293b ${((matrix.size - 1) / 4) * 100}%, #1e293b 100%)`,
                height: '6px',
                borderRadius: '9999px',
              }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs text-slate-400 block">Arah Animasi Matrix</span>
          <div className="grid grid-cols-4 gap-1.5">
            {DIRECTIONS.map((dir) => (
              <button
                key={dir.id}
                type="button"
                onClick={() =>
                  onUpdateLedMatrix({ ...matrix, enabled: true, direction: dir.id })
                }
                className={`py-2 px-2 rounded-xl text-xs font-medium min-h-[38px] border ${
                  matrix.direction === dir.id
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 font-semibold'
                    : 'bg-[#0B0F17] border-white/[0.06] text-slate-300'
                }`}
              >
                {dir.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save Matrix Preset */}
        <form onSubmit={handleSaveMatrixPreset} className="pt-2 border-t border-white/[0.06] flex items-center gap-2">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Nama preset matrix..."
            className="flex-1 h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 whitespace-nowrap"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Simpan Preset</span>
          </button>
        </form>

        {presetSavedNotice && (
          <p className="text-xs text-emerald-300">{presetSavedNotice}</p>
        )}
      </section>

      {/* Admin Only: Add New Custom LED Matrix Model */}
      {isAdmin && (
        <section className="rounded-2xl bg-[#111622] border border-cyan-400/30 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Kelola Model Matrix (Admin)
              </h3>
              <p className="text-[11px] text-slate-400">
                Tambahkan model Digital Eyes atau Matrix baru untuk tampil ke semua pengguna.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAdminAdd((v) => !v)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#171F2E] border border-white/[0.08] text-xs font-semibold text-cyan-300 min-h-[38px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAdminAdd ? 'Tutup' : 'Tambah Model'}</span>
            </button>
          </div>

          {showAdminAdd && (
            <form onSubmit={handleCreateAdminModel} className="space-y-3 pt-2 border-t border-white/[0.06]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Nama model matrix baru..."
                  className="h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100"
                />
                <select
                  value={draftCat}
                  onChange={(e) => setDraftCat(e.target.value as 'eyes' | 'matrix')}
                  className="h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100"
                >
                  <option value="eyes">Digital Eyes</option>
                  <option value="matrix">Matrix Lainnya</option>
                </select>
              </div>

              {draftCat === 'eyes' ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <select
                    value={draftEyeExpr}
                    onChange={(e) => setDraftEyeExpr(e.target.value as EyeExpressionId)}
                    className="h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100"
                  >
                    {EYE_EXPRESSIONS.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draftEyeShape}
                    onChange={(e) => setDraftEyeShape(e.target.value as EyeShapeId)}
                    className="h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100"
                  >
                    {EYE_SHAPES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <select
                    value={draftMatrixEff}
                    onChange={(e) => setDraftMatrixEff(e.target.value as MatrixEffectId)}
                    className="h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100"
                  >
                    {MATRIX_EFFECTS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  {draftMatrixEff === 'scrolling-text' && (
                    <input
                      type="text"
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value.toUpperCase())}
                      placeholder="Teks berjalan..."
                      className="h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] font-mono text-xs text-slate-100"
                    />
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <span>Warna 1</span>
                  <input
                    type="color"
                    value={draftC1}
                    onChange={(e) => setDraftC1(e.target.value.toUpperCase())}
                    className="w-9 h-8 p-0.5 rounded bg-[#0B0F17] border border-white/10"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <span>Warna 2</span>
                  <input
                    type="color"
                    value={draftC2}
                    onChange={(e) => setDraftC2(e.target.value.toUpperCase())}
                    className="w-9 h-8 p-0.5 rounded bg-[#0B0F17] border border-white/10"
                  />
                </label>
                <button
                  type="submit"
                  className="ml-auto px-4 h-10 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400"
                >
                  Simpan Model
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
};
