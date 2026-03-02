'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { OlympicsLap } from '@/lib/types';

interface OlympicsTrackProps {
  laps: OlympicsLap[];
  currentLapIndex: number;
  lapProgress: number; // 0 to 1 for current lap
  isOvertime: boolean;
  totalProgress: number; // 0 to 1 for entire session
}

export function OlympicsTrack({
  laps,
  currentLapIndex,
  lapProgress,
  isOvertime,
  totalProgress,
}: OlympicsTrackProps) {
  // SVG dimensions
  const width = 400;
  const height = 240;
  const padding = 30;

  // Track dimensions (oval)
  const trackWidth = width - padding * 2;
  const trackHeight = height - padding * 2;
  const rx = trackWidth / 2; // horizontal radius
  const ry = trackHeight / 2; // vertical radius
  const cx = width / 2; // center x
  const cy = height / 2; // center y

  // Calculate the perimeter of the ellipse (approximation)
  const perimeter = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));

  // Create ellipse path
  const trackPath = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy}`;

  // Calculate lap markers positions on the track
  const getLapMarkerPosition = (lapIndex: number) => {
    // Calculate cumulative progress up to this lap
    const totalMinutes = laps.reduce((sum, lap) => sum + lap.allocatedMinutes, 0);
    let cumulativeMinutes = 0;
    for (let i = 0; i < lapIndex; i++) {
      cumulativeMinutes += laps[i].allocatedMinutes;
    }
    const progress = cumulativeMinutes / totalMinutes;

    // Convert progress to angle (start from left, go clockwise)
    const angle = Math.PI + progress * 2 * Math.PI;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    return { x, y, angle };
  };

  // Runner position
  const runnerAngle = Math.PI + totalProgress * 2 * Math.PI;
  const runnerX = cx + (rx - 15) * Math.cos(runnerAngle);
  const runnerY = cy + (ry - 15) * Math.sin(runnerAngle);

  // Determine track colors
  const completedColor = '#d4af37'; // gold
  const activeColor = isOvertime ? '#ef4444' : '#d4af37'; // red if overtime, gold otherwise
  const bgColor = 'rgba(74, 103, 65, 0.3)'; // laurel with opacity

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-md mx-auto"
        style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))' }}
      >
        {/* Background gradient */}
        <defs>
          <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(45, 74, 40, 0.2)" />
            <stop offset="100%" stopColor="rgba(26, 46, 25, 0.4)" />
          </linearGradient>

          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c9a227" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#efd050" />
          </linearGradient>

          <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>

          {/* Glow filter for active track */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Stadium field (grass) */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx - 20}
          ry={ry - 20}
          fill="url(#trackGradient)"
          className="opacity-50"
        />

        {/* Background track */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke={bgColor}
          strokeWidth="16"
        />

        {/* Progress track - completed laps + current progress */}
        <motion.ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke={isOvertime ? 'url(#redGradient)' : 'url(#goldGradient)'}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={perimeter}
          initial={{ strokeDashoffset: perimeter }}
          animate={{ strokeDashoffset: perimeter * (1 - totalProgress) }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          transform={`rotate(180 ${cx} ${cy})`}
          filter={isOvertime ? undefined : 'url(#glow)'}
        />

        {/* Lap markers */}
        {laps.map((lap, index) => {
          if (index === 0) return null; // Skip first marker (start)
          const pos = getLapMarkerPosition(index);
          const isCompleted = index <= currentLapIndex;
          const isCurrent = index === currentLapIndex;

          return (
            <g key={lap.id}>
              {/* Marker line */}
              <line
                x1={pos.x + 10 * Math.cos(pos.angle)}
                y1={pos.y + 10 * Math.sin(pos.angle)}
                x2={pos.x - 10 * Math.cos(pos.angle)}
                y2={pos.y - 10 * Math.sin(pos.angle)}
                stroke={isCompleted ? completedColor : 'rgba(255,255,255,0.3)'}
                strokeWidth="2"
              />
              {/* Lap number */}
              <text
                x={pos.x + 25 * Math.cos(pos.angle)}
                y={pos.y + 25 * Math.sin(pos.angle)}
                fill={isCompleted ? completedColor : 'rgba(255,255,255,0.5)'}
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {index}
              </text>
            </g>
          );
        })}

        {/* Start/Finish line */}
        <line
          x1={cx - rx}
          y1={cy - 12}
          x2={cx - rx}
          y2={cy + 12}
          stroke="white"
          strokeWidth="3"
          strokeDasharray="4 2"
        />
        <text
          x={cx - rx - 5}
          y={cy}
          fill="white"
          fontSize="8"
          textAnchor="end"
          dominantBaseline="middle"
          fontWeight="bold"
        >
          START
        </text>

        {/* Runner icon */}
        <motion.g
          initial={false}
          animate={{ x: runnerX - 12, y: runnerY - 12 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <circle
            cx={12}
            cy={12}
            r={14}
            fill={isOvertime ? '#dc2626' : '#d4af37'}
            className={cn(isOvertime && 'animate-pulse')}
          />
          <text
            x={12}
            y={14}
            fontSize="16"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            🏃
          </text>
        </motion.g>

        {/* Center display - Current lap info */}
        <g>
          <text
            x={cx}
            y={cy - 20}
            fill="white"
            fontSize="12"
            textAnchor="middle"
            fontWeight="bold"
            className="uppercase tracking-wider"
          >
            Lap {currentLapIndex + 1} of {laps.length}
          </text>
          <text
            x={cx}
            y={cy + 5}
            fill={isOvertime ? '#f87171' : '#d4af37'}
            fontSize="11"
            textAnchor="middle"
            className="font-medium"
          >
            {laps[currentLapIndex]?.title || ''}
          </text>
          <text
            x={cx}
            y={cy + 25}
            fill={isOvertime ? '#f87171' : 'rgba(255,255,255,0.6)'}
            fontSize="10"
            textAnchor="middle"
          >
            {isOvertime ? 'OVERTIME!' : `${laps[currentLapIndex]?.allocatedMinutes}m allocated`}
          </text>
        </g>
      </svg>

      {/* Lap progress bar below track */}
      <div className="mt-4 px-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Lap Progress</span>
          <span>{Math.round(lapProgress * 100)}%</span>
        </div>
        <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
          <motion.div
            className={cn(
              'h-full rounded-full',
              isOvertime ? 'bg-red-500' : 'bg-gradient-to-r from-gold-500 to-gold-400'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(lapProgress * 100, 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}
