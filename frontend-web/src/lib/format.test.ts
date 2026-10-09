import { formatHours, formatMinutes, initials, minutesToTime, timeToMinutes } from './format';

describe('formatHours', () => {
  it.each([
    [7, '7 h'],
    [7.0833, '7 h 05'],
    [35.5, '35 h 30'],
    [0, '0 h'],
    [-1.5, '−1 h 30'],
    [6.999, '7 h'], // rounding to the minute must carry into the hour
  ])('%s -> %s', (input, expected) => {
    expect(formatHours(input)).toBe(expected);
  });
});

describe('formatMinutes', () => {
  it('keeps minutes under one hour', () => expect(formatMinutes(45)).toBe('45 min'));
  it('switches to hours above', () => expect(formatMinutes(65)).toBe('1 h 05'));
});

describe('time <-> minutes', () => {
  it('converts both ways', () => {
    expect(minutesToTime(540)).toBe('09:00');
    expect(minutesToTime(1005)).toBe('16:45');
    expect(timeToMinutes('16:45')).toBe(1005);
  });
});

describe('initials', () => {
  it('builds uppercase initials', () => expect(initials('léa', 'martin')).toBe('LM'));
  it('falls back when empty', () => expect(initials()).toBe('?'));
});
