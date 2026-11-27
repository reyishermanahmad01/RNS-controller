import React from 'react';
import {
  Car,
  Cpu,
  Crown,
  Eye,
  Flame,
  Gauge,
  Grid,
  Hand,
  Home,
  Layers,
  Palette,
  Power,
  Radio,
  Shield,
  Sliders,
  Sparkles,
  Star,
  Wrench,
  Zap,
} from 'lucide-react';
import { CustomIconId, LogoPresetId } from '../types/controller';
import { RnsLogo } from './RnsLogo';

export const CUSTOM_ICON_OPTIONS: { id: CustomIconId; label: string }[] = [
  { id: 'default', label: 'Bawaan' },
  { id: 'home', label: 'Rumah' },
  { id: 'gauge', label: 'Speedo' },
  { id: 'flame', label: 'Api' },
  { id: 'zap', label: 'Petir' },
  { id: 'layers', label: 'Mode' },
  { id: 'grid', label: 'Matrix' },
  { id: 'sparkles', label: 'Kilau' },
  { id: 'star', label: 'Bintang' },
  { id: 'car', label: 'Motor/Mobil' },
  { id: 'cpu', label: 'Chip' },
  { id: 'sliders', label: 'Fader' },
  { id: 'shield', label: 'Tameng' },
  { id: 'crown', label: 'Mahkota' },
  { id: 'wrench', label: 'Bengkel' },
  { id: 'eye', label: 'Mata' },
  { id: 'power', label: 'Power' },
  { id: 'palette', label: 'Warna' },
  { id: 'radio', label: 'Sinyal' },
  { id: 'hand', label: 'Welcome' },
];

export const LOGO_PRESET_OPTIONS: { id: LogoPresetId; label: string }[] = [
  { id: 'rns-matrix', label: 'RNS Crown' },
  { id: 'shield-turbo', label: 'Tameng Pro' },
  { id: 'bolt-neon', label: 'Petir Neon' },
  { id: 'eye-gt', label: 'Mata GT' },
  { id: 'chip-rgb', label: 'Chip RGB' },
  { id: 'crown-vip', label: 'Mahkota VIP' },
  { id: 'custom', label: 'Foto Sendiri' },
];

export function resolveCustomIconComponent(
  iconId: CustomIconId | undefined,
  fallback: React.ComponentType<{ className?: string }>
): React.ComponentType<{ className?: string }> {
  switch (iconId) {
    case 'home':
      return Home;
    case 'gauge':
      return Gauge;
    case 'flame':
      return Flame;
    case 'zap':
      return Zap;
    case 'layers':
      return Layers;
    case 'grid':
      return Grid;
    case 'sparkles':
      return Sparkles;
    case 'star':
      return Star;
    case 'car':
      return Car;
    case 'cpu':
      return Cpu;
    case 'sliders':
      return Sliders;
    case 'shield':
      return Shield;
    case 'crown':
      return Crown;
    case 'wrench':
      return Wrench;
    case 'eye':
      return Eye;
    case 'power':
      return Power;
    case 'palette':
      return Palette;
    case 'radio':
      return Radio;
    case 'hand':
      return Hand;
    case 'default':
    default:
      return fallback;
  }
}

interface AppBrandLogoProps {
  logoPreset?: LogoPresetId;
  customLogoUrl?: string;
  accentHex?: string;
  className?: string;
}

export const AppBrandLogo: React.FC<AppBrandLogoProps> = ({
  logoPreset = 'rns-matrix',
  customLogoUrl,
  accentHex = '#22D3EE',
  className = 'w-8 h-8',
}) => {
  if (logoPreset === 'custom' && customLogoUrl) {
    return (
      <img
        src={customLogoUrl}
        alt="Logo Aplikasi"
        className={`${className} rounded-xl object-cover border border-white/20 bg-[#0B0F17]`}
      />
    );
  }

  if (logoPreset === 'rns-matrix' || logoPreset === 'custom') {
    return <RnsLogo className={className} />;
  }

  const BadgeIcon =
    logoPreset === 'shield-turbo'
      ? Shield
      : logoPreset === 'bolt-neon'
        ? Zap
        : logoPreset === 'eye-gt'
          ? Eye
          : logoPreset === 'chip-rgb'
            ? Cpu
            : Crown;

  return (
    <span
      className={`${className} rounded-xl flex items-center justify-center border bg-[#0F172A] shrink-0`}
      style={{
        borderColor: accentHex,
        color: accentHex,
        boxShadow: `0 0 12px -3px ${accentHex}`,
      }}
      aria-hidden="true"
    >
      <BadgeIcon className="w-1/2 h-1/2" />
    </span>
  );
};
