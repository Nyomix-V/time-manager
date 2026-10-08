import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { AccountRequestType, RequestStatus } from './enums';
import { User } from './user.entity';

// Requests an employee sends to be validated by a manager (mockup page 13):
//   INFO_CHANGE -> wants a field changed (e.g. phone). On approval it is applied.
//   DELETION    -> wants their account removed (RGPD). On approval -> soft delete.
// Business rule: only ONE pending request at a time per user.
@Entity('account_requests')
export class AccountRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: AccountRequestType })
  type: AccountRequestType;

  // For INFO_CHANGE: which field and its new value.
  @Column({ nullable: true })
  field?: string;

  @Column({ nullable: true })
  newValue?: string;

  // Employee's own comment / reason (e.g. deletion reason).
  @Column({ nullable: true })
  reason?: string;

  @Column({ type: 'enum', enum: RequestStatus, default: RequestStatus.PENDING })
  status: RequestStatus;

  // --- Decision ---
  @Column({ type: 'uuid', nullable: true })
  decidedById?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'decidedById' })
  decidedBy?: User;

  @Column({ nullable: true })
  decisionComment?: string;

  @Column({ type: 'datetime', nullable: true })
  decidedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
