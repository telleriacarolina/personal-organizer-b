import { RecordNoteMediaType } from '@/types';

/**
 * Pick the first MIME type that MediaRecorder supports on this browser.
 * Order matters: prefer opus-based codecs for audio, vp8+opus for video.
 */
export function selectMimeType(mode: 'voice' | 'video'): string {
  const candidates =
    mode === 'voice'
      ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
      : ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];

  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  // Last-resort empty string lets the browser choose
  return '';
}

export function label(mode: RecordNoteMediaType): string {
  return mode === 'voice' ? 'Voice memo' : mode === 'video' ? 'Video' : 'Photo';
}

export function defaultTitle(mode: RecordNoteMediaType): string {
  return `${label(mode)} – ${new Date().toLocaleString()}`;
}

export function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
