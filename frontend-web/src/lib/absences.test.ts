import { formatAbsenceRange, splitReason } from './absences';

describe('splitReason', () => {
  it('splits motif and comment', () => {
    expect(splitReason('Congé — vacances en famille')).toEqual({
      motif: 'Congé',
      comment: 'vacances en famille',
    });
  });
  it('handles a motif alone', () =>
    expect(splitReason('Autre')).toEqual({ motif: 'Autre', comment: undefined }));
});

describe('formatAbsenceRange', () => {
  it('shows one date for a single day', () => {
    expect(formatAbsenceRange('2026-10-08T00:00:00', '2026-10-08T23:59:59')).toBe('8 oct.');
  });
  it('shows a range otherwise', () => {
    expect(formatAbsenceRange('2026-10-08T00:00:00', '2026-10-10T23:59:59')).toBe('8 oct. – 10 oct.');
  });
});
