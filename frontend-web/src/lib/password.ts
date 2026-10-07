import { z } from 'zod';

// Password policy shown in the profile (mockup 03): 12+ chars, uppercase, digit, special char.
export const passwordSchema = z
  .string()
  .min(12, '12 caractères minimum.')
  .regex(/[A-Z]/, 'Au moins une majuscule.')
  .regex(/[0-9]/, 'Au moins un chiffre.')
  .regex(/[^A-Za-z0-9]/, 'Au moins un caractère spécial.');

const LABELS = ['Très faible', 'Faible', 'Moyenne', 'Bonne', 'Forte'];

/** 0..4 score, for the strength meter only (the schema above is what is enforced). */
export function passwordStrength(pwd: string): { score: number; label: string } {
  if (!pwd) return { score: 0, label: LABELS[0] };
  let score = 0;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return { score, label: LABELS[score] };
}
