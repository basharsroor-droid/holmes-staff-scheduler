# Runbook — תקלות ושחזור

מדריך פעולה מהיר למקרה שמשהו נשבר. ראו גם [ARCHITECTURE.md](./ARCHITECTURE.md) להבנת המבנה, ו-[INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) לתוכנית התגובה הפורמלית (חומרת אירועים, בעל ההחלטה, ומתי כל נוהל למטה רלוונטי). ה-Checklist למטה מכסה את מנגנון ה-**deploy** עצמו — ל-checklist נפרד שמכסה את **חוויית** הדמו/הפיילוט (לא רק שהקוד עלה בהצלחה, אלא שהמסלול המרכזי עובד נקי מקצה לקצה) ראו [QA_CHECKLIST.md](./QA_CHECKLIST.md).

## Checklist לפני כל Deploy (חובה, לא רשות)

חמש הבדיקות האלה הן בדיוק מה שכבר קורה בכל PR שהוזרם בפועל בפרויקט הזה עד היום — הרשימה כאן רק הופכת אותו מהרגל למחייב, כך שגם דילוג בלי לב רע (עייפות, לחץ זמן) לא יעבור בלי סימון מודע:

- [ ] **Migration** — אם יש שינוי סכימה: לקרוא את ה-**Plan (dry run)** ב-PR לפני מיזוג, ואחרי המיזוג לוודא שה-workflow `Apply database migrations` ירוק **ושהנתונים עצמם השתנו** (שאילתה על הטבלה, לא רק `list_migrations`). ראו § שינוי סכימה למטה.
- [ ] **Secrets** — אם ה-PR מוסיף env var חדש: קיים גם ב-Vercel (Production+Preview+Development) וגם ב-GitHub Actions secrets אם צריך ל-CI, *לפני* שהקוד שתלוי בו מגיע ל-`main`.
- [ ] **Tests** — `npm run lint` + `tsc --noEmit` + `npm run build` + `npm run test:unit` + `npm run validate:schema`, כולם ירוקים מקומית לפני push, ו-CI ירוק ב-PR לפני מיזוג.
- [ ] **Preview** — ה-Preview Deployment של ה-PR עצמו הוא `READY` ולא `ERROR` (`get_deployment` / Vercel Dashboard) — לא מספיק ש-CI ירוק, כי Preview תופס בעיות build-time שהטסטים לא בהכרח מכסים.
- [ ] **Backup** — לפני deploy עם שינוי סכימה משמעותי (לא תוספת עמודה תמימה): לוודא שריצת הגיבוי הלילית האחרונה הצליחה (`gh run list --workflow=database-backup.yml --limit 1`), או להריץ אחת ידנית (`gh workflow run database-backup.yml`) לפני.

**בדיקת Smoke אחרי כל Deploy לפרודקשן:**
1. `curl -sL "https://www.shiftpilothq.com/api/health?deep=1"` — בבת אחת: סטטוס `ok`, שדה `version` שתואם ל-7 התווים הראשונים של הקומיט שזה עתה נדחף, ו-`dependencies.database: "ok"` שמוודא קישוריות אמיתית ל-Supabase ולא רק שהשרת עונה.
2. אם רק רוצים לוודא שהשרת חי בלי לגעת במסד: `curl -sL https://www.shiftpilothq.com/api/health` — מחזיר `status` ו-`version` בלבד.
3. עומס עין אחד על עמוד הבית ועל `/login` — שלא נראה שבור ויזואלית (ה-health check לא תופס בעיות רינדור).

## Deploy גרוע ב-Production

**תסמין:** האתר שבור אחרי מיזוג ל-`main`.

