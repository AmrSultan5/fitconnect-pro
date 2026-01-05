import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { InBodyForm } from '@/components/inbody/InBodyForm';
import { InBodyCharts } from '@/components/inbody/InBodyCharts';
import { useInBodyRecords } from '@/hooks/useInBodyRecords';
import { Skeleton } from '@/components/ui/skeleton';
import { Scale } from 'lucide-react';
import { useMemo } from "react";

export default function InBody() {
  const { records, isLoading, isSaving, saveRecord, getInsights } = useInBodyRecords();
  const insights = useMemo(() => getInsights(), [records]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            InBody Tracker
          </h1>
          <p className="text-muted-foreground">
            Track your body composition over time
          </p>
        </div>

        {/* Entry Form */}
        <InBodyForm onSave={saveRecord} isSaving={isSaving} />

        {/* Charts Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Progress</h2>

          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-80 w-full rounded-xl" />
              <Skeleton className="h-80 w-full rounded-xl" />
              <Skeleton className="h-80 w-full rounded-xl" />
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="text-lg font-medium">No InBody data yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first measurement to see progress and insights.
              </p>
            </div>
          ) : (
            <InBodyCharts records={records} insights={insights} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
