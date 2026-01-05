import { useMemo } from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
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

function MiniTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  
  return (
    <div className="rounded-lg bg-background/95 backdrop-blur-sm border border-border/50 shadow-lg p-2 text-xs">
      <p className="text-muted-foreground mb-1">{data.fullDate}</p>
      <div className="space-y-0.5">
        <p><span className="text-blue-500">●</span> {data.weight} kg</p>
        <p><span className="text-green-500">●</span> {data.muscle} kg</p>
        <p><span className="text-orange-500">●</span> {data.fat}%</p>
      </div>
    </div>
  );
}

export function InBodyMiniChart({ records, insights }: InBodyMiniChartProps) {
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
      {/* Mini Combined Chart */}
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <Tooltip content={<MiniTooltip />} />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="hsl(210 100% 50%)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="muscle"
              stroke="hsl(142 76% 36%)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="fat"
              stroke="hsl(25 95% 53%)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend */}
      <div className="flex justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Weight</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Muscle</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Fat %</span>
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
