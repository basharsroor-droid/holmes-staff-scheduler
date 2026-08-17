# Runbook — תקלות ושחזור

מדריך פעולה מהיר למקרה שמשהו נשבר. ראו גם [ARCHITECTURE.md](./ARCHITECTURE.md) להבנת המבנה, ו-[INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) לתוכנית התגובה הפורמלית (חומרת אירועים, בעל ההחלטה, ומתי כל נוהל למטה רלוונטי). ה-Checklist למטה מכסה את מנגנון ה-**deploy** עצמו — ל-checklist נפרד שמכסה את **חוויית** הדמו/הפיילוט (לא רק שהקוד עלה בהצלחה, אלא שהמסלול המרכזי עובד נקי מקצה לקצה) ראו [QA_CHECKLIST.md](./QA_CHECKLIST.md).

## Checklist לפני כל Deploy (חובה, לא רשות)

חמש הבדיקות האלה הן בדיוק מה שכבר קורה בכל PR שהוזרם בפועל בפרויקט הזה עד היום — הרשימה כאן רק הופכת אותו מהרגל למחייב, כך שגם דילוג בלי לב רע (עייפות, לחץ זמן) לא יעבור בלי סימון מודע:

- [ ] **Migration** — אם יש שינוי סכימה: `list_migrations` אחרי מיזוג מוודא שהיא נרשמה בפועל (מיזוג ל-`main` **לא** מפעיל migration אוטומטית — `apply_migration` צריך קריאה נפרדת. ראו § שינוי סכימה למטה).
- [ ] **Secrets** — אם ה-PR מוסיף env var חדש: קיים גם ב-Vercel (Production+Preview+Development) וגם ב-GitHub Actions secrets אם צריך ל-CI, *לפני* שהקוד שתלוי בו מגיע ל-`main`.
- [ ] **Tests** — `npm run lint` + `tsc --noEmit` + `npm run build` + `npm run test:unit` + `npm run validate:schema`, כולם ירוקים מקומית לפני push, ו-CI ירוק ב-PR לפני מיזוג.
- [ ] **Preview** — ה-Preview Deployment של ה-PR עצמו הוא `READY` ולא `ERROR` (`get_deployment` / Vercel Dashboard) — לא מספיק ש-CI ירוק, כי Preview תופס בעיות build-time שהטסטים לא בהכרח מכסים.
- [ ] **Backup** — לפני deploy עם שינוי סכימה משמעותי (לא תוספת עמודה תמימה): לוודא שריצת הגיבוי הלילית האחרונה הצליחה (`gh run list --workflow=database-backup.yml --limit 1`), או להריץ אחת ידנית (`gh workflow run database-backup.yml`) לפני.

**בדיקת Smoke אחרי כל Deploy לפרודקשן:**
1. `curl -sL https://www.shiftpilothq.com/api/health` — סטטוס `ok` וה-`commit` תואם למה שזה עתה נדחף.
2. `curl -sL "https://www.shiftpilothq.com/api/health?deep=1"` — מוודא גם קישוריות אמיתית ל-Supabase, לא רק שהשרת עונה.
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

## גיבוי ושחזור

הפרויקט ב-Supabase Free — אין גיבויים יומיים מנוהלים אוטומטית (זה פיצ'ר של תוכנית Pro, כ-$25/ח׳). עד שנשדרג, יש גיבוי DIY:

**איך זה עובד:** `.github/workflows/database-backup.yml` רץ כל לילה (02:17 UTC), מריץ את `scripts/backup-database.mjs` שמייצא את כל השורות מכל 22 הטבלאות דרך ה-API (לא `pg_dump` — הסכימה עצמה כבר מתועדת במלואה ב-`supabase/migrations/`, רק הנתונים חסרים משם), מצפין את הכל עם [age](https://age-encryption.org) ומעלה כ-workflow artifact (שמירה של 90 יום, מקסימום שGitHub מאפשר).

**ההצפנה חד-כיוונית מכוונת:** ל-CI יש רק את המפתח הציבורי (מוטבע ב-YAML, לא סוד — הצפנה איתו לא מאפשרת פענוח). המפתח הפרטי לא נשמר בשום מקום בריפו או ב-secrets — הוא אצל בשאר בלבד. גם אם ה-workflow או ה-repo ייחשפו, אי אפשר לפענח גיבוי ישן או עתידי בלעדיו.

**מה עוד חסר להפעלה:** ה-secret `SUPABASE_SECRET_KEY` (ה-service_role key) חייב להיות מוגדר ב-GitHub Actions secrets (Settings → Secrets and variables → Actions) — זה היחיד שדורש הזנה ידנית, כי אי אפשר למשוך אותו דרך שום API. `gh secret set SUPABASE_SECRET_KEY` מהטרמינל, ולהדביק את הערך מ-Supabase Dashboard → Settings → API → `service_role`.

**שחזור (Restore):**
```bash
RESTORE_SUPABASE_URL=<פרויקט יעד — לעולם לא production>
RESTORE_SUPABASE_SECRET_KEY=<של פרויקט היעד>
BACKUP_AGE_PRIVATE_KEY=<המפתח הפרטי, אצל בשאר>
node scripts/restore-database.mjs backups/shiftpilot-backup.json.age
```
הסקריפט מסרב לרוץ אם `RESTORE_SUPABASE_URL` מצביע על פרויקט הפרודקשן (`forstsmvakpsreffdiwb`) — בדיקת בטיחות אחרונה, לא תחליף לכוון בזהירות מלכתחילה. יעד הגיוני: [Supabase branch](https://supabase.com/docs/guides/deployment/branching) חדש (`create_branch`), שם מריצים קודם את כל המיגרציות ואז את השחזור.

**הרצה ראשונה:** בוצעה בהצלחה ב-16.8.2026 (`workflow_dispatch`, run `31944745577`) — ייצוא 22 טבלאות, הצפנה, וארטיפקט אמיתי (127KB) אומת ידנית (כותרת `AGE ENCRYPTED FILE` תקינה). בדרך נתפס ותוקן secret שגוי (`NEXT_PUBLIC_SUPABASE_URL` ב-GitHub Actions גרם ל-`fetch failed`).

**Restore test:** לא בוצע עדיין. `create_branch` (Supabase branching) חסום — דורש תוכנית Pro. הניסיון החלופי — פרויקט Supabase חינמי שלישי ייעודי לבדיקה — נחסם גם הוא: ה-org כבר במגבלת 2 פרויקטים חינמיים (יש פרויקט לא-קשור בשם `mshro3` מאפריל 2026 שתופס את המקום השני). הוחלט (16.8.2026) לדלג על restore test בפועל כרגע ולא לגעת ב-`mshro3` בלי לבדוק קודם מה הוא. לביצוע בעתיד: להשהות/למחוק את `mshro3` אם אינו בשימוש, או לשדרג את ה-org ל-Pro.

## אנשי קשר / בעלות

Project owner: bashar.sroor@gmail.com — Supabase project `ShiftPilot` (`forstsmvakpsreffdiwb`), Vercel project `shiftpilot-demo`, GitHub `basharsroor-droid/holmes-staff-scheduler`.
