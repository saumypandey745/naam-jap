/**
 * utils/shareCard.ts
 *
 * Canvas-based achievement share card generator.
 * Creates a beautiful image for sharing on WhatsApp/X/Instagram.
 */

import { formatIndianNumber } from './normalize';

export interface ShareCardData {
  mantraName: string;    // e.g. "श्री राम"
  count: number;
  malaCount: number;
  streakDays?: number;
  date: string;
  userName?: string;
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1080;

export async function generateShareCard(data: ShareCardData): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Dark background gradient
  const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bg.addColorStop(0, '#0D0A1A');
  bg.addColorStop(0.5, '#1A1530');
  bg.addColorStop(1, '#0D0A1A');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Radial glow in center
  const radial = ctx.createRadialGradient(
    CARD_WIDTH / 2, CARD_HEIGHT / 2, 0,
    CARD_WIDTH / 2, CARD_HEIGHT / 2, 400,
  );
  radial.addColorStop(0, 'rgba(201, 132, 42, 0.12)');
  radial.addColorStop(1, 'rgba(201, 132, 42, 0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Border
  ctx.strokeStyle = 'rgba(201, 132, 42, 0.4)';
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, CARD_WIDTH - 80, CARD_HEIGHT - 80);

  // App name top
  ctx.fillStyle = 'rgba(201, 132, 42, 0.6)';
  ctx.font = '500 36px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('नाम जप', CARD_WIDTH / 2, 120);

  // OM symbol
  ctx.fillStyle = '#E8A94A';
  ctx.font = '500 120px serif';
  ctx.textAlign = 'center';
  ctx.fillText('ॐ', CARD_WIDTH / 2, 280);

  // Mantra name
  ctx.fillStyle = '#E8A94A';
  ctx.font = '700 90px sans-serif';
  ctx.fillText(data.mantraName, CARD_WIDTH / 2, 420);

  // Divider line
  ctx.strokeStyle = 'rgba(201, 132, 42, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(200, 460);
  ctx.lineTo(CARD_WIDTH - 200, 460);
  ctx.stroke();

  // Jap count
  ctx.fillStyle = '#F5F0E8';
  ctx.font = '700 160px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(formatIndianNumber(data.count), CARD_WIDTH / 2, 640);

  ctx.fillStyle = 'rgba(197, 186, 168, 0.7)';
  ctx.font = '400 44px Inter, sans-serif';
  ctx.fillText('Jap', CARD_WIDTH / 2, 700);

  // Stats row
  const statsY = 800;
  const col1 = CARD_WIDTH / 2 - 200;
  const col2 = CARD_WIDTH / 2 + 200;

  ctx.fillStyle = '#E8A94A';
  ctx.font = '700 60px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${data.malaCount}`, col1, statsY);
  if (data.streakDays !== undefined) {
    ctx.fillText(`${data.streakDays}`, col2, statsY);
  }

  ctx.fillStyle = 'rgba(197, 186, 168, 0.6)';
  ctx.font = '400 32px Inter, sans-serif';
  ctx.fillText('Malas', col1, statsY + 44);
  if (data.streakDays !== undefined) {
    ctx.fillText('Day Streak 🔥', col2, statsY + 44);
  }

  // Date & branding bottom
  ctx.fillStyle = 'rgba(139, 126, 110, 0.6)';
  ctx.font = '400 28px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${data.date} · Naam Jap App`, CARD_WIDTH / 2, CARD_HEIGHT - 70);

  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png', 0.95);
  });
}

export async function shareToNative(data: ShareCardData): Promise<void> {
  const blob = await generateShareCard(data);
  if (!blob) return;

  const file = new File([blob], 'naam-jap-achievement.png', { type: 'image/png' });
  const text = `🙏 Aaj ${formatIndianNumber(data.count)} ${data.mantraName} jap kiye! Aap bhi karein Naam Jap. #NaamJap #BhaktiLife`;

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: 'Naam Jap Achievement',
      text,
      files: [file],
    });
  } else {
    // Fallback: download the image
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'naam-jap-achievement.png';
    a.click();
    URL.revokeObjectURL(url);
  }
}

export function shareTextOnly(data: ShareCardData): void {
  const text = `🙏 Aaj maine ${formatIndianNumber(data.count)} ${data.mantraName} jap kiye — ${data.malaCount} Mala! Aap bhi karein Naam Jap. #NaamJap #BhaktiLife`;

  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text).catch(() => {});
  }
}
