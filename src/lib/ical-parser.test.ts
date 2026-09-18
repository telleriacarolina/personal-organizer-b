import { describe, expect, it } from 'vitest';
import { parseICalText } from './ical-parser';

const BASIC_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event-001@test.com
SUMMARY:Team Stand-up
DTSTART:20260922T090000
DTEND:20260922T093000
DESCRIPTION:Daily stand-up meeting
LOCATION:Conference Room A
END:VEVENT
END:VCALENDAR`;

const ALL_DAY_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event-002@test.com
SUMMARY:Company Holiday
DTSTART;VALUE=DATE:20261225
DESCRIPTION:Christmas Day
END:VEVENT
END:VCALENDAR`;

const UTC_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event-003@test.com
SUMMARY:Conference Call
DTSTART:20261001T150000Z
DTEND:20261001T160000Z
END:VEVENT
END:VCALENDAR`;

const MULTI_EVENT_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:multi-1@test.com
SUMMARY:First Event
DTSTART:20261005T100000
DTEND:20261005T110000
END:VEVENT
BEGIN:VEVENT
UID:multi-2@test.com
SUMMARY:Second Event
DTSTART:20261006T140000
DTEND:20261006T150000
END:VEVENT
END:VCALENDAR`;

const FOLDED_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:folded-1@test.com
SUMMARY:Long Event Title That Gets 
 Folded Across Lines
DTSTART:20261010T100000
END:VEVENT
END:VCALENDAR`;

const NO_UID_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:No UID Event
DTSTART:20261010T100000
END:VEVENT
END:VCALENDAR`;

const ESCAPE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:escape-1@test.com
SUMMARY:Meeting\\, Lunch
DESCRIPTION:Bring laptop\\nCheck email
DTSTART:20261015T120000
END:VEVENT
END:VCALENDAR`;

const TZID_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:tzid-1@test.com
SUMMARY:Local Meeting
DTSTART;TZID=America/New_York:20261020T090000
DTEND;TZID=America/New_York:20261020T100000
END:VEVENT
END:VCALENDAR`;

describe('parseICalText', () => {
  it('parses a basic timed event with all fields', () => {
    const drafts = parseICalText(BASIC_ICS);
    expect(drafts).toHaveLength(1);
    const d = drafts[0];
    expect(d.title).toBe('Team Stand-up');
    expect(d.description).toBe('Daily stand-up meeting');
    expect(d.location).toBe('Conference Room A');
    expect(d.startTime).toBe('09:00');
    expect(d.endTime).toBe('09:30');
    expect(d.allDay).toBe(false);
    expect(d.sourceType).toBe('ical');
    expect(d.sourceId).toBe('ical:event-001@test.com');
    expect(d.color).toBe('blue');
  });

  it('parses an all-day event without time components', () => {
    const drafts = parseICalText(ALL_DAY_ICS);
    expect(drafts).toHaveLength(1);
    const d = drafts[0];
    expect(d.title).toBe('Company Holiday');
    expect(d.allDay).toBe(true);
    expect(d.startTime).toBeUndefined();
    expect(d.endTime).toBeUndefined();
    expect(d.sourceId).toBe('ical:event-002@test.com');
  });

  it('parses a UTC date-time event', () => {
    const drafts = parseICalText(UTC_ICS);
    expect(drafts).toHaveLength(1);
    const d = drafts[0];
    expect(d.title).toBe('Conference Call');
    expect(d.allDay).toBe(false);
    expect(d.startTime).toBe('15:00');
    expect(d.endTime).toBe('16:00');
  });

  it('parses multiple events from one file', () => {
    const drafts = parseICalText(MULTI_EVENT_ICS);
    expect(drafts).toHaveLength(2);
    expect(drafts[0].title).toBe('First Event');
    expect(drafts[1].title).toBe('Second Event');
    expect(drafts[0].sourceId).toBe('ical:multi-1@test.com');
    expect(drafts[1].sourceId).toBe('ical:multi-2@test.com');
  });

  it('unfolds folded lines correctly', () => {
    const drafts = parseICalText(FOLDED_ICS);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].title).toBe('Long Event Title That Gets Folded Across Lines');
  });

  it('skips events without a UID', () => {
    const drafts = parseICalText(NO_UID_ICS);
    expect(drafts).toHaveLength(0);
  });

  it('unescapes special characters in SUMMARY and DESCRIPTION', () => {
    const drafts = parseICalText(ESCAPE_ICS);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].title).toBe('Meeting, Lunch');
    expect(drafts[0].description).toBe('Bring laptop\nCheck email');
  });

  it('parses DTSTART with TZID parameter', () => {
    const drafts = parseICalText(TZID_ICS);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].startTime).toBe('09:00');
    expect(drafts[0].endTime).toBe('10:00');
    expect(drafts[0].allDay).toBe(false);
  });

  it('stores the date as start-of-day milliseconds', () => {
    const drafts = parseICalText(BASIC_ICS);
    const d = drafts[0];
    const date = new Date(d.date);
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
    expect(date.getSeconds()).toBe(0);
    expect(date.getMilliseconds()).toBe(0);
  });

  it('returns an empty array for an empty calendar', () => {
    const drafts = parseICalText('BEGIN:VCALENDAR\nEND:VCALENDAR');
    expect(drafts).toHaveLength(0);
  });

  it('guesses appointment type from summary keywords', () => {
    const ics = `BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:appt-1\nSUMMARY:Doctor Appointment\nDTSTART:20261001\nEND:VEVENT\nEND:VCALENDAR`;
    const drafts = parseICalText(ics);
    expect(drafts[0].type).toBe('appointment');
  });

  it('guesses occasion type from summary keywords', () => {
    const ics = `BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:occ-1\nSUMMARY:Jane Birthday\nDTSTART:20261001\nEND:VEVENT\nEND:VCALENDAR`;
    const drafts = parseICalText(ics);
    expect(drafts[0].type).toBe('occasion');
  });
});
