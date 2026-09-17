import type { CalendarEntryType } from '@/types';
import type { CalendarImportDraft } from './calendar-imports';

/**
 * Unfold iCal line continuations.
 * RFC 5545 §3.1: a long line may be folded by inserting CRLF followed by a
 * single white-space character (SPACE or HTAB).
 */
function unfoldLines(raw: string): string {
  return raw.replace(/\r?\n[ \t]/g, '');
}

/**
 * Unescape iCal text values (RFC 5545 §3.3.11).
 */
function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * Parse an iCal DATE or DATE-TIME value.
 *
 * Supported formats:
 *   - `YYYYMMDD`           → all-day date
 *   - `YYYYMMDDTHHmmss`    → local date-time
 *   - `YYYYMMDDTHHmmssZ`   → UTC date-time
 *
 * Returns `{ ms, timeStr, isAllDay }`.  `timeStr` is `HH:mm` or `undefined`
 * for all-day events.
 */
function parseDateTimeValue(value: string): { ms: number; timeStr?: string; isAllDay: boolean } {
  // Strip TZID parameter prefix (e.g. "TZID=America/New_York:20260920T093000")
  const colonIdx = value.lastIndexOf(':');
  const raw = colonIdx !== -1 ? value.slice(colonIdx + 1) : value;

  const isUtc = raw.endsWith('Z');
  const cleaned = isUtc ? raw.slice(0, -1) : raw;

  if (cleaned.length === 8) {
    // DATE-only: YYYYMMDD
    const year = parseInt(cleaned.slice(0, 4), 10);
    const month = parseInt(cleaned.slice(4, 6), 10) - 1;
    const day = parseInt(cleaned.slice(6, 8), 10);
    const ms = new Date(year, month, day, 0, 0, 0, 0).getTime();
    return { ms, isAllDay: true };
  }

  if (cleaned.length >= 15) {
    // DATE-TIME: YYYYMMDDTHHmmss[Z]
    const year = parseInt(cleaned.slice(0, 4), 10);
    const month = parseInt(cleaned.slice(4, 6), 10) - 1;
    const day = parseInt(cleaned.slice(6, 8), 10);
    const hours = parseInt(cleaned.slice(9, 11), 10);
    const minutes = parseInt(cleaned.slice(11, 13), 10);
    const seconds = parseInt(cleaned.slice(13, 15), 10);
    const ms = isUtc
      ? Date.UTC(year, month, day, hours, minutes, seconds)
      : new Date(year, month, day, hours, minutes, seconds).getTime();
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return { ms, timeStr, isAllDay: false };
  }

  // Fallback – treat as all-day today
  return { ms: Date.now(), isAllDay: true };
}

/** Extract the bare value from a property line, ignoring parameter segments. */
function extractValue(line: string): string {
  const colonIdx = line.indexOf(':');
  return colonIdx !== -1 ? line.slice(colonIdx + 1) : '';
}

/** Map a rough guess at event purpose to a CalendarEntryType. */
function guessEventType(summary: string, description: string): CalendarEntryType {
  const text = `${summary} ${description}`.toLowerCase();
  if (/appointment|meeting|call|consultation/.test(text)) return 'appointment';
  if (/birthday|anniversary|holiday|celebration/.test(text)) return 'occasion';
  return 'event';
}

/**
 * Parse an iCal (.ics) text string and return a list of CalendarImportDraft
 * objects ready to be fed into `appendImportedCalendarEvent`.
 *
 * Events without a UID or DTSTART are silently skipped.
 */
export function parseICalText(icsContent: string): CalendarImportDraft[] {
  const unfolded = unfoldLines(icsContent);
  const lines = unfolded.split(/\r?\n/);

  const drafts: CalendarImportDraft[] = [];
  let inVEvent = false;

  let uid = '';
  let summary = '';
  let description = '';
  let location = '';
  let dtstart = '';
  let dtend = '';
  let color = '';

  const reset = () => {
    uid = '';
    summary = '';
    description = '';
    location = '';
    dtstart = '';
    dtend = '';
    color = '';
  };

  for (const line of lines) {
    const upper = line.toUpperCase();

    if (upper === 'BEGIN:VEVENT') {
      inVEvent = true;
      reset();
      continue;
    }

    if (upper === 'END:VEVENT') {
      inVEvent = false;

      if (!uid || !dtstart) {
        continue;
      }

      const start = parseDateTimeValue(dtstart);
      const isAllDay = start.isAllDay;
      let endTimeStr: string | undefined;

      if (dtend) {
        const end = parseDateTimeValue(dtend);
        endTimeStr = end.timeStr;
      }

      // Midnight: store as beginning-of-day timestamp so the calendar renders
      // the event on the correct date cell
      const dateMs = new Date(start.ms).setHours(0, 0, 0, 0);

      drafts.push({
        title: unescapeText(summary) || 'Untitled',
        type: guessEventType(summary, description),
        description: description ? unescapeText(description) : undefined,
        date: dateMs,
        startTime: isAllDay ? undefined : start.timeStr,
        endTime: isAllDay ? undefined : endTimeStr,
        allDay: isAllDay,
        location: location ? unescapeText(location) : undefined,
        reminder: undefined,
        color: color || 'blue',
        sourceType: 'ical',
        sourceId: `ical:${uid}`,
      });
      continue;
    }

    if (!inVEvent) continue;

    const propName = line.split(/[;:]/)[0].toUpperCase();

    switch (propName) {
      case 'UID':
        uid = extractValue(line).trim();
        break;
      case 'SUMMARY':
        summary = extractValue(line);
        break;
      case 'DESCRIPTION':
        description = extractValue(line);
        break;
      case 'LOCATION':
        location = extractValue(line);
        break;
      case 'DTSTART':
        dtstart = line.replace(/^DTSTART[^:]*:/i, '').trim();
        break;
      case 'DTEND':
        dtend = line.replace(/^DTEND[^:]*:/i, '').trim();
        break;
      case 'COLOR':
        color = extractValue(line).trim().toLowerCase();
        break;
      default:
        break;
    }
  }

  return drafts;
}
