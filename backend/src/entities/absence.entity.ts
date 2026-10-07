import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { AbsenceType, RequestStatus } from './enums';
import { User } from './user.entity';

// Employee justifies an absence; manager/directeur/admin approves or rejects
// with a comment (mockup pages 06 & 13).
@Entity('absences')
export class Absence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: AbsenceType })
  type: AbsenceType;

  @Column({ type: 'datetime' })
  startDate: Date;

  @Column({ type: 'datetime' })
  endDate: Date;

  @Column({ nullable: true })
  comment?: string;

  // Path/URL of the uploaded justificatif (PDF/JPG/PNG). File storage itself
  // is out of scope here; we keep the reference.
  @Column({ nullable: true })
  attachmentPath?: string;

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

  @ManyToOne(() => User, (user) => user.absences, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
