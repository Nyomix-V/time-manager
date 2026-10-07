import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { TokenType } from './enums';
import { User } from './user.entity';

// One-time tokens for the email flows (mockup pages 02 & 09):
//   ACTIVATION     -> new user sets their first password (link valid 48h)
//   PASSWORD_RESET -> forgot-password link (valid 30min)
// The actual email sending is out of scope; we store and verify the token.
@Entity('user_tokens')
export class UserToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Index({ unique: true })
  @Column()
  token: string;

  @Column({ type: 'enum', enum: TokenType })
  type: TokenType;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true })
  usedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
