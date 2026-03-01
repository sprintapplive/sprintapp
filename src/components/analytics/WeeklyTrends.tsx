'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/lib/utils';

interface WeekData {
  day: string;
  sprints: number;
  productive: number;
  wasted: number;
}

interface WeeklyTrendsProps {
  data: WeekData[];
}

export function WeeklyTrends({ data }: WeeklyTrendsProps) {
  return (
    <div className={cn(
      'neo-card p-6 space-y-4'
    )}>
      <h3 className="text-lg font-bold italic text-gold-400">Weekly Activity</h3>
      <div className="h-64">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a2619',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
                labelStyle={{ color: '#d4af37', fontWeight: 600, fontStyle: 'italic' }}
                itemStyle={{ color: '#e8efe8' }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span style={{
                    color: value === 'wasted' ? '#f87171' : '#4a6741',
                    fontSize: 12,
                    textTransform: 'capitalize',
                    fontWeight: 600
                  }}>
                    {value}
                  </span>
                )}
              />
              <Bar
                dataKey="productive"
                fill="#4a6741"
                radius={[4, 4, 0, 0]}
                stackId="a"
              />
              <Bar
                dataKey="wasted"
                fill="#f87171"
                radius={[4, 4, 0, 0]}
                stackId="a"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground italic">
            No data yet
          </div>
        )}
      </div>
    </div>
  );
}
