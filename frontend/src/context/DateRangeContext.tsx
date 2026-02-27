import React, { createContext, useContext, useState } from 'react';
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subYears } from 'date-fns';

export type DateRangePreset = 'this_month' | 'this_quarter' | 'ytd' | 'this_year' | 'last_year' | 'custom';

export interface DateRange {
  startDate: string; // ISO YYYY-MM-DD
  endDate: string;
  preset: DateRangePreset;
}

interface DateRangeContextValue {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  setPreset: (preset: DateRangePreset) => void;
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

function presetToRange(preset: DateRangePreset): DateRange {
  const now = new Date();
  switch (preset) {
    case 'this_month':
      return {
        startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
        preset,
      };
    case 'this_quarter':
      return {
        startDate: format(startOfQuarter(now), 'yyyy-MM-dd'),
        endDate: format(endOfQuarter(now), 'yyyy-MM-dd'),
        preset,
      };
    case 'ytd':
      return {
        startDate: format(startOfYear(now), 'yyyy-MM-dd'),
        endDate: format(now, 'yyyy-MM-dd'),
        preset,
      };
    case 'this_year':
      return {
        startDate: format(startOfYear(now), 'yyyy-MM-dd'),
        endDate: format(endOfYear(now), 'yyyy-MM-dd'),
        preset,
      };
    case 'last_year': {
      const lastYear = subYears(now, 1);
      return {
        startDate: format(startOfYear(lastYear), 'yyyy-MM-dd'),
        endDate: format(endOfYear(lastYear), 'yyyy-MM-dd'),
        preset,
      };
    }
    default:
      return {
        startDate: format(startOfYear(now), 'yyyy-MM-dd'),
        endDate: format(endOfYear(now), 'yyyy-MM-dd'),
        preset: 'this_year',
      };
  }
}

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange>(presetToRange('this_year'));

  const setPreset = (preset: DateRangePreset) => {
    if (preset !== 'custom') {
      setDateRange(presetToRange(preset));
    }
  };

  return (
    <DateRangeContext.Provider value={{ dateRange, setDateRange, setPreset }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error('useDateRange must be used within DateRangeProvider');
  return ctx;
}
