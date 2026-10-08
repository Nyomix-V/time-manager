import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Clock } from '../entities/clock.entity';
import { businessDay } from '../common/time';

export interface WorkedDay {
  date: string; // YYYY-MM-DD
  hours: number;
}

// Minimal structural type -> the pure calc stays decoupled from the entity/DB.
export type ClockLike = {
  time: Date;
  type: 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END';
};

export interface WorkSummary {
  totalHours: number;
  breakMinutes: number;
  perDay: WorkedDay[];
}

@Injectable()
export class WorkingTimesService {
  constructor(
    @InjectRepository(Clock) private readonly clocks: Repository<Clock>,
  ) {}

  async summary(userId: string, from?: Date, to?: Date): Promise<WorkSummary> {
    let timeFilter;
    if (from && to) timeFilter = Between(from, to);
    else if (from) timeFilter = MoreThanOrEqual(from);
    else if (to) timeFilter = LessThanOrEqual(to);

    const rows = await this.clocks.find({
      where: timeFilter ? { userId, time: timeFilter } : { userId },
      order: { time: 'ASC' },
    });
    return WorkingTimesService.compute(rows);
  }

  // Pure state machine over the ordered events:
  //   IN -> working ; BREAK_START -> pause (counter stops) ;
  //   BREAK_END -> working ; OUT -> stop.
  // Worked time EXCLUDES breaks (mockup page 04: "le compteur d'heures s'arrête").
  // Business-critical ("a wrong hour count can lead to strikes") -> unit-tested.
  static compute(clocks: ClockLike[]): WorkSummary {
    const workedMsByDay = new Map<string, number>();
    let breakMs = 0;
    let workingSince: Date | null = null;
    let breakSince: Date | null = null;

    const addWorked = (end: Date) => {
      if (!workingSince) return;
      // Day in the business time zone, not UTC (a 00:30 Paris arrival belongs to that Paris day).
      const day = businessDay(workingSince);
      workedMsByDay.set(
        day,
        (workedMsByDay.get(day) ?? 0) + (end.getTime() - workingSince.getTime()),
      );
      workingSince = null;
    };

    for (const c of clocks) {
      switch (c.type) {
        case 'IN':
          if (!workingSince) workingSince = c.time;
          break;
        case 'BREAK_START':
          addWorked(c.time);
          breakSince = c.time;
          break;
        case 'BREAK_END':
          if (breakSince) {
            breakMs += c.time.getTime() - breakSince.getTime();
            breakSince = null;
          }
          workingSince = c.time;
          break;
        case 'OUT':
          addWorked(c.time);
          if (breakSince) {
            breakMs += c.time.getTime() - breakSince.getTime();
            breakSince = null;
          }
          break;
      }
    }

    const perDay = [...workedMsByDay.entries()]
      .map(([date, ms]) => ({ date, hours: round2(ms / 3_600_000) }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const totalHours = round2(perDay.reduce((s, d) => s + d.hours, 0));
    return { totalHours, breakMinutes: Math.round(breakMs / 60_000), perDay };
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