**החלטת Rollback מול Fix-forward** (לפי רמות החומרה ב-[INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md)): Sev1/Sev2 (האתר למטה לגמרי, או דליפת נתונים) → Rollback מיידי, לא מנסים לאבחן קודם. Sev3/Sev4 (פיצ'ר ספציפי שבור, לא חוסם) → מותר fix-forward רגיל דרך PR חדש, אין צורך ב-rollback.

1. Vercel Dashboard → Deployments → למצוא את הפריסה התקינה האחרונה (`isRollbackCandidate: true`) → **Promote to Production**. זו פעולה מיידית, לא דורשת קוד חדש. (אומת 16.8.2026: תמיד יש כמה מועמדי rollback זמינים — כל deploy קודם לפרודקשן מסומן `isRollbackCandidate: true` — המנגנון אינו תיאורטי.)
2. במקביל, ב-GitHub: `git revert <commit>` על `main` דרך PR (branch protection מחייב את זה — אי אפשר לדחוף ישירות).
3. לבדוק את `Runtime Logs` ב-Vercel (`get_runtime_logs`) ואת `get_deployment_build_logs` כדי להבין מה נשבר לפני שמנסים שוב.
4. אחרי rollback: להריץ שוב את בדיקת ה-Smoke למעלה מול הפריסה שהוחזרה.

**תרגול מלא (deploy אמיתי + promote-to-previous אמיתי):** לא בוצע עדיין — זו פעולה חיה בפרודקשן (גם אם קצרה והפיכה), ולכן נשארת החלטה של בשאר מתי להריץ, לא משהו שמבוצע באופן חד-צדדי. המנגנון עצמו כן אומת כזמין (סעיף 1 למעלה).

## שגיאות בפרודקשן (500 / RLS denies)

1. Supabase Dashboard → Logs → `postgres` / `api` — לחפש לפי טווח זמן.
2. אם זו שגיאת הרשאה (RLS), לבדוק קודם אם המשתמש חבר `active` בארגון הרלוונטי (`organization_memberships`), לא רק `invited`.
3. אם זו שגיאת RPC — כל הפונקציות הרגישות מתועדות ב-ARCHITECTURE.md, ואפשר למשוך את ההגדרה המלאה שלהן ישירות מ-`pg_proc` דרך Supabase כדי לבדוק לוגיקה בלי לחפש בקבצי המיגרציה.

## שינוי סכימה (DDL)

**לעולם לא ידני על פרודקשן.** כל שינוי סכימה:
1. קובץ חדש תחת `supabase/migrations/` בשם `YYYYMMDDHHMMSS_description.sql`.
2. הרצה מקומית/Preview לבדיקה.
3. PR רגיל → CI → מיזוג. ב-PR שנוגע ב-`supabase/migrations/**` רץ אוטומטית job בשם **Plan (dry run)** שמדפיס ב-Summary של הריצה בדיוק אילו הצהרות היו רצות — **לקרוא אותו לפני מיזוג**, זו הזדמנות לראות את שינוי הסכימה לצד שינוי הקוד.
4. **החלה על Production — אוטומטית מאז 10.9.2026.** ה-workflow `.github/workflows/apply-migrations.yml` רץ ב-push ל-`main`, מריץ `supabase db push`, קורא בחזרה את רשימת המיגרציות, ומריץ בדיקת בריאות עמוקה. אם משהו נכשל — הריצה אדומה.
5. **עדיין לוודא את התוצאה בפועל** — שאילתה על הטבלה שהשתנתה, לא רק שהמיגרציה "נרשמה". גרסת ה-migration שנרשמת ב-`supabase_migrations.schema_migrations` מקבלת חותמת זמן חדשה בזמן ההחלה ולא בהכרח תואמת לשם הקובץ.

> **סדר מול Vercel:** ה-deploy של Vercel רץ מאותו push, במקביל, ואינו מחכה ל-workflow הזה. בפועל החלת המיגרציה מסתיימת תוך פחות מדקה בעוד בנייה ב-Vercel לוקחת ~6 — כלומר הסכימה מקדימה. זו מרווח בטיחות, לא ערובה. **מיגרציה שחייבת להקדים את הקוד שלה** (עמודה `not null` שהקוד החדש כותב אליה, למשל) עדיין דורשת שני PR-ים: סכימה קודם, קוד אחר כך.

> **הרצה ידנית:** `gh workflow run apply-migrations.yml` (למשל אחרי כשל, או להחלת מיגרציה שנוספה בלי push ל-main).

> **אירוע 8.9.2026 שממנו נלמד הסעיף הזה:** PR #217 (תמחור) מוזג עם CI ירוק, ה-UI עלה עם המחירים החדשים, אבל `public.plans` נשאר במחירים הישנים — המיגרציה לא הוחלה. התוצאה הייתה עמוד תמחור שמציג מסלול `network` שה-RPC דוחה כ-`Invalid plan`. **תמיד לאמת נתונים, לא רק שהמיגרציה "נרשמה".**

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

## גיבוי ושחזור

**איך זה עובד:** `.github/workflows/database-backup.yml` רץ כל לילה (02:17 UTC) ומריץ את `scripts/backup-database.mjs`. הסקריפט מייצא דרך ה-API את כל השורות מכל הטבלאות ב-`public`, בדפים של 1000 שורות. רשימת הטבלאות והמפתח הראשי של כל טבלה נמצאים ב-`lib/backup-tables.mjs`. בנוסף הוא מייצא את `auth.users`, רק בשדות שצריך כדי ליצור מחדש כל משתמש עם אותו UUID — **בלי password hashes**. הכל מוצפן עם [age](https://age-encryption.org) ומועלה כ-workflow artifact שנשמר 90 יום. כל גיבוי כולל גרסת פורמט (כרגע 2), מספר שורות לכל טבלה ו-SHA-256 checksum.

**כיסוי:** בבדיקת `Schema invariants` ב-CI רץ `scripts/check-backup-coverage.mjs` מול מסד שנבנה מהמיגרציות. הוא נכשל אם טבלה חדשה לא נכנסה לגיבוי, אם לעמודת טקסט/JSON חדשה אין כלל שחזור ("keep" או אנונימיזציה), או אם המפתח הראשי השתנה. עד 11.9.2026 שמונה טבלאות לא גובו, ביניהן `subscriptions` ו-`billing_events`, כי הרשימה נכתבה ידנית ב-16.8. בנוסף, ייצוא בלי דפים היה נחתך בשקט אחרי 1000 שורות.

**ההצפנה חד-כיוונית בכוונה:** ל-CI יש רק את המפתח הציבורי, שמוטבע ב-YAML. המפתח הפרטי לא נשמר בריפו ולא ב-secrets. הוא נמצא רק אצל בשאר, במחשב שלו תחת `~/.shiftpilot-secrets/`. גם אם ה-workflow או הריפו ייחשפו, אי אפשר לפענח גיבוי בלעדיו.

**בדיקת תקינות (לא נוגעת באף מסד):**
```bash
BACKUP_AGE_PRIVATE_KEY=<המפתח הפרטי> \
node scripts/restore-database.mjs backup.json.age --verify-only
```

**תרגיל שחזור ל-Staging, עם אנונימיזציה:**
```bash
RESTORE_DATABASE_URL=<Postgres connection string של Staging> \
BACKUP_AGE_PRIVATE_KEY=<המפתח הפרטי> \
node scripts/restore-database.mjs backup.json.age --staging-restore
```
- מסרב לכל יעד שאינו פרויקט ה-Staging (`sqmstwwrdoenfumligmf`), ובמיוחד ל-Production (`forstsmvakpsreffdiwb`).
- מסרב אם Staging לא ריק, או אם יש בו טבלה או עמודה שהפורמט לא מכיר.
- שמות, מיילים, טלפונים, הערות ו-JSON מוחלפים בערכים סינתטיים. המזהים והקשרים בין הרשומות נשמרים. מיילים הופכים ל-`…@restore.invalid` וטוקני push ל-`restore-…`. שום הודעה שחוזרת מהגיבוי לא נשארת ממתינה לשליחה.
- המשתמשים משוחזרים עם אותו UUID ובלי סיסמה, כך שאי אפשר להתחבר בשמם.
- הכל רץ בטרנזקציה אחת. בזמן ההכנסה בלבד הטריגרים עוקפים עם `SET LOCAL session_replication_role = replica`. אחר כך נבדקים כל ה-FKs, מספר השורות בכל טבלה מול הגיבוי, ושאף מייל, טלפון או טוקן אמיתי לא עבר. commit מתבצע רק אם כל הבדיקות עברו. `--rollback` מריץ את כל השלבים ומבטל בסוף.
- ניקוי אחרי התרגיל: `RESTORE_DATABASE_URL=… node scripts/restore-database.mjs --staging-cleanup`. הסקריפט מסרב אם יש ב-Staging משתמשים שהשחזור לא יצר.

**שליחה החוצה חסומה מחוץ ל-Production:** לפי `lib/outbound.ts`, מייל ו-push יוצאים רק מ-runtime שמחובר למסד ה-Production, ואף פעם לא לכתובת או לטוקן סינתטיים של שחזור.

**שחזור אמיתי (DR) לפרויקט חדש, עם נתונים לא-אנונימיים,** אינו מצב של הסקריפט. זו החלטה של בעל הפרויקט.

**היסטוריה:** הגיבוי הראשון רץ ב-16.8.2026 (run `31944745577`). ב-11.9.2026 בוצע תרגיל השחזור הראשון. `--verify-only` עבר, אבל שחזור מלא ל-Staging ריק לא היה אפשרי: `auth.users` לא גובו, טריגרי הזמינות דחו את ההכנסה, ושמונה טבלאות חסרו בגיבוי. התיקון הוא ה-PR שמכניס את `lib/backup-tables.mjs`.

## אנשי קשר / בעלות

Project owner: bashar.sroor@gmail.com — Supabase project `ShiftPilot` (`forstsmvakpsreffdiwb`), Vercel project `shiftpilot-demo`, GitHub `basharsroor-droid/holmes-staff-scheduler`.
