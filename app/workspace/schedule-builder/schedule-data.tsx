"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

// B3 (docs/REMEDIATION_PLAN.md): one copy of the schedule data for the whole
// builder screen. The server loads the selected month plus every organization
// shift within a week of it (page.tsx); the board and every intelligence panel
// read the same rows from here. Before this, each panel re-fetched shifts and
// assignments on mount and watched the board's DOM to notice changes. Now a
// manager's click on the board updates this state, and the panels recompute
// from it directly.

export type ScheduleShift = {
  id: string;
  schedule_period_id: string;
  shift_template_id: string | null;
  shift_date: string;
  name: string;
  start_time: string;
  end_time: string;
  required_employees: number;
  status: string;
};
export type ScheduleAssignment = { id: string; shift_id: string; user_id: string };

type ScheduleData = {
  selectedPeriodId: string;
  shifts: ScheduleShift[];
  setShifts: Dispatch<SetStateAction<ScheduleShift[]>>;
  assignments: ScheduleAssignment[];
  setAssignments: Dispatch<SetStateAction<ScheduleAssignment[]>>;
};

const ScheduleDataContext = createContext<ScheduleData | null>(null);

export function ScheduleDataProvider({
  selectedPeriodId,
  initialShifts,
  initialAssignments,
  children
}: {
  selectedPeriodId: string;
  initialShifts: ScheduleShift[];
  initialAssignments: ScheduleAssignment[];
  children: ReactNode;
}) {
  const [shifts, setShifts] = useState(initialShifts);
  const [assignments, setAssignments] = useState(initialAssignments);

  // router.refresh() (after a panel writes) re-renders the server page with
  // fresh rows. Take them -- React's "adjust state when a prop changes"
  // pattern, compared during render rather than in an effect.
  const [source, setSource] = useState({ shifts: initialShifts, assignments: initialAssignments });
  if (source.shifts !== initialShifts || source.assignments !== initialAssignments) {
    setSource({ shifts: initialShifts, assignments: initialAssignments });
    setShifts(initialShifts);
    setAssignments(initialAssignments);
  }

  return (
    <ScheduleDataContext.Provider value={{ selectedPeriodId, shifts, setShifts, assignments, setAssignments }}>
      {children}
    </ScheduleDataContext.Provider>
  );
}

export function useScheduleData(): ScheduleData {
  const data = useContext(ScheduleDataContext);
  if (!data) throw new Error("useScheduleData must be used inside <ScheduleDataProvider>");
  return data;
}
