"use client";

import { useEffect, useState } from "react";
import { KeyRound, Mail, UserPlus } from "lucide-react";

import { SeniorityBadge } from "@/components/schedule/badges";
import type { AuthUser } from "@/lib/auth-config";
import {
  defaultBranchId,
  defaultOrganizationId,
  organizationDisplayName,
  organizations
} from "@/lib/app-config";
import { LOCAL_USERS_KEY } from "@/lib/local-storage-keys";
import { seniorityLabels } from "@/lib/scheduler-labels";
import type { Employee, SeniorityLevel } from "@/types/scheduler";

type StoredUser = AuthUser & { password: string };

type NewUserForm = {
  firstName: string;
  lastName: string;
  nationalId: string;
  email: string;
  password: string;
  role: "employee" | "manager";
  organizationId: string;
  branchId: string;
};

const emptyUserForm: NewUserForm = {
  firstName: "",
  lastName: "",
  nationalId: "",
  email: "",
  password: "",
  role: "employee",
  organizationId: defaultOrganizationId,
  branchId: defaultBranchId
};

export function AdminEmployeesClient({ initialEmployees }: { initialEmployees: Employee[] }) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [authUsers, setAuthUsers] = useState<StoredUser[]>([]);
  const [newUser, setNewUser] = useState(emptyUserForm);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setAuthUsers(JSON.parse(window.localStorage.getItem(LOCAL_USERS_KEY) ?? "[]"));
  }, []);

  function updateEmployee(id: string, patch: Partial<Employee>) {
    setEmployees((current) =>
      current.map((employee) =>
        employee.id === id ? { ...employee, ...patch } : employee
      )
    );
  }

  function saveAuthUsers(nextUsers: StoredUser[]) {
    setAuthUsers(nextUsers);
    window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(nextUsers));
  }

  function createAuthUser() {
    setMessage("");
    if (
      !newUser.firstName.trim() ||
      !newUser.nationalId.trim() ||
      !newUser.email.trim() ||
      newUser.password.length < 6
    ) {
      setMessage("צריך למלא שם, ת.ז, מייל וסיסמה ראשונית של לפחות 6 תווים.");
      return;
    }

    const createdUser: StoredUser = {
      id: `emp-${newUser.nationalId}`,
      firstName: newUser.firstName.trim(),
      lastName: newUser.lastName.trim(),
      nationalId: newUser.nationalId.trim(),
      email: newUser.email.trim(),
      password: newUser.password,
      role: newUser.role,
      organizationId: newUser.organizationId,
      branchId: newUser.branchId,
      emailVerified: true,
      mustChangePassword: true
    };

    saveAuthUsers([
      ...authUsers.filter((user) => user.nationalId !== createdUser.nationalId),
      createdUser
    ]);
    setNewUser(emptyUserForm);
    setMessage("המשתמש נוצר. בכניסה הראשונה הוא יהיה חייב להחליף סיסמה.");
  }

  return (
    <div className="grid">
      <section className="card">
        <div className="page-header" style={{ marginBottom: 16 }}>
          <div>
            <h2>יצירת משתמש כניסה</h2>
            <p className="lead">
              מנהל/ת יוצרים לעובד ת.ז/שם משתמש וסיסמה ראשונית. העובד יחליף אותה
              בכניסה הראשונה.
            </p>
          </div>
          <span className="badge success">כניסה פרטית</span>
        </div>

        <div className="grid grid-3">
          <div className="field">
            <label>שם</label>
            <input
              className="input"
              value={newUser.firstName}
              onChange={(event) =>
                setNewUser((current) => ({ ...current, firstName: event.target.value }))
              }
            />
          </div>
          <div className="field">
            <label>משפחה</label>
            <input
              className="input"
              value={newUser.lastName}
              onChange={(event) =>
                setNewUser((current) => ({ ...current, lastName: event.target.value }))
              }
            />
          </div>
          <div className="field">
            <label>תפקיד</label>
            <select
              className="select"
              value={newUser.role}
              onChange={(event) =>
                setNewUser((current) => ({
                  ...current,
                  role: event.target.value as NewUserForm["role"]
                }))
              }
            >
              <option value="employee">עובד</option>
              <option value="manager">מנהל/ת</option>
            </select>
          </div>
          <div className="field">
            <label>עסק / סניף</label>
            <select
              className="select"
              value={`${newUser.organizationId}:${newUser.branchId}`}
              onChange={(event) => {
                const [organizationId, branchId] = event.target.value.split(":");
                setNewUser((current) => ({
                  ...current,
                  organizationId,
                  branchId
                }));
              }}
            >
              {organizations.map((organization) => (
                <option
                  key={`${organization.id}:${organization.branchId}`}
                  value={`${organization.id}:${organization.branchId}`}
                >
                  {organization.businessName} · {organization.branchName}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>ת.ז / שם משתמש</label>
            <input
              className="input"
              inputMode="numeric"
              value={newUser.nationalId}
              onChange={(event) =>
                setNewUser((current) => ({ ...current, nationalId: event.target.value }))
              }
            />
          </div>
          <div className="field">
            <label>מייל</label>
            <input
              className="input"
              type="email"
              value={newUser.email}
              onChange={(event) =>
                setNewUser((current) => ({ ...current, email: event.target.value }))
              }
            />
          </div>
          <div className="field">
            <label>סיסמה ראשונית</label>
            <input
              className="input"
              type="password"
              value={newUser.password}
              onChange={(event) =>
                setNewUser((current) => ({ ...current, password: event.target.value }))
              }
            />
          </div>
        </div>

        <div className="actions" style={{ marginTop: 16 }}>
          <button className="button primary" onClick={createAuthUser}>
            <UserPlus size={16} />
            יצירת משתמש
          </button>
          {message ? <span className="auth-message">{message}</span> : null}
        </div>

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table className="table compact-table">
            <thead>
              <tr>
                <th>שם</th>
                <th>ת.ז</th>
                <th>מייל</th>
                <th>עסק</th>
                <th>תפקיד</th>
                <th>סטטוס סיסמה</th>
              </tr>
            </thead>
            <tbody>
              {authUsers.length ? (
                authUsers.map((user) => (
                  <tr key={user.nationalId}>
                    <td>{`${user.firstName} ${user.lastName}`.trim()}</td>
                    <td>{user.nationalId}</td>
                    <td>{user.email}</td>
                    <td>{organizationDisplayName(user.organizationId)}</td>
                    <td>{user.role === "manager" ? "מנהל/ת" : "עובד"}</td>
                    <td>
                      <span className={user.mustChangePassword ? "badge warning" : "badge success"}>
                        {user.mustChangePassword ? "חייב החלפה" : "סיסמה אישית"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>עדיין לא נוצרו משתמשים מקומיים.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="page-header" style={{ marginBottom: 16 }}>
          <div>
            <h2>התראות מייל</h2>
            <p className="lead">
              זה התכנון שנחבר בשלב הבא לשירות מייל אמיתי. כרגע מוצג כמצב מערכת.
            </p>
          </div>
          <Mail size={22} color="var(--primary)" />
        </div>
        <div className="notification-grid">
          <div className="card-muted">
            <strong>22 לחודש</strong>
            <span>תזכורת להגיש משמרות לחודש הבא</span>
          </div>
          <div className="card-muted">
            <strong>28 לחודש</strong>
            <span>התראה שההגשה ננעלת</span>
          </div>
          <div className="card-muted">
            <strong>פרסום סידור</strong>
            <span>מייל לכל העובדים כשהסידור הסופי פורסם</span>
          </div>
          <div className="card-muted">
            <strong>שעה לפני משמרת</strong>
            <span>תזכורת אישית לעובד לפני תחילת המשמרת</span>
          </div>
        </div>
      </section>

      <section className="card">
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h2>רשימת עובדים</h2>
          <p className="lead">ניהול בסיסי של הרשאות פתיחה/סגירה, ותק וסטטוס פעיל.</p>
        </div>
        <button
          className="button primary"
          onClick={() =>
            setEmployees((current) => [
              ...current,
              {
                id: `emp-${current.length + 1}`,
                fullName: "עובד חדש",
                color: "#64748b",
                role: "employee",
                seniorityLevel: "new",
                canOpen: false,
                canClose: false,
                active: true
              }
            ])
          }
        >
          הוספת עובד
        </button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>שם</th>
              <th>ותק</th>
              <th>פתיחה</th>
              <th>סגירה</th>
              <th>פעיל</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <input
                    className="input"
                    value={employee.fullName}
                    onChange={(event) =>
                      updateEmployee(employee.id, { fullName: event.target.value })
                    }
                  />
                </td>
                <td>
                  <div className="grid">
                    <SeniorityBadge level={employee.seniorityLevel} />
                    <select
                      className="select"
                      value={employee.seniorityLevel}
                      onChange={(event) =>
                        updateEmployee(employee.id, {
                          seniorityLevel: event.target.value as SeniorityLevel
                        })
                      }
                    >
                      {Object.entries(seniorityLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td>
                  <input
                    checked={employee.canOpen}
                    type="checkbox"
                    onChange={(event) =>
                      updateEmployee(employee.id, { canOpen: event.target.checked })
                    }
                  />
                </td>
                <td>
                  <input
                    checked={employee.canClose}
                    type="checkbox"
                    onChange={(event) =>
                      updateEmployee(employee.id, { canClose: event.target.checked })
                    }
                  />
                </td>
                <td>
                  <input
                    checked={employee.active}
                    type="checkbox"
                    onChange={(event) =>
                      updateEmployee(employee.id, { active: event.target.checked })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card-muted" style={{ marginTop: 14 }}>
        <KeyRound size={16} />
        פרטי הכניסה עצמם מנוהלים למעלה. הרשימה הזו נשארת לניהול הרשאות עבודה,
        ותק וסטטוס פעיל.
      </div>
      </section>
    </div>
  );
}
