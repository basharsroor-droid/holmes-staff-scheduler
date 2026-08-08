# Runbook — תקלות ושחזור

מדריך פעולה מהיר למקרה שמשהו נשבר. ראו גם [ARCHITECTURE.md](./ARCHITECTURE.md) להבנת המבנה.

## Deploy גרוע ב-Production

**תסמין:** האתר שבור אחרי מיזוג ל-`main`.

1. Vercel Dashboard → Deployments → למצוא את הפריסה התקינה האחרונה (`isRollbackCandidate: true`) → **Promote to Production**. זו פעולה מיידית, לא דורשת קוד חדש.
2. במקביל, ב-GitHub: `git revert <commit>` על `main` דרך PR (branch protection מחייב את זה — אי אפשר לדחוף ישירות).
3. לבדוק את `Runtime Logs` ב-Vercel (`get_runtime_logs`) ואת `get_deployment_build_logs` כדי להבין מה נשבר לפני שמנסים שוב.

## שגיאות בפרודקשן (500 / RLS denies)

1. Supabase Dashboard → Logs → `postgres` / `api` — לחפש לפי טווח זמן.
2. אם זו שגיאת הרשאה (RLS), לבדוק קודם אם המשתמש חבר `active` בארגון הרלוונטי (`organization_memberships`), לא רק `invited`.
3. אם זו שגיאת RPC — כל הפונקציות הרגישות מתועדות ב-ARCHITECTURE.md, ואפשר למשוך את ההגדרה המלאה שלהן ישירות מ-`pg_proc` דרך Supabase כדי לבדוק לוגיקה בלי לחפש בקבצי המיגרציה.

## שינוי סכימה (DDL)

**לעולם לא ידני על פרודקשן.** כל שינוי סכימה:
1. קובץ חדש תחת `supabase/migrations/` בשם `YYYYMMDDHHMMSS_description.sql`.
2. הרצה מקומית/Preview לבדיקה.
3. PR רגיל → CI → מיזוג. ה-migration מוחל אוטומטית על הפרויקט המקושר.
4. `list_migrations` מול הפרויקט אחרי המיזוג כדי לוודא שהיא נרשמה.

## דליפת מפתח (Secret נחשף)

1. **מיד**: Supabase Dashboard → Settings → API → Roll/רענון ל-`service_role` key שנחשף.
2. עדכון `SUPABASE_SECRET_KEY` ב-Vercel (Production + Preview + Development) עם הערך החדש.
3. חיפוש בהיסטוריית Git אם המפתח נכנס ל-commit (`git log --all -p | grep <fragment>`), ואם כן — לשקול rewrite היסטוריה (מסובך, לתאם מראש).
4. לבדוק לוגים ב-Supabase לשימוש חריג באותו חלון זמן.

## חבילת npm עם חולשת אבטחה קריטית (Dependabot)

1. לבדוק אם התיקון קיים באותה שורת מז'ור (`npm view <package> versions`) — אם כן, patch ממוקד, לא קפיצת מז'ור.
2. `npm install <package>@<version>` → `npm run build` מקומית עם אותם env vars כמו ב-CI (ראו `.github/workflows/ci.yml`) → PR → CI ירוק → מיזוג.
3. Dependabot לפעמים מציע קפיצת מז'ור (לדוגמה Next 14→16) — **לא למזג אוטומטית**. לבדוק אם ה-Preview Deployment של ה-PR עצמו הצליח (`state: READY` ולא `ERROR`) לפני שבכלל שוקלים; קפיצת מז'ור דורשת בדיקה ידנית מלאה, לא רק CI ירוק.

## גישה חירום למסד הנתונים

Supabase Dashboard → SQL Editor, או `execute_sql` דרך ה-MCP tools אם עובדים מתוך סשן Claude. תמיד `select` לפני `update`/`delete` כדי לוודא scope.

## אנשי קשר / בעלות

Project owner: bashar.sroor@gmail.com — Supabase project `ShiftPilot` (`forstsmvakpsreffdiwb`), Vercel project `shiftpilot-demo`, GitHub `basharsroor-droid/holmes-staff-scheduler`.
