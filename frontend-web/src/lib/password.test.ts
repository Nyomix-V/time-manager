import { passwordSchema, passwordStrength } from './password';

describe('passwordSchema', () => {
  it('accepts a strong password', () =>
    expect(passwordSchema.safeParse('Tr1nity-Market!').success).toBe(true));
  it.each(['Short1!', 'nouppercase123!', 'NoDigitsHere!!', 'NoSpecial12345'])('rejects %s', (pwd) => {
    expect(passwordSchema.safeParse(pwd).success).toBe(false);
  });
});

describe('passwordStrength', () => {
  it('scores 0 for empty and 4 for a compliant password', () => {
    expect(passwordStrength('').score).toBe(0);
    expect(passwordStrength('Tr1nity-Market!')).toEqual({ score: 4, label: 'Forte' });
  });
});
