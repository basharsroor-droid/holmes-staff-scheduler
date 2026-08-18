"use client";

import { useEffect, useMemo, useState } from "react";

import { EmployeeChip } from "@/components/schedule/employee-chip";
import { SwapStatusBadge, WarningBadge } from "@/components/schedule/badges";
import { validateSchedule } from "@/lib/shift-validation";
import type {
  Availability,
  Employee,
  ScheduledShift,
  ShiftTemplate,
  SwapRequest
} from "@/types/scheduler";

export function SwapRequestsClient({
  initialRequests,
  employees,
  schedule,
  templates,
  availability,
  currentEmployeeId
}: {
  initialRequests: SwapRequest[];
  employees: Employee[];
  schedule: ScheduledShift[];
  templates: ShiftTemplate[];
  availability: Availability[];
  currentEmployeeId: string;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [reason, setReason] = useState("");
  const [originalShiftId, setOriginalShiftId] = useState(schedule[0]?.id ?? "");
  const [targetEmployeeId, setTargetEmployeeId] = useState(employees[1]?.id ?? "");
  const [activeUserRole, setActiveUserRole] = useState<"employee" | "manager" | "admin">(
    "employee"
  );
  const warnings = useMemo(
    () => validateSchedule(schedule, employees, availability, templates),
    [availability, employees, schedule, templates]
  );
  const staffEmployees = employees.filter((employee) => employee.role === "employee");
  const isManagerView = activeUserRole !== "employee";

  useEffect(() => {
    const storedUser = window.localStorage.getItem("scheduler-demo-user");
    const employee = employees.find((item) => item.id === storedUser);
    if (employee) setActiveUserRole(employee.role);
  }, [employees]);

  function createRequest() {
    setRequests((current) => [
      {
        id: `swap-${current.length + 1}`,
        requestedByEmployeeId: currentEmployeeId,
        originalShiftId,
        targetEmployeeId,
        status: "pending_manager",
        reason: reason || "בקשת החלפה",
        managerNote: ""
      },
      ...current
    ]);
    setReason("");
  }

  function updateStatus(id: string, status: "approved" | "rejected") {
    setRequests((current) =>
      current.map((request) =>
        request.id === id
          ? {
              ...request,
              status,
              managerNote:
                status === "approved"
                  ? "אושר לאחר בדיקת חוקים"
                  : "נדחה על ידי מנהל"
            }
          : request
      )
    );
  }

  return (
    <div className="split">
      {!isManagerView ? (
        <section className="card">
          <h2>יצירת בקשת החלפה</h2>
          <div className="grid">
            <div className="field">
              <label htmlFor="swap-original-shift">המשמרת שלי</label>
              <select
                id="swap-original-shift"
                className="select"
                value={originalShiftId}
                onChange={(event) => setOriginalShiftId(event.target.value)}
              >
                {schedule
                  .filter((shift) => shift.employeeIds.includes(currentEmployeeId))
                  .map((shift) => {
                    const template = templates.find(
                      (item) => item.id === shift.shiftTemplateId
                    );
                    return (
                      <option key={shift.id} value={shift.id}>
                        {shift.date} · {template?.name}
                      </option>
                    );
                  })}
              </select>
            </div>
            <div className="field">
              <label htmlFor="swap-target-employee">עובד יעד</label>
              <select
                id="swap-target-employee"
                className="select"
                value={targetEmployeeId}
                onChange={(event) => setTargetEmployeeId(event.target.value)}
              >
                {staffEmployees
                  .filter((employee) => employee.id !== currentEmployeeId)
                  .map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="swap-reason">סיבה</label>
              <textarea
                id="swap-reason"
                className="textarea"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="למה נדרשת ההחלפה?"
              />
            </div>
            <button className="button primary" onClick={createRequest}>
              שליחת בקשה
            </button>
          </div>
        </section>
      ) : null}

      <section className="card">
        <h2>{isManagerView ? "בקשות החלפה לאישור" : "בקשות קיימות"}</h2>
        <div className="warning-list">
          {requests.map((request) => {
            const requester = employees.find(
              (employee) => employee.id === request.requestedByEmployeeId
            );
            const target = employees.find(
              (employee) => employee.id === request.targetEmployeeId
            );
            const shiftWarnings = warnings.filter(
              (warning) => warning.shiftId === request.originalShiftId
            );

            return (
              <article className="warning-row" key={request.id}>
                <div className="shift-title">
                  <span>{request.reason}</span>
                  <SwapStatusBadge status={request.status} />
                </div>
                <div className="employee-list" style={{ marginTop: 8 }}>
                  {requester ? <EmployeeChip employee={requester} /> : null}
                  {target ? <EmployeeChip employee={target} /> : null}
                </div>
                {shiftWarnings.length ? (
                  <div className="warning-list" style={{ marginTop: 10 }}>
                    {shiftWarnings.slice(0, 2).map((warning, index) => (
                      <div className="warning-row" key={`${warning.message}-${index}`}>
                        <WarningBadge severity={warning.severity} /> אישור עלול להשאיר בעיה:{" "}
                        {warning.message}
                      </div>
                    ))}
                  </div>
                ) : null}
                {request.status === "pending_manager" ? (
                  <div className="actions" style={{ marginTop: 10 }}>
                    <button className="button primary" onClick={() => updateStatus(request.id, "approved")}>
                      אישור
                    </button>
                    <button className="button danger" onClick={() => updateStatus(request.id, "rejected")}>
                      דחייה
                    </button>
                  </div>
                ) : null}
                {request.managerNote ? (
                  <div className="metric-label" style={{ marginTop: 8 }}>
                    הערת מנהל: {request.managerNote}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
