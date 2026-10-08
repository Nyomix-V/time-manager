import { BadRequestException } from '@nestjs/common';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, MinLength } from 'class-validator';
import { createValidationPipe } from './validation';

class SampleDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsOptional() @IsString() @MaxLength(5) comment?: string;
  @IsOptional() @IsIn(['APPROVED', 'REJECTED']) status?: string;
  @IsOptional() @IsInt() @Max(480) breakMinutes?: number;
  @IsOptional() @Matches(/^ok$/, { message: 'Message défini sur le décorateur' }) code?: string;
}

async function messagesFor(body: object): Promise<string[]> {
  try {
    await createValidationPipe().transform(body, { type: 'body', metatype: SampleDto });
    return [];
  } catch (e) {
    expect(e).toBeInstanceOf(BadRequestException);
    return ((e as BadRequestException).getResponse() as { message: string[] }).message;
  }
}

describe('createValidationPipe (French messages)', () => {
  const valid = { email: 'emma@trinity.io', password: 'secret123' };

  it('accepts a valid body', async () => {
    expect(await messagesFor(valid)).toEqual([]);
  });

  it('translates the class-validator messages, one per field', async () => {
    expect(await messagesFor({ email: 'pas-un-email', password: '123' })).toEqual([
      'Email : adresse email invalide',
      'Mot de passe : 6 caractères minimum',
    ]);
    expect(await messagesFor({ password: 'secret123' })).toEqual(['Email : adresse email invalide']);
    expect(await messagesFor({ ...valid, comment: 'beaucoup trop long' })).toEqual(['Commentaire : 5 caractères maximum']);
    expect(await messagesFor({ ...valid, status: 'PENDING' })).toEqual(['Décision : valeur non autorisée']);
    expect(await messagesFor({ ...valid, breakMinutes: 600 })).toEqual(['Pause : 480 au maximum']);
    expect(await messagesFor({ ...valid, breakMinutes: 1.5 })).toEqual(['Pause : nombre entier attendu']);
  });

  it('names an unknown field', async () => {
    expect(await messagesFor({ ...valid, role: 'ADMIN' })).toEqual(['Champ non autorisé : Rôle']);
    expect(await messagesFor({ ...valid, isAdmin: true })).toEqual(['Champ non autorisé : isAdmin']);
  });

  it('keeps a message set on the decorator', async () => {
    expect(await messagesFor({ ...valid, code: 'ko' })).toEqual(['Message défini sur le décorateur']);
  });
});
