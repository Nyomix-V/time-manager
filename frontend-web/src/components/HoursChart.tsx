import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatHours } from '@/lib/format';

export interface ChartPoint {
  label: string;
  value: number; // hours
  warn?: boolean;
}

/**
 * Bar chart of hours with a target line (e.g. 35 h / week).
 * Screen readers get an aria-label summary plus a hidden data table, since an SVG chart alone is not accessible.
 */
export function HoursChart({
  data,
  target,
  targetLabel,
  title,
  height = 200,
}: {
  data: ChartPoint[];
  target?: number;
  targetLabel?: string;
  title: string;
  height?: number;
}) {
  if (data.length === 0)
    return <p className="py-10 text-center text-sm text-muted">Aucune donnée sur la période.</p>;
  const summary = data.map((d) => `${d.label} ${formatHours(d.value)}`).join(', ');
  return (
    <figure>
      <div role="img" aria-label={`${title} : ${summary}`} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: 'var(--color-muted)' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: 'var(--color-muted)' }}
              unit=" h"
            />
            <Tooltip
              formatter={(v) => [formatHours(Number(v)), 'Heures']}
              cursor={{ fill: 'var(--color-primary-soft)' }}
            />
            {target !== undefined && (
              <ReferenceLine
                y={target}
                stroke="var(--color-danger)"
                strokeDasharray="5 4"
                label={{
                  value: targetLabel ?? formatHours(target),
                  position: 'insideTopRight',
                  fill: 'var(--color-danger)',
                  fontSize: 11,
                }}
              />
            )}
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={34}>
              {data.map((d) => (
                <Cell key={d.label} fill={d.warn ? 'var(--color-warning-bar)' : 'var(--color-primary)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        <table>
          <caption>{title}</caption>
          <tbody>
            {data.map((d) => (
              <tr key={d.label}>
                <th scope="row">{d.label}</th>
                <td>{formatHours(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
