import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface InBodyRecord {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
  skeletal_muscle_kg: number;
  body_fat_percentage: number;
  created_at: string;
}

export interface InBodyInsert {
  date: string;
  weight_kg: number;
  skeletal_muscle_kg: number;
  body_fat_percentage: number;
}

export interface InBodyInsights {
  weightChange: number | null;
  muscleChange: number | null;
  fatChange: number | null;
  periodDays: number;
}

export function useInBodyRecords() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<InBodyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchRecords = useCallback(async () => {
    if (!user) {
      setRecords([]);
      setIsLoading(false);
      return;
    }    
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('inbody_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching InBody records:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load InBody records.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const saveRecord = useCallback(async (record: InBodyInsert): Promise<boolean> => {
    if (!user) return false;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('inbody_records')
        .upsert(
          {
            user_id: user.id,
            ...record,
          },
          { onConflict: 'user_id,date' }
        );

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'InBody measurement saved successfully.',
      });
      
      await fetchRecords();
      return true;
    } catch (error) {
      console.error('Error saving InBody record:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save measurement.',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user, toast, fetchRecords]);

  const getInsights = useCallback((): InBodyInsights => {
    if (records.length < 2) {
      return { weightChange: null, muscleChange: null, fatChange: null, periodDays: 0 };
    }

    const latest = records[records.length - 1];
    const oldest = records[0];
    const periodDays = Math.ceil(
      (new Date(latest.date).getTime() - new Date(oldest.date).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      weightChange: Number((latest.weight_kg - oldest.weight_kg).toFixed(1)),
      muscleChange: Number((latest.skeletal_muscle_kg - oldest.skeletal_muscle_kg).toFixed(1)),
      fatChange: Number((latest.body_fat_percentage - oldest.body_fat_percentage).toFixed(1)),
      periodDays,
    };
  }, [records]);

  const getMonthlyInsights = useCallback((): InBodyInsights => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const monthRecords = records.filter(r => new Date(r.date) >= thirtyDaysAgo);
    
    if (monthRecords.length < 2) {
      return { weightChange: null, muscleChange: null, fatChange: null, periodDays: 30 };
    }

    const latest = monthRecords[monthRecords.length - 1];
    const oldest = monthRecords[0];

    return {
      weightChange: Number((latest.weight_kg - oldest.weight_kg).toFixed(1)),
      muscleChange: Number((latest.skeletal_muscle_kg - oldest.skeletal_muscle_kg).toFixed(1)),
      fatChange: Number((latest.body_fat_percentage - oldest.body_fat_percentage).toFixed(1)),
      periodDays: 30,
    };
  }, [records]);

  useEffect(() => {
    if (user) {
      fetchRecords();
    }
  }, [user, fetchRecords]);  

  return {
    records,
    isLoading,
    isSaving,
    saveRecord,
    fetchRecords,
    getInsights,
    getMonthlyInsights,
  };
}
