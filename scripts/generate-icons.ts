// Generates the PWA and Apple touch icons from the brand mark (four dots, one per
// language), rendered by Playwright's Chromium. Run: node scripts/generate-icons.ts
import { chromium } from '@playwright/test';

const BACKGROUND = '#f4f3fa'; // --color-bg, light theme
const DOTS = ['#7d93ec', '#e98b78', '#ecc75a', '#6dbb88']; // same as .brand-mark

interface Icon {
  file: string;
  size: number;
  /** Width of the four dots, as a share of the icon. */
  logo: number;
  /** Corner radius as a share of the icon; 0 for a full square. */
  radius: number;
}

const ICONS: Icon[] = [
  { file: 'pwa-192x192.png', size: 192, logo: 0.5, radius: 0.22 },
  { file: 'pwa-512x512.png', size: 512, logo: 0.5, radius: 0.22 },
  // Masks keep at least the centered circle of 80 %: the dots stay well inside it.
  { file: 'pwa-maskable-512x512.png', size: 512, logo: 0.42, radius: 0 },
  // iOS rounds the corners itself and shows transparency as black.
  { file: 'apple-touch-icon.png', size: 180, logo: 0.5, radius: 0 },
];

function svg({ size, logo, radius }: Icon): string {
  // Same proportions as the brand mark: dots of 0.8, gap of 0.2.
  const dot = (size * logo) / 2.25;
  const gap = dot / 4;
  const start = (size - (2 * dot + gap)) / 2 + dot / 2;
  const centers = [
    [start, start],
    [start + dot + gap, start],
    [start, start + dot + gap],
    [start + dot + gap, start + dot + gap],
  ];
  const circles = centers
    .map(
      ([x, y], i) =>
        `<circle cx="${String(x)}" cy="${String(y)}" r="${String(dot / 2)}" fill="${DOTS[i] ?? ''}"/>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(size)}" height="${String(size)}">
    <rect width="${String(size)}" height="${String(size)}" rx="${String(size * radius)}" fill="${BACKGROUND}"/>
    ${circles}
  </svg>`;
}

const browser = await chromium.launch();
for (const icon of ICONS) {
  const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size } });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg(icon)}</body></html>`,
  );
  await page.screenshot({ path: `public/${icon.file}`, omitBackground: true });
  await page.close();
  console.log(`public/${icon.file}`);
}
await browser.close();
