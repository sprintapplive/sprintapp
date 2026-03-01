'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CATEGORY_COLORS } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CategoryData {
  name: string;
  value: number;
  color: string;
  minutes: number;
}

interface CategoryPieChartProps {
  data: CategoryData[];
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const totalMinutes = data.reduce((sum, d) => sum + d.minutes, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCustomLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    if (!percent || percent < 0.05) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={700}
        style={{ fontStyle: 'italic' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className={cn(
      'neo-card p-6 space-y-4'
    )}>
      <h3 className="text-lg font-bold italic text-gold-400">Category Breakdown</h3>
      <div className="h-64">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                labelLine={false}
                label={renderCustomLabel}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CATEGORY_COLORS[entry.color] || '#4a5568'}
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a2619',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
                labelStyle={{ color: '#d4af37', fontWeight: 600, fontStyle: 'italic' }}
                itemStyle={{ color: '#e8efe8' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any, props: any) => [
                  `${props?.payload?.minutes || 0} min (${value} sprints)`,
                  name,
                ]}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span style={{ color: '#e8efe8', fontSize: 12, fontWeight: 500 }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground italic">
            No data yet
          </div>
        )}
      </div>
      <div className="text-center text-sm text-muted-foreground">
        Total: <span className="font-bold text-gold-400">{totalMinutes}</span> minutes ({Math.round(totalMinutes / 60 * 10) / 10} hours)
      </div>
    </div>
  );
}
