'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { cn } from '@/lib/utils';

interface DayData {
  date: string;
  day: string;
  averageScore: number;
  totalSprints: number;
}

interface ScoreChartProps {
  data: DayData[];
  targetScore?: number;
}

export function ScoreChart({ data, targetScore = 7 }: ScoreChartProps) {
  return (
    <div className={cn(
      'neo-card p-6 space-y-4'
    )}>
      <h3 className="text-lg font-bold italic text-gold-400">Average Score Trend</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <YAxis
              domain={[0, 10]}
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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [Number(value).toFixed(1), 'Avg Score']}
            />
            <ReferenceLine
              y={targetScore}
              stroke="#d4af37"
              strokeDasharray="5 5"
              label={{ value: 'Goal', fill: '#d4af37', fontSize: 12, fontWeight: 600 }}
            />
            <Line
              type="monotone"
              dataKey="averageScore"
              stroke="#4a6741"
              strokeWidth={3}
              dot={{ fill: '#4a6741', strokeWidth: 2, stroke: '#2d4a28' }}
              activeDot={{ r: 8, fill: '#d4af37', stroke: '#1a2619', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
