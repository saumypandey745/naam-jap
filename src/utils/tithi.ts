/**
 * utils/tithi.ts
 *
 * Hindu Panchang utilities — Tithi, Vaar, and Vishesh Divas.
 * Uses algorithmic calculation (no external API needed).
 *
 * Note: This is an approximation. For precise tithi,
 * a full Panchang library would be needed.
 */

export type Vaar =
  | 'Ravivar'
  | 'Somvar'
  | 'Mangalvar'
  | 'Budhvar'
  | 'Guruvar'
  | 'Shukravar'
  | 'Shanivar';

export const VAAR_NAMES: Record<number, { hindi: string; english: string; deity: string }> = {
  0: { hindi: 'रविवार', english: 'Sunday', deity: 'Surya' },
  1: { hindi: 'सोमवार', english: 'Monday', deity: 'Shiva' },
  2: { hindi: 'मंगलवार', english: 'Tuesday', deity: 'Hanuman' },
  3: { hindi: 'बुधवार', english: 'Wednesday', deity: 'Ganesha' },
  4: { hindi: 'गुरुवार', english: 'Thursday', deity: 'Vishnu' },
  5: { hindi: 'शुक्रवार', english: 'Friday', deity: 'Lakshmi' },
  6: { hindi: 'शनिवार', english: 'Saturday', deity: 'Shani' },
};

export const TITHI_NAMES: string[] = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima/Amavasya',
];

export const TITHI_HINDI: string[] = [
  'प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पंचमी',
  'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी',
  'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'पूर्णिमा/अमावस्या',
];

/**
 * Approximate tithi calculation.
 * Tithi = phase of moon (1-30), changes roughly every 24h.
 */
export function getTithiInfo(date: Date = new Date()): {
  tithiNumber: number;   // 1-30
  tithiName: string;
  tithiHindi: string;
  isShukla: boolean;     // Shukla (waxing) or Krishna (waning) paksha
  paksha: string;
} {
  // Julian Day Number approximation
  const JD =
    367 * date.getFullYear() -
    Math.floor((7 * (date.getFullYear() + Math.floor((date.getMonth() + 10) / 12))) / 4) +
    Math.floor((275 * (date.getMonth() + 1)) / 9) +
    date.getDate() +
    1721013.5 +
    (date.getHours() + date.getMinutes() / 60) / 24;

  // Moon phase approximation (synodic period ~29.53 days)
  const synodicPeriod = 29.53058867;
  const newMoonRef = 2451549.5; // Known new moon reference (Jan 6, 2000)
  const phase = ((JD - newMoonRef) % synodicPeriod + synodicPeriod) % synodicPeriod;

  // Convert to tithi (each tithi ≈ 0.98 days)
  const tithiDecimal = (phase / synodicPeriod) * 30;
  const tithiNumber = Math.floor(tithiDecimal) + 1; // 1-30
  const idx = Math.min(tithiNumber - 1, 14); // 0-14 index

  const isShukla = tithiNumber <= 15;

  return {
    tithiNumber,
    tithiName: tithiNumber === 15
      ? 'Purnima'
      : tithiNumber === 30
      ? 'Amavasya'
      : TITHI_NAMES[idx],
    tithiHindi: tithiNumber === 15
      ? 'पूर्णिमा'
      : tithiNumber === 30
      ? 'अमावस्या'
      : TITHI_HINDI[idx],
    isShukla,
    paksha: isShukla ? 'Shukla Paksha' : 'Krishna Paksha',
  };
}

export function getVaarInfo(date: Date = new Date()) {
  return VAAR_NAMES[date.getDay()];
}

/**
 * Check if today is a special spiritual day
 */
export function getVisheshDivas(date: Date = new Date()): string | null {
  const tithi = getTithiInfo(date);
  const vaar = VAAR_NAMES[date.getDay()];

  if (tithi.tithiNumber === 15) return '🌕 Purnima — Vishesh Jap Din';
  if (tithi.tithiNumber === 30) return '🌑 Amavasya — Pitra Tarpan';
  if (tithi.tithiName === 'Ekadashi') return '🌿 Ekadashi — Vishnu Bhakti';
  if (vaar.deity === 'Hanuman' && tithi.tithiName === 'Purnima') return '🪬 Hanuman Purnima';
  if (vaar.deity === 'Shiva') return '🕉️ Somvar — Shiv Bhakti';
  if (vaar.deity === 'Hanuman') return '🪬 Mangalvar — Hanuman Bhakti';

  return null;
}
