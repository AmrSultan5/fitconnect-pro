import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Scale, Dumbbell, Percent } from 'lucide-react';
import { format } from 'date-fns';
import type { InBodyRecord, InBodyInsights } from '@/hooks/useInBodyRecords';


interface InBodyMiniChartProps {
  records: InBodyRecord[];
  insights: InBodyInsights;
}

function InsightPill({ 
  icon: Icon, 
  value, 
  unit, 
  label, 
  inverse = false 
}: { 
  icon: any; 
  value: number | null; 
  unit: string; 
  label: string;
  inverse?: boolean;
}) {
  if (value === null) return null;
  
  const isPositive = inverse ? value < 0 : value > 0;
  const isNegative = inverse ? value > 0 : value < 0;
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold flex items-center gap-1 ${isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted-foreground'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : isNegative ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        {value > 0 ? '+' : ''}{value}{unit}
      </span>
    </div>
  );
}

function MiniTooltip({ active, payload, metric }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  
  return (
    <div className="rounded-lg bg-background/95 backdrop-blur-sm border border-border/50 shadow-lg p-2 text-xs">
      <p className="text-muted-foreground mb-1">{data.fullDate}</p>
      <div className="space-y-0.5">
      <p className="font-medium">
        {metric === 'weight' && `${data.weight} kg`}
        {metric === 'muscle' && `${data.muscle} kg`}
        {metric === 'fat' && `${data.fat}%`}
      </p>
      </div>
    </div>
  );
}

export function InBodyMiniChart({ records, insights }: InBodyMiniChartProps) {
  const [metric, setMetric] = useState<'weight' | 'muscle' | 'fat'>('weight');
  const chartData = useMemo(() => {
    // Take last 10 records for mini chart
    const recentRecords = records.slice(-10);
    return recentRecords.map((record) => ({
      date: format(new Date(record.date), 'MMM d'),
      fullDate: format(new Date(record.date), 'MMM d, yyyy'),
      weight: record.weight_kg,
      muscle: record.skeletal_muscle_kg,
      fat: record.body_fat_percentage,
    }));
  }, [records]);

  if (records.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No body composition data yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { key: 'weight', label: 'Weight (kg)' },
          { key: 'muscle', label: 'Muscle (kg)' },
          { key: 'fat', label: 'Body Fat (%)' },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key as any)}
            className={`
              text-xs px-3 py-1 rounded-full transition
              ${metric === m.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-primary/10'}
            `}
          >
            {m.label}
          </button>
        ))}
      </div>
      {/* Body Composition Trend */}
      <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
          />

        <Tooltip content={<MiniTooltip metric={metric} />} />

          <Area
            type="monotone"
            dataKey={metric}
            stroke="hsl(var(--primary))"
            fill="url(#metricGradient)"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>

      {/* Monthly Insights */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <p className="text-xs text-muted-foreground font-medium">This Month</p>
        <div className="space-y-1.5">
          <InsightPill icon={Scale} value={insights.weightChange} unit=" kg" label="Weight" inverse />
          <InsightPill icon={Dumbbell} value={insights.muscleChange} unit=" kg" label="Muscle" />
          <InsightPill icon={Percent} value={insights.fatChange} unit="%" label="Body fat" inverse />
        </div>
      </div>
    </div>
  );
}
