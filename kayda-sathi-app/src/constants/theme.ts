/**
 * Kayda Sathi — Design System
 * Premium dark-first theme with saffron/gold accents (legal + Indian identity).
 */

import '@/global.css';

import { Platform } from 'react-native';

// ── Color Palette ─────────────────────────────────────────────────────────

export const Colors = {
  light: {
    text: '#1A1A2E',
    textSecondary: '#6B7280',
    background: '#F8F9FC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EEF0F6',
    card: '#FFFFFF',
    border: '#E5E7EB',

    // Brand colors
    primary: '#D97706',       // Saffron gold
    primaryLight: '#FEF3C7',
    primaryDark: '#B45309',
    accent: '#1E40AF',        // Deep blue
    accentLight: '#DBEAFE',

    // Semantic colors
    success: '#059669',
    successLight: '#D1FAE5',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    info: '#2563EB',
    infoLight: '#DBEAFE',

    // Category colors
    rental: '#8B5CF6',
    consumer: '#0891B2',
    employment: '#059669',
    cyber: '#DC2626',
    family: '#EC4899',
    property: '#D97706',

    // Case strength gradient
    strengthHigh: '#059669',
    strengthMid: '#D97706',
    strengthLow: '#DC2626',

    // Surface
    overlay: 'rgba(0, 0, 0, 0.5)',
    shimmer: '#F3F4F6',
  },
  dark: {
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    background: '#0A0A1A',
    backgroundElement: '#1A1A2E',
    backgroundSelected: '#252542',
    card: '#16163A',
    border: '#2D2D5E',

    // Brand colors
    primary: '#F59E0B',       // Bright saffron
    primaryLight: '#78350F',
    primaryDark: '#FBBF24',
    accent: '#3B82F6',        // Bright blue
    accentLight: '#1E3A5F',

    // Semantic colors
    success: '#10B981',
    successLight: '#064E3B',
    warning: '#F59E0B',
    warningLight: '#78350F',
    danger: '#EF4444',
    dangerLight: '#7F1D1D',
    info: '#3B82F6',
    infoLight: '#1E3A5F',

    // Category colors
    rental: '#A78BFA',
    consumer: '#22D3EE',
    employment: '#34D399',
    cyber: '#F87171',
    family: '#F472B6',
    property: '#FBBF24',

    // Case strength gradient
    strengthHigh: '#10B981',
    strengthMid: '#F59E0B',
    strengthLow: '#EF4444',

    // Surface
    overlay: 'rgba(0, 0, 0, 0.7)',
    shimmer: '#1F1F3A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// ── Typography ────────────────────────────────────────────────────────────

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const FontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 30,
  '3xl': 36,
} as const;

// ── Spacing ───────────────────────────────────────────────────────────────

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// ── Layout ────────────────────────────────────────────────────────────────

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// ── Category Config ───────────────────────────────────────────────────────

export const CategoryConfig: Record<string, { icon: string; color: keyof typeof Colors.dark }> = {
  'Rental & Tenancy Dispute': { icon: '🏠', color: 'rental' },
  'Consumer Rights Violation': { icon: '🛒', color: 'consumer' },
  'Employment & Labour Dispute': { icon: '💼', color: 'employment' },
  'Cyber Crime & Digital Fraud': { icon: '🔒', color: 'cyber' },
  'Family & Matrimonial Dispute': { icon: '👨‍👩‍👧', color: 'family' },
  'Property & Land Dispute': { icon: '🏗️', color: 'property' },
  'Other Civil Dispute': { icon: '⚖️', color: 'primary' },
};

// ── Quick Templates ───────────────────────────────────────────────────────

export const QuickTemplates = [
  { label: '🏠 Deposit not returned', text: 'My landlord is not returning my security deposit.' },
  { label: '🛒 Defective product', text: 'I received a defective product from an e-commerce site and they are refusing a refund.' },
  { label: '💼 Salary not paid', text: 'My employer has not paid my salary for the last 2 months.' },
  { label: '🔒 UPI fraud', text: 'Someone scammed me through UPI and withdrew money from my bank account.' },
  { label: '🏗️ Builder delay', text: 'The builder has delayed possession of my flat by over 2 years.' },
  { label: '👨‍👩‍👧 Maintenance', text: 'My spouse is not providing maintenance as ordered by the court.' },
];
