import type { TimeEntry } from '@/types';

export type RideshareProvider = 'uber' | 'lyft';

export interface RideshareImportResult {
  entries: Array<Omit<TimeEntry, 'id' | 'createdAt'>>;
  skippedRows: number;
}

const DATE_HEADER_HINTS = ['start date', 'start time', 'pickup time', 'request time', 'accepted at', 'date', 'start', 'pickup', 'request'];
const END_HEADER_HINTS = ['end', 'dropoff', 'completed', 'finish'];
const DURATION_HEADER_HINTS = ['duration', 'online minutes', 'minutes'];
const DESCRIPTION_HEADER_HINTS = ['rider', 'passenger', 'trip id', 'ride id', 'request id'];
const MAX_REASONABLE_DURATION_MINUTES = 24 * 60;

export function parseRideshareCsv(provider: RideshareProvider, rawCsv: string): RideshareImportResult {
  const rows = parseCsvRows(rawCsv);
  if (rows.length < 2) {
    return { entries: [], skippedRows: 0 };
  }

  const headers = rows[0].map((header) => normalizeHeader(header));
  const dateIndex = resolveHeaderIndex(headers, DATE_HEADER_HINTS);
  const endIndex = resolveHeaderIndex(headers, END_HEADER_HINTS);
  const durationIndex = resolveHeaderIndex(headers, DURATION_HEADER_HINTS);
  const descriptionIndex = resolveHeaderIndex(headers, DESCRIPTION_HEADER_HINTS);

  if (dateIndex < 0) {
    return { entries: [], skippedRows: rows.length - 1 };
  }

  const entries: Array<Omit<TimeEntry, 'id' | 'createdAt'>> = [];
  let skippedRows = 0;

  rows.slice(1).forEach((row) => {
    const startTime = parseDateToMs(row[dateIndex]);
    if (!startTime) {
      skippedRows += 1;
      return;
    }

    const endTime = endIndex >= 0 ? parseDateToMs(row[endIndex]) : undefined;
    const duration = parseDurationMinutes(durationIndex >= 0 ? row[durationIndex] : undefined, startTime, endTime);
    const detail = descriptionIndex >= 0 ? normalizeText(row[descriptionIndex]) : undefined;

    const description = detail ? `${labelForProvider(provider)} trip (${detail})` : `${labelForProvider(provider)} trip`;

    entries.push({
      description,
      project: labelForProvider(provider),
      startTime,
      endTime,
      duration,
    });
  });

  return { entries, skippedRows };
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase();
}

function resolveHeaderIndex(headers: string[], hints: string[]) {
  for (const hint of hints) {
    const index = headers.findIndex((header) => header.includes(hint));
    if (index >= 0) return index;
  }
  return -1;
}

function normalizeText(value: string | undefined) {
  if (!value) return undefined;
  const text = value.trim();
  return text.length > 0 ? text : undefined;
}

function parseDurationMinutes(rawDuration: string | undefined, startTime: number, endTime?: number) {
  const text = normalizeText(rawDuration);
  if (text) {
    const parts = text.match(/(\d+(?:\.\d+)?)/g);
    if (parts && parts.length > 0) {
      const isColonDuration = text.includes(':') && parts.length >= 2;
      if (isColonDuration) {
        const hours = Number(parts[0]);
        const minutes = Number(parts[1]);
        if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
          const totalMinutes = Math.round((hours * 60) + minutes);
          if (totalMinutes > 0 && totalMinutes <= MAX_REASONABLE_DURATION_MINUTES) {
            return totalMinutes;
          }
        }
      } else {
        const numericMinutes = Number(parts[0]);
        if (Number.isNaN(numericMinutes)) {
          return undefined;
        }
        if (text.toLowerCase().includes('hour')) {
          const hourPortion = numericMinutes;
          const minutePortion = parts.length > 1 ? Number(parts[1]) : 0;
          if (Number.isNaN(minutePortion)) {
            return undefined;
          }
          const totalMinutes = Math.round((hourPortion * 60) + minutePortion);
          if (totalMinutes > 0 && totalMinutes <= MAX_REASONABLE_DURATION_MINUTES) {
            return totalMinutes;
          }
          return undefined;
        }
        const totalMinutes = Math.round(numericMinutes);
        if (totalMinutes > 0 && totalMinutes <= MAX_REASONABLE_DURATION_MINUTES) {
          return totalMinutes;
        }
      }
    }
  }

  if (endTime && endTime > startTime) {
    return Math.max(1, Math.round((endTime - startTime) / 60000));
  }

  return undefined;
}

function parseDateToMs(rawDate: string | undefined) {
  const text = normalizeText(rawDate);
  if (!text) return undefined;

  const timestamp = Date.parse(text);
  if (!Number.isNaN(timestamp)) {
    return timestamp;
  }

  const normalized = text.replace(/\//g, '-');
  const fallback = Date.parse(normalized);
  if (!Number.isNaN(fallback)) {
    return fallback;
  }

  return undefined;
}

function labelForProvider(provider: RideshareProvider) {
  return provider === 'uber' ? 'Uber Driver' : 'Lyft Driver';
}

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      row.push(cell);
      const hasValue = row.some((value) => value.trim().length > 0);
      if (hasValue) {
        rows.push(row);
      }
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  const hasValue = row.some((value) => value.trim().length > 0);
  if (hasValue) {
    rows.push(row);
  }

  return rows;
}
