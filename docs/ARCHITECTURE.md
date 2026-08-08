# ארכיטקטורה — ShiftPilot

מסמך זה מתאר את המבנה הטכני של המערכת, למי שממשיך לפתח או צריך להבין אותה מהר. הוא לא מחליף קריאת קוד — הוא מפה שתחסוך את הסיבוב הראשון.

## תמונה כללית

```
דפדפן (משתמש)
   │
   ▼
Next.js 14 App Router — Vercel (Edge + Serverless)
   │  middleware.ts מגן על /workspace/*
   │  Server Components קוראים ישירות ל-Supabase (service/anon לפי הקשר)
   │
   ▼
Supabase
   ├─ Auth (auth.users) — הרשמה, אימות מייל, סשן
   ├─ Postgres (public schema) — 15 טבלאות, RLS על כולן
   └─ RPC functions (SECURITY DEFINER) — כל פעולה עם לוגיקה עסקית/הרשאות
```

שתי סביבות רצות על אותו קוד:
- **הפרודקשן האמיתי** (`/onboarding`, `/login`, `/workspace/*`) — מחובר ל-Supabase האמיתי, נתוני SaaS אמיתיים.
- **`/demo`** — נתוני הדגמה נפרדים לגמרי, לא נוגע בטבלאות ה-SaaS האמיתיות. מיועד להצגות ללא סיכון לנתונים אמיתיים.

## Stack

| שכבה | טכנולוגיה |
|---|---|
| Frontend/Backend | Next.js 14 (App Router), React 18, TypeScript |
| עיצוב | Tailwind CSS, Radix UI, lucide-react |
| ולידציה | Zod |
| מסד נתונים | Supabase (Postgres 17), Row Level Security |
| Auth | Supabase Auth |
| Hosting | Vercel — Production מ-`main`, Preview לכל PR |
| CI | GitHub Actions (`ShiftPilot CI`) — `npm run validate:schema` + `npm run build` על כל PR/push ל-main |

## מודל הנתונים (multi-tenant)

כל טבלה בליבת המוצר נושאת `organization_id` ומוגנת ב-RLS כך שכל שאילתה מסוננת אוטומטית לפי החברות הפעילה של המשתמש המחובר. סכימת המקור: [`db/supabase-scheduler-schema.sql`](../db/supabase-scheduler-schema.sql). שינויים על הסכימה נשמרים כ-migrations רשמיות תחת [`supabase/migrations/`](../supabase/migrations/) — **אין לערוך את מסד הפרודקשן ידנית מחוץ למיגרציה**.

היררכיה: `organizations` → `branches` → (`shift_templates`, `schedule_periods`) → `shifts` → `shift_assignments` → `swap_requests`.

תפקידים (`organization_memberships.role`): `owner` / `admin` / `manager` / `employee`.
סטטוס עובד: `invited` / `active` / `suspended` (השעיה לא מוחקת היסטוריה).

## למה לוגיקה עסקית קריטית יושבת ב-RPC ולא ב-API route

פעולות שמשנות מצב משותף בין כמה משתמשים (פרסום סידור, אישור החלפת משמרת, קבלת הזמנה) ממומשות כפונקציות `SECURITY DEFINER` ב-Postgres, לא בקוד ה-Next.js. הסיבה:

1. **נעילת שורה (`for update`)** מונעת race condition כשמישהו לוחץ פעמיים או ששני מנהלים פועלים במקביל.
2. **בדיקת ההרשאה תמיד מול ה-`organization_id` של הרשומה עצמה**, לא מול פרמטר שהקורא שלח — זה מה שמונע ממנהל של עסק אחד לגעת בנתונים של עסק אחר גם אם ה-API "התבלבל".
3. `search_path` נעול (`set search_path = ''`) בכל פונקציה כזו, כדי למנוע התקפת שרשור סכימה.

רשימת הפונקציות הרגישות: `accept_organization_invitation`, `approve_shift_swap`, `create_organization_invitation`, `create_organization_workspace`, `mark_my_notifications_read`, `publish_schedule_period`. אלו עברו סקירה ידנית ב-8.8.2026 — ראו היסטוריית ה-PR-ים לפרטים.

## Auth ו-`middleware.ts`

`middleware.ts` הוא קו ההגנה הראשון על `/workspace/*` — הוא בודק סשן Supabase ומפנה משתמש לא מחובר ל-`/login`. **חשוב:** הגנה זו לבדה לא מספיקה — RLS ב-Postgres היא קו ההגנה האמיתי והבלתי-ניתן-לעקיפה, כי גם אם ה-middleware ייעקף (למשל דרך קריאה ישירה ל-API), Postgres עדיין יחסום גישה חוצת-ארגון. זה הטעם שבגללו התיקון ל-CVE-2025-29927 (עקיפת middleware) הוגדר קריטי אך לא קטסטרופלי: השכבה השנייה (RLS) עדיין עמדה.

## Deploy Pipeline

1. עבודה בענף `agent/*` או `fix/*`.
2. PR נפתח → CI (`Validate schema and build`) + Vercel Preview רצים אוטומטית.
3. `main` מוגן: חובת PR + חובת CI ירוק לפני מיזוג (הוגדר 8.8.2026).
4. מיזוג ל-`main` → Deploy אוטומטי ל-Production ב-Vercel.

## סביבות ומשתני סביבה

ראו `.env.example`. שלושה משתנים:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — ציבוריים, מותר בצד לקוח.
- `SUPABASE_SECRET_KEY` — **שרת בלבד**. אסור קידומת `NEXT_PUBLIC_`, אסור להדפיס ללוג, אסור לחשוף לדפדפן.
