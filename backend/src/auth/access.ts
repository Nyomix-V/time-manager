import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { AuthUser, assertCanReadUser } from './scope';

// Loads the user whose data is requested (clocks, hours, absences, requests)
// and checks the actor may read it: themselves, their branch (manager,
// directeur), or anyone (admin). Every ":userId" route goes through this.
export async function loadReadableUser(users: Repository<User>, actor: AuthUser, userId: string): Promise<User> {
  const user = await users.findOne({ where: { id: userId } });
  if (!user) throw new NotFoundException('Utilisateur introuvable');
  assertCanReadUser(actor, user);
  return user;
}
