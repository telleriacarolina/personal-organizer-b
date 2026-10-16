import { describe, expect, it } from 'vitest';
import { parseRideshareCsv } from './rideshare-imports';

describe('parseRideshareCsv', () => {
  it('parses Uber driver exports into time entries', () => {
    const csv = [
      'Trip ID,Start Date,End Date,Duration (minutes),Rider',
      'trip-1,2026-10-10T08:00:00Z,2026-10-10T08:25:00Z,25,Alex',
      'trip-2,2026-10-10T09:00:00Z,2026-10-10T09:15:00Z,15,Jordan',
    ].join('\n');

    const result = parseRideshareCsv('uber', csv);

    expect(result.skippedRows).toBe(0);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({
      description: 'Uber Driver trip (Alex)',
      project: 'Uber Driver',
      duration: 25,
      endTime: Date.parse('2026-10-10T08:25:00Z'),
    });
  });

  it('parses Lyft exports and infers duration from timestamps when missing', () => {
    const csv = [
      'Ride ID,Pickup Time,Dropoff Time,Passenger',
      'ride-1,2026-10-10 13:00:00,2026-10-10 13:42:00,Riley',
    ].join('\n');

    const result = parseRideshareCsv('lyft', csv);

    expect(result.skippedRows).toBe(0);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      description: 'Lyft Driver trip (Riley)',
      project: 'Lyft Driver',
      duration: 42,
      startTime: Date.parse('2026-10-10 13:00:00'),
      endTime: Date.parse('2026-10-10 13:42:00'),
    });
  });

  it('skips rows that cannot be parsed and keeps valid ones', () => {
    const csv = [
      'Trip ID,Start Date,End Date,Duration (minutes)',
      'trip-1,not-a-date,2026-10-10T08:25:00Z,25',
      'trip-2,2026-10-10T09:00:00Z,2026-10-10T09:15:00Z,15',
    ].join('\n');

    const result = parseRideshareCsv('uber', csv);

    expect(result.skippedRows).toBe(1);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].description).toBe('Uber Driver trip');
  });

  it('returns all rows as skipped when no date-like header exists', () => {
    const csv = [
      'Trip ID,Driver,Amount',
      'trip-1,Sam,12.00',
      'trip-2,Pat,15.00',
    ].join('\n');

    const result = parseRideshareCsv('uber', csv);

    expect(result.entries).toHaveLength(0);
    expect(result.skippedRows).toBe(2);
  });
});
