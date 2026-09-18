import type { BackgroundImage, CustomColors, ThemePreset } from '@/types/theme';

export function hexToOklch(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const lightness = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const chroma = Math.sqrt(a * a + b_ * b_);
  const hue = (Math.atan2(b_, a) * 180) / Math.PI;

  return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} ${hue >= 0 ? hue.toFixed(1) : (hue + 360).toFixed(1)})`;
}

export function applyTheme(theme: ThemePreset): void {
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--${cssVar}`, value);
  });
}

export function applyCustomColors(colors: CustomColors): void {
  const root = document.documentElement;
  root.style.setProperty('--primary', hexToOklch(colors.primary));
  root.style.setProperty('--accent', hexToOklch(colors.accent));
  root.style.setProperty('--background', hexToOklch(colors.background));
}

export function applyBackgroundImage(image: BackgroundImage | null): void {
  const appContainer = document.querySelector('.min-h-screen');
  if (!(appContainer instanceof HTMLElement)) {
    return;
  }

  if (image) {
    appContainer.style.backgroundImage = `url(${image.url})`;
    appContainer.style.backgroundSize = 'cover';
    appContainer.style.backgroundPosition = 'center';
    appContainer.style.backgroundAttachment = 'fixed';
    appContainer.style.position = 'relative';

    let overlay = appContainer.querySelector('.bg-overlay') as HTMLElement | null;
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'bg-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'var(--background)';
      overlay.style.zIndex = '-1';
      overlay.style.pointerEvents = 'none';
      appContainer.appendChild(overlay);
    }

    overlay.style.opacity = (image.opacity / 100).toString();
    return;
  }

  appContainer.style.backgroundImage = '';
  const overlay = appContainer.querySelector('.bg-overlay');
  if (overlay) {
    overlay.remove();
  }
}
