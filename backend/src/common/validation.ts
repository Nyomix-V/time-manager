import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

// Global input validation: rejects unknown fields, auto-transforms DTOs.
// Shared by main.ts and the route tests so both validate the same way.
//
// class-validator writes its messages in English ("email must be an email") and the
// apps show error messages as they are: they are translated here, one per field.
// A message set on a decorator (e.g. the password policy) is kept as is.

const FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  password: 'Mot de passe',
  currentPassword: 'Mot de passe actuel',
  newPassword: 'Nouveau mot de passe',
  token: 'Lien',
  firstName: 'Prénom',
  lastName: 'Nom',
  phone: 'Téléphone',
  role: 'Rôle',
  branchId: 'Branche',
  teamId: 'Équipe',
  managerId: 'Manager',
  name: 'Nom',
  description: 'Description',
  workingDays: 'Jours travaillés',
  expectedStartMin: "Heure d'arrivée",
  workMinutesPerDay: 'Temps de travail par jour',
  breakMinutes: 'Pause',
  type: 'Type',
  startDate: 'Date de début',
  endDate: 'Date de fin',
  comment: 'Commentaire',
  attachmentPath: 'Justificatif',
  status: 'Décision',
  decisionComment: 'Motif',
  field: 'Champ',
  newValue: 'Nouvelle valeur',
  reason: 'Motif',
};

const numberIn = (message: string) => message.match(/-?\d+(\.\d+)?/)?.[0] ?? '';

// In priority order: when a field breaks several rules, the first one listed wins.
const RULES: Record<string, (label: string, message: string) => string> = {
  whitelistValidation: (label) => `Champ non autorisé : ${label}`,
  isDefined: (label) => `${label} : obligatoire`,
  isNotEmpty: (label) => `${label} : obligatoire`,
  isString: (label) => `${label} : texte attendu`,
  isEmail: (label) => `${label} : adresse email invalide`,
  isEnum: (label) => `${label} : valeur non autorisée`,
  isIn: (label) => `${label} : valeur non autorisée`,
  isDateString: (label) => `${label} : date invalide`,
  isInt: (label) => `${label} : nombre entier attendu`,
  minLength: (label, m) => `${label} : ${numberIn(m)} caractères minimum`,
  maxLength: (label, m) => `${label} : ${numberIn(m)} caractères maximum`,
  min: (label, m) => `${label} : ${numberIn(m)} au minimum`,
  max: (label, m) => `${label} : ${numberIn(m)} au maximum`,
};

function frenchMessages(errors: ValidationError[], parent = ''): string[] {
  return errors.flatMap((error) => {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const constraints = error.constraints ?? {};
    const keys = Object.keys(constraints);
    const known = Object.keys(RULES).find((key) => keys.includes(key));
    const own = known
      ? [RULES[known](FIELD_LABELS[error.property] ?? path, constraints[known])]
      : keys.slice(0, 1).map((key) => constraints[key]); // custom message, already in French
    return [...own, ...frenchMessages(error.children ?? [], path)];
  });
}

export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => new BadRequestException(frenchMessages(errors)),
  });
}
