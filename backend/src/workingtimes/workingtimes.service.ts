import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Clock } from '../entities/clock.entity';

export interface WorkedDay {
  date: string; // YYYY-MM-DD
  hours: number;
}

// Minimal structural type so the pure calc stays decoupled from the entity
// (and from the DB) — easy to unit-test.
export type ClockLike = { time: Date; status: 'IN' | 'OUT' };

@Injectable()
export class WorkingTimesService {
  constructor(
    @InjectRepository(Clock)
    private readonly clocks: Repository<Clock>,
  ) {}

  async summary(
    userId: string,
    from?: Date,
    to?: Date,
  ): Promise<{ totalHours: number; perDay: WorkedDay[] }> {
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

  // Pure function: pair IN->OUT clocks, sum durations, group by day.
  // Business-critical ("a wrong hour count can lead to strikes") -> unit-tested.
  static compute(clocks: ClockLike[]): {
    totalHours: number;
    perDay: WorkedDay[];
  } {
    const perDayMap = new Map<string, number>();
    let openIn: Date | null = null;

    for (const c of clocks) {
      if (c.status === 'IN') {
        openIn = c.time;
      } else if (c.status === 'OUT' && openIn) {
        const ms = c.time.getTime() - openIn.getTime();
        const day = openIn.toISOString().slice(0, 10);
        perDayMap.set(day, (perDayMap.get(day) ?? 0) + ms / 3_600_000);
        openIn = null;
      }
    }

    const perDay = [...perDayMap.entries()]
      .map(([date, hours]) => ({ date, hours: round2(hours) }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const totalHours = round2(perDay.reduce((s, d) => s + d.hours, 0));
    return { totalHours, perDay };
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
