// ---------------------------------------------------------------------------
// Tests – RecordNoteWidget helpers
// ---------------------------------------------------------------------------
// Note: @testing-library/react is not installed in this project, so React hook
// tests (e.g. useLocalStorageState quota handling) require integration tests
// in a browser-like environment. The quota guard itself is a single-line
// try/catch added to useLocalStorageState and is straightforward to verify
// by code review.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, afterEach } from 'vitest';
import { selectMimeType, label, defaultTitle, formatDuration } from './recordNoteUtils';

// ---------------------------------------------------------------------------
// Helper: selectMimeType
// ---------------------------------------------------------------------------

describe('selectMimeType', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a supported voice MIME type when the first candidate is supported', () => {
    const supported = 'audio/webm;codecs=opus';
    const isTypeSupported = vi.fn((type: string) => type === supported);
    vi.stubGlobal('MediaRecorder', { isTypeSupported });

    expect(selectMimeType('voice')).toBe(supported);
    vi.unstubAllGlobals();
  });

  it('falls back to the next candidate when the first is unsupported', () => {
    const isTypeSupported = vi.fn((type: string) => type === 'audio/webm');
    vi.stubGlobal('MediaRecorder', { isTypeSupported });

    expect(selectMimeType('voice')).toBe('audio/webm');
    vi.unstubAllGlobals();
  });

  it('returns empty string when no candidate is supported', () => {
    const isTypeSupported = vi.fn(() => false);
    vi.stubGlobal('MediaRecorder', { isTypeSupported });

    expect(selectMimeType('voice')).toBe('');
    vi.unstubAllGlobals();
  });

  it('returns empty string when MediaRecorder is undefined (SSR / unsupported browser)', () => {
    vi.stubGlobal('MediaRecorder', undefined);

    expect(selectMimeType('voice')).toBe('');
    vi.unstubAllGlobals();
  });

  it('returns the first supported video MIME type', () => {
    const isTypeSupported = vi.fn((type: string) => type === 'video/webm;codecs=vp8,opus');
    vi.stubGlobal('MediaRecorder', { isTypeSupported });

    expect(selectMimeType('video')).toBe('video/webm;codecs=vp8,opus');
    vi.unstubAllGlobals();
  });

  it('falls back to video/webm when the codec variant is unsupported', () => {
    const isTypeSupported = vi.fn((type: string) => type === 'video/webm');
    vi.stubGlobal('MediaRecorder', { isTypeSupported });

    expect(selectMimeType('video')).toBe('video/webm');
    vi.unstubAllGlobals();
  });

  it('tries video/mp4 as last resort for video', () => {
    const isTypeSupported = vi.fn((type: string) => type === 'video/mp4');
    vi.stubGlobal('MediaRecorder', { isTypeSupported });

    expect(selectMimeType('video')).toBe('video/mp4');
    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// Helper: label
// ---------------------------------------------------------------------------

describe('label', () => {
  it('returns "Voice memo" for voice', () => {
    expect(label('voice')).toBe('Voice memo');
  });

  it('returns "Video" for video', () => {
    expect(label('video')).toBe('Video');
  });

  it('returns "Photo" for photo', () => {
    expect(label('photo')).toBe('Photo');
  });
});

// ---------------------------------------------------------------------------
// Helper: defaultTitle
// ---------------------------------------------------------------------------

describe('defaultTitle', () => {
  it('starts with the correct label for each mode', () => {
    expect(defaultTitle('voice')).toMatch(/^Voice memo/);
    expect(defaultTitle('video')).toMatch(/^Video/);
    expect(defaultTitle('photo')).toMatch(/^Photo/);
  });

  it('includes a dash separator between label and date', () => {
    expect(defaultTitle('voice')).toContain(' – ');
  });

  it('is non-empty for all modes', () => {
    for (const mode of ['voice', 'video', 'photo'] as const) {
      expect(defaultTitle(mode).trim().length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Helper: formatDuration
// ---------------------------------------------------------------------------

describe('formatDuration', () => {
  it('formats 0 seconds as 00:00', () => {
    expect(formatDuration(0)).toBe('00:00');
  });

  it('formats 59 seconds as 00:59', () => {
    expect(formatDuration(59)).toBe('00:59');
  });

  it('formats 60 seconds as 01:00', () => {
    expect(formatDuration(60)).toBe('01:00');
  });

  it('formats 90 seconds as 01:30', () => {
    expect(formatDuration(90)).toBe('01:30');
  });

  it('pads single-digit seconds correctly', () => {
    expect(formatDuration(65)).toBe('01:05');
  });

  it('handles values over an hour', () => {
    expect(formatDuration(3661)).toBe('61:01');
  });

  it('pads both minutes and seconds when both are single-digit', () => {
    expect(formatDuration(9)).toBe('00:09');
  });
});

