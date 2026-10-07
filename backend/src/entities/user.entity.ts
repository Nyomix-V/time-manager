import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Role, UserStatus } from './enums';
import { Branch } from './branch.entity';
import { Team } from './team.entity';
import { Clock } from './clock.entity';
import { Absence } from './absence.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone?: string;

  // select:false -> never returned by default queries, so it can't leak.
  @Column({ nullable: true, select: false })
  passwordHash?: string;

  @Column({ nullable: true, unique: true })
  msOid?: string; // Microsoft object id (SSO)

  @Column({ type: 'enum', enum: Role, default: Role.EMPLOYEE })
  role: Role;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.INVITED })
  status: UserStatus;

  // --- Organisation ---
  @Index()
  @Column({ type: 'uuid', nullable: true })
  branchId?: string;

  @ManyToOne(() => Branch, (branch) => branch.users, { nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  teamId?: string; // null = "sans équipe"

  @ManyToOne(() => Team, (team) => team.members, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'teamId' })
  team?: Team;

  // --- Planning (set by the manager; mockup pages 03 & 09) ---
  // Worked weekdays as ISO numbers joined by commas, e.g. "1,2,3,4,5" (Mon–Fri).
  @Column({ default: '1,2,3,4,5' })
  workingDays: string;

  @Column({ default: 540 }) // expected arrival, minutes from midnight (540 = 09:00)
  expectedStartMin: number;

  @Column({ default: 420 }) // worked minutes per day (420 = 7h)
  workMinutesPerDay: number;

  @Column({ default: 45 }) // break minutes per day
  breakMinutes: number;

  // --- Lifecycle ---
  @DeleteDateColumn()
  deletedAt?: Date; // soft delete (RGPD: row hidden, clocks kept anonymised)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Clock, (clock) => clock.user)
  clocks: Clock[];

  @OneToMany(() => Absence, (absence) => absence.user)
  absences: Absence[];
}
