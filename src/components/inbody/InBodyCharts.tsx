import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Scale, Dumbbell, Percent } from 'lucide-react';
import { format } from 'date-fns';
import type { InBodyRecord, InBodyInsights } from '@/hooks/useInBodyRecords';

interface InBodyChartsProps {
  records: InBodyRecord[];
  insights: InBodyInsights;
}

function TrendIcon({ value }: { value: number | null }) {
  if (value === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
  if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function formatChange(value: number | null, unit: string, inverse = false): string {
  if (value === null) return 'No data';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}${unit}`;
}

// Custom tooltip component
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl bg-background/95 backdrop-blur-sm border border-border/50 shadow-lg p-3">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value} {entry.unit || ''}
        </p>
      ))}
    </div>
  );
}

// Body fat zone color helper
function getBodyFatZone(percentage: number): { color: string; label: string } {
  if (percentage < 15) return { color: 'hsl(var(--success))', label: 'Athletic' };
  if (percentage < 25) return { color: 'hsl(var(--primary))', label: 'Healthy' };
  if (percentage < 32) return { color: 'hsl(45 100% 50%)', label: 'Average' };
  return { color: 'hsl(var(--destructive))', label: 'High' };
}

export function InBodyCharts({ records, insights }: InBodyChartsProps) {
  const chartData = useMemo(() => {
    return records.map((record) => ({
      date: format(new Date(record.date), 'MMM d'),
      fullDate: format(new Date(record.date), 'MMM d, yyyy'),
      weight: record.weight_kg,
      muscle: record.skeletal_muscle_kg,
      fat: record.body_fat_percentage,
    }));
  }, [records]);

  if (records.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-muted/30 to-background border-border/50">
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No measurements yet</p>
            <p className="text-sm">Add your first InBody measurement to see your progress charts.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weight Chart */}
      <Card className="bg-gradient-to-br from-blue-500/5 to-background border-blue-500/20 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scale className="h-5 w-5 text-blue-500" />
              Weight Trend
            </CardTitle>
            <div className="flex items-center gap-2 text-sm">
              <TrendIcon value={insights.weightChange} />
              <span className={insights.weightChange && insights.weightChange < 0 ? 'text-green-500' : 'text-muted-foreground'}>
                {formatChange(insights.weightChange, ' kg')}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(210 100% 50%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(210 100% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis 
                  domain={['dataMin - 2', 'dataMax + 2']} 
                  className="text-xs" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${value}kg`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="weight"
                  name="Weight"
                  stroke="hsl(210 100% 50%)"
                  strokeWidth={3}
                  dot={{ fill: 'hsl(210 100% 50%)', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  unit=" kg"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Muscle Mass Chart */}
      <Card className="bg-gradient-to-br from-green-500/5 to-background border-green-500/20 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Dumbbell className="h-5 w-5 text-green-500" />
              Skeletal Muscle Mass
            </CardTitle>
            <div className="flex items-center gap-2 text-sm">
              <TrendIcon value={insights.muscleChange} />
              <span className={insights.muscleChange && insights.muscleChange > 0 ? 'text-green-500' : 'text-muted-foreground'}>
                {formatChange(insights.muscleChange, ' kg')}
              </span>
            </div>
          </div>
          {insights.muscleChange !== null && insights.periodDays > 0 && (
            <p className="text-sm text-muted-foreground">
              {insights.muscleChange > 0 
                ? `Muscle mass increased by ${insights.muscleChange} kg in ${insights.periodDays} days`
                : insights.muscleChange < 0
                ? `Muscle mass decreased by ${Math.abs(insights.muscleChange)} kg in ${insights.periodDays} days`
                : 'Muscle mass stable'}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="muscleGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142 76% 36%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(142 76% 36%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis 
                  domain={['dataMin - 1', 'dataMax + 1']} 
                  className="text-xs" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${value}kg`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="muscle"
                  name="Muscle Mass"
                  stroke="hsl(142 76% 36%)"
                  strokeWidth={3}
                  fill="url(#muscleGradient)"
                  dot={{ fill: 'hsl(142 76% 36%)', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  unit=" kg"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Body Fat Chart */}
      <Card className="bg-gradient-to-br from-orange-500/5 to-background border-orange-500/20 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Percent className="h-5 w-5 text-orange-500" />
              Body Fat Percentage
            </CardTitle>
            <div className="flex items-center gap-2 text-sm">
              <TrendIcon value={insights.fatChange ? -insights.fatChange : null} />
              <span className={insights.fatChange && insights.fatChange < 0 ? 'text-green-500' : 'text-muted-foreground'}>
                {formatChange(insights.fatChange, '%')}
              </span>
            </div>
          </div>
          {insights.fatChange !== null && (
            <p className="text-sm text-muted-foreground">
              {insights.fatChange < 0 
                ? `Body fat decreased by ${Math.abs(insights.fatChange)}%`
                : insights.fatChange > 0
                ? `Body fat increased by ${insights.fatChange}%`
                : 'Body fat stable'}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="fatGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(25 95% 53%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(25 95% 53%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis 
                  domain={[0, 50]} 
                  className="text-xs" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                {/* Zone reference lines */}
                <ReferenceLine y={15} stroke="hsl(142 76% 36%)" strokeDasharray="5 5" strokeOpacity={0.5} />
                <ReferenceLine y={25} stroke="hsl(45 100% 50%)" strokeDasharray="5 5" strokeOpacity={0.5} />
                <ReferenceLine y={32} stroke="hsl(0 84% 60%)" strokeDasharray="5 5" strokeOpacity={0.5} />
                <Area
                  type="monotone"
                  dataKey="fat"
                  name="Body Fat"
                  stroke="hsl(25 95% 53%)"
                  strokeWidth={3}
                  fill="url(#fatGradient)"
                  dot={{ fill: 'hsl(25 95% 53%)', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  unit="%"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Zone Legend */}
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground justify-center">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500"></span> Athletic (&lt;15%)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-yellow-500"></span> Healthy (15-25%)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-500"></span> Average (25-32%)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500"></span> High (&gt;32%)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
