# ShiftPilot

[![ShiftPilot CI](https://github.com/basharsroor-droid/holmes-staff-scheduler/actions/workflows/ci.yml/badge.svg)](https://github.com/basharsroor-droid/holmes-staff-scheduler/actions/workflows/ci.yml)
[![Production Health](https://github.com/basharsroor-droid/holmes-staff-scheduler/actions/workflows/production-health.yml/badge.svg)](https://github.com/basharsroor-droid/holmes-staff-scheduler/actions/workflows/production-health.yml)
[![Authenticated Production E2E](https://github.com/basharsroor-droid/holmes-staff-scheduler/actions/workflows/production-authenticated-e2e.yml/badge.svg)](https://github.com/basharsroor-droid/holmes-staff-scheduler/actions/workflows/production-authenticated-e2e.yml)

ShiftPilot היא מערכת SaaS לניהול צוותים שעובדים במשמרות. עובדים מגישים זמינות חודשית, מנהלים בונים ומפרסמים סידור, והמערכת מרכזת החלפות, הרשאות והיסטוריה לפי עסק וסניף.

## כתובות

- אתר ו-Production: https://www.shiftpilothq.com
- כניסה למערכת: https://www.shiftpilothq.com/login
- פתיחת עסק: https://www.shiftpilothq.com/onboarding
- סביבת הדגמה נפרדת: https://www.shiftpilothq.com/demo

פרטי הכניסה לדמו אינם נשמרים בתיעוד הציבורי. יש למסור אותם באופן פרטי בלבד. סביבת הדמו מופרדת מנתוני ה-SaaS האמיתיים.

## יכולות קיימות

### חשבונות ועסקים

- הרשמה ואימות מייל באמצעות Supabase Auth
- שחזור סיסמה והגדרת סיסמה חדשה
- יצירת עסק וסניף ראשון
- SaaS רב-עסקי עם הפרדת נתונים
- תפקידים: owner, admin, manager, employee
- השעיית עובדים ללא מחיקת היסטוריה

### ניהול עבודה

- הגדרת סוגי משמרות, שעות ותקן נדרש
- דרישה לעובד בכיר
- יצירת חודשי עבודה וחלונות הגשה
- הגשת זמינות חודשית
- מעקב מנהל אחר הגשות
- בניית סידור חודשי
- פרסום סידור לעובדים
- מסך "המשמרות שלי"
- קישור Google Calendar
- בקשות החלפה ותהליך אישור מנהל

### מוצר ומיתוג

- אתר שיווקי ציבורי
- ממשק עברי RTL
- התאמת מובייל
- אנימציית פתיחה וגלילה
- סביבת Demo נפרדת להצגות

## ארכיטקטורה

- Next.js 16 + React 18 + TypeScript
- Supabase Auth ו-PostgreSQL
- Row Level Security על טבלאות המוצר
- Vercel עבור Preview ו-Production
- GitHub Pull Requests ו-CI

הסכמה הראשית מתועדת ב-`db/supabase-scheduler-schema.sql`. שינויים חדשים במסד נשמרים תחת `supabase/migrations/` ומוחלים באמצעות Migration רשמית.

## אבטחה

- אין להכניס מפתחות אמיתיים לקוד או ל-Git.
- אין לחשוף `SUPABASE_SECRET_KEY` בצד הדפדפן או עם תחילית `NEXT_PUBLIC_`.
- פעולות onboarding והזמנה דורשות משתמש מחובר עם מייל מאומת.
- פונקציות הרשאה רגישות משתמשות ב-`search_path` קשיח.
- נתוני Production ונתוני Demo נשמרים בנפרד.

## הרצה מקומית

1. מתקינים תלויות:

```bash
npm ci
```

2. מעתיקים את `.env.example` אל `.env.local` ומגדירים את משתני הסביבה המקומיים.

3. מפעילים:

```bash
npm run dev
```

האתר ייפתח ב-`http://localhost:3000`.

## בדיקות

```bash
npm run validate:schema
npm run test:unit
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm run health:production
```

GitHub Actions מריץ schema, unit, lint, typecheck, build ו־Playwright בכל Pull Request ל־`main` ובכל Push ל־`main`. בנוסף קיים E2E מאומת להפעלה ידנית מול Production עם tenants זמניים וניקוי מלא, כדי שכל הרצה בעלת הרשאות גבוהות תהיה החלטה מפורשת.

## תהליך פיתוח

1. יוצרים ענף מ-`main`.
2. מבצעים שינוי ממוקד.
3. פותחים Draft Pull Request.
4. ממתינים ל-ShiftPilot CI ול-Vercel Preview.
5. בודקים את התהליך הרלוונטי ב-Preview.
6. ממזגים ב-Squash רק כאשר כל הבדיקות ירוקות.

## מצב המוצר

המערכת נמצאת בשלב הכנה לפיילוט סגור. לפני שימוש בנתוני עובדים אמיתיים נדרשים:

- פיילוט מלא עם מנהל ומספר עובדי בדיקה
- תרגול שחזור כתיבה מלא בסביבת Staging מבודדת
- בדיקה משפטית סופית של תנאי השימוש ומדיניות הפרטיות
- הפעלת סביבת Staging נפרדת לאחר אישור העלות

בדיקות E2E במחשב ובמובייל, E2E מאומת מול Production, Audit אבטחה, גיבוי מוצפן עם checksum, ניטור שגיאות והתראות, Analytics מצומצם ומוגן פרטיות וניטור זמינות אוטומטי כבר פעילים.
