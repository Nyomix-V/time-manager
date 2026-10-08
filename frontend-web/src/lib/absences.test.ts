import { ABSENCE_LABELS, formatAbsenceRange } from './absences';

describe('ABSENCE_LABELS', () => {
  it('translates the backend absence types', () => {
    expect(ABSENCE_LABELS.SICK).toBe('Arrêt maladie');
    expect(ABSENCE_LABELS.MISSED_CLOCK).toBe('Oubli de pointage');
  });
});

describe('formatAbsenceRange', () => {
  it('shows one date for a single day', () => {
    expect(formatAbsenceRange('2026-10-08T00:00:00', '2026-10-08T23:59:59')).toBe('8 oct.');
  });
  it('shows a range otherwise', () => {
    expect(formatAbsenceRange('2026-10-08T00:00:00', '2026-10-10T23:59:59')).toBe('8 oct. – 10 oct.');
  });
});
