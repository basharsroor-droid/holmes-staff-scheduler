"use client";

import { useState } from "react";

import { ShiftTypeBadge } from "@/components/schedule/badges";
import { shiftTypeLabels } from "@/lib/scheduler-labels";
import type { ShiftTemplate, ShiftType } from "@/types/scheduler";

const shiftTypes: ShiftType[] = ["opening", "middle", "middle_2", "closing"];

export function ShiftTemplatesClient({
  initialTemplates
}: {
  initialTemplates: ShiftTemplate[];
}) {
  const [templates, setTemplates] = useState(initialTemplates);

  function updateTemplate(id: string, patch: Partial<ShiftTemplate>) {
    setTemplates((current) =>
      current.map((template) =>
        template.id === id ? { ...template, ...patch } : template
      )
    );
  }

  return (
    <section className="card">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h2>תבניות משמרת</h2>
          <p className="lead">שעות, סוג משמרת, כמות עובדים נדרשת והאם חובה עובד ותיק.</p>
        </div>
        <button
          className="button primary"
          onClick={() =>
            setTemplates((current) => [
              ...current,
              {
                id: `template-${current.length + 1}`,
                name: "תבנית חדשה",
                startTime: "10:00",
                endTime: "14:00",
                type: "middle",
                requiredEmployees: 1,
                requiresSeniorEmployee: false
              }
            ])
          }
        >
          הוספת תבנית
        </button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>שם</th>
              <th>סוג</th>
              <th>התחלה</th>
              <th>סיום</th>
              <th>עובדים</th>
              <th>חובה ותיק</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <tr key={template.id}>
                <td>
                  <input
                    className="input"
                    aria-label="שם סוג המשמרת"
                    value={template.name}
                    onChange={(event) =>
                      updateTemplate(template.id, { name: event.target.value })
                    }
                  />
                </td>
                <td>
                  <div className="grid">
                    <ShiftTypeBadge type={template.type} />
                    <select
                      className="select"
                      aria-label={`סוג — ${template.name}`}
                      value={template.type}
                      onChange={(event) =>
                        updateTemplate(template.id, {
                          type: event.target.value as ShiftType
                        })
                      }
                    >
                      {shiftTypes.map((type) => (
                        <option key={type} value={type}>
                          {shiftTypeLabels[type]}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td>
                  <input
                    className="input"
                    type="time"
                    aria-label={`שעת התחלה — ${template.name}`}
                    value={template.startTime}
                    onChange={(event) =>
                      updateTemplate(template.id, { startTime: event.target.value })
                    }
                  />
                </td>
                <td>
                  <input
                    className="input"
                    type="time"
                    aria-label={`שעת סיום — ${template.name}`}
                    value={template.endTime}
                    onChange={(event) =>
                      updateTemplate(template.id, { endTime: event.target.value })
                    }
                  />
                </td>
                <td>
                  <input
                    className="input"
                    min={1}
                    type="number"
                    aria-label={`מספר עובדים נדרש — ${template.name}`}
                    value={template.requiredEmployees}
                    onChange={(event) =>
                      updateTemplate(template.id, {
                        requiredEmployees: Number(event.target.value)
                      })
                    }
                  />
                </td>
                <td>
                  <input
                    checked={template.requiresSeniorEmployee}
                    type="checkbox"
                    aria-label={`חובה ותיק — ${template.name}`}
                    onChange={(event) =>
                      updateTemplate(template.id, {
                        requiresSeniorEmployee: event.target.checked
                      })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
