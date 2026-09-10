# ShiftPilot — Remediation Plan

**גרסה:** 1.0 · **תאריך:** 10.9.2026 · **בסיס:** `main` @ `b768187`

מאחד את שני הממצאים:
- [`PROJECT_AUDIT_2026-09-08.md`](./PROJECT_AUDIT_2026-09-08.md) — סקירת פרויקט (עסק, תשתית, תהליך)
- סקירה הנדסית (10.9.2026) — קוד, מודל נתונים, concurrency, ביצועים, בדיקות

זה מסמך עבודה, לא דוח. כל פריט הוא יחידת עבודה עם קריטריון קבלה.

---

## 1. מסגרת עדיפויות

| רמה | הגדרה | SLA |
|---|---|---|
| **P0** | חוסם לקוח משלם ראשון, **או** סיכון פעיל לנכונות/אבטחה/נתונים | לפני הלקוח הראשון |
| **P1** | יישבר בעומס אמיתי ראשון, **או** חוסם ביטחון בשחרור | 30 יום |
| **P2** | חוב איכות/תחזוקה עם תאריך יעד | 90 יום |
| **P3** | נדחה במודע — מתועד כדי שלא ייפול בין הכיסאות | ללא תאריך |

**אומדן מאמץ:** XS < 2ש׳ · S ≈ חצי יום · M = 1–2 ימים · L = 3–5 ימים · XL > שבוע

---

## 2. תשעה Workstreams

| # | Workstream | מה זה מכסה | פריטים |
|---|---|---|---|
| **A** | Type Safety & Correctness | טיפוסים, casts, נכונות קומפילציה | 3 |
| **B** | Data Access & Performance | שאילתות, N+1, concurrency בכתיבה | 4 |
| **C** | Business Rules | חוקי עבודה — מנוחה, שעות, זמן, timezone | 3 |
| **D** | Verification Gates | בדיקות, CI, schema validation | 4 |
| **E** | Infrastructure & Release | מיגרציות, cron, hosting, ניקוי | 6 |
| **F** | Codebase Consolidation | מחיקת מסלול הדמו הכפול | 2 |
| **G** | Design System | פונט, טיפוגרפיה, אנימציה, נגישות | 4 |
| **H** | Customer-Facing Surface | דף בית, מובייל, ליד, SEO, אנליטיקס | 6 |
| **I** | Product UX | ניווט, onboarding, מצבי ריק, שגיאות | 3 |
| **J** | Commercial Layer | סליקה, חיוב, מנוי, משפטי | 5 |

---

## 3. פריטי העבודה

### Workstream A — Type Safety & Correctness

**A1 · רג׳נרוט `types/database.ts` והסרת 60 `as any`** — `P0` · `M`
> `types/database.ts` עודכן לאחרונה ב-`9d31a12`. חסרות 5 טבלאות: `open_shift_requests`, `schedule_templates`, `schedule_template_items`, `push_devices`, `push_delivery_queue`. הפתרון שנבחר היה `const db = supabase as any` — **וזה מבטל type-checking על כל השאילתות בקובץ, לא רק על הטבלה החסרה.** 60 מופעים, כולם בקוד השיבוץ החדש והמורכב.

- **קבצים:** `types/database.ts`; 22 קבצים תחת `app/workspace/`, `app/api/`
- **ביצוע:** `npx supabase gen types typescript --project-id forstsmvakpsreffdiwb > types/database.ts` → מחיקת כל `as any` → תיקון מה שנשבר
- **קבלה:** `grep -c "as any" app components lib` מחזיר `0`; `npm run typecheck` נקי
- **הערה:** צפויות שגיאות אמיתיות שהיו חבויות. זה הרווח, לא הנזק.

**A2 · לאסור `as any` ב-lint** — `P1` · `XS`
- **ביצוע:** `@typescript-eslint/no-explicit-any: error` + `no-unsafe-assignment` על `app/**`
- **קבלה:** CI נכשל על `as any` חדש. תלוי ב-A1.

**A3 · normalize `search_path` ב-5 RPC-ים** — `P2` · `XS`
> 27 מ-32 ה-RPC-ים משתמשים ב-`search_path = ''`. חמישה החדשים (`request_open_shift`, `check_open_shift_eligibility`, `cancel_open_shift_request`, `decide_open_shift_request`, `set_shift_open_for_requests`) משתמשים ב-`public, private`. לא פרצה — שבירת תבנית.
- **קבלה:** מיגרציה אחת; `select count(*) from pg_proc where prosecdef and proconfig::text not like '%search_path=""%'` = 0

---

### Workstream B — Data Access & Performance

**B1 · RPC `replace_shift_assignment` במקום כתיבה ישירה מהדפדפן** — `P0` · `S`
> `smart-replacement-panel.tsx:236-240` מבצע `delete()` ואז `insert()` מהדפדפן, **בלי טרנזקציה ובלי נעילה**, עם rollback ידני אם ה-insert נכשל. זו הפעולה היחידה במערכת שמשנה שיבוצים בלי RPC. אם ה-rollback נכשל — העובד נעלם מהמשמרת. `approve_shift_swap` עושה בדיוק את אותו דבר נכון, עם `FOR UPDATE`.

- **ביצוע:** RPC `replace_shift_assignment(target_shift_id, outgoing_user_id, incoming_user_id)` — `SECURITY DEFINER`, `FOR UPDATE` על השיבוץ, ולידציה מחדש אחרי הנעילה, `raise exception` אם השתנה
- **קבלה:** אין `.from("shift_assignments").delete()` או `.insert()` באף client component; טסט קונקורנטי: שני מנהלים במקביל → אחד מצליח, השני מקבל שגיאה ברורה

**B2 · הגבלת השאילתות בפאנלי ה-Intelligence** — `P0` · `S`
> ארבעה פאנלים (`smart-replacement`, `shiftpilot-score`, `conflict-detector`, `fix-my-schedule`) מריצים `db.from("shifts").select(...).neq("status","cancelled")` — **בלי סינון תקופה, בלי טווח תאריכים, בלי limit** — ואז מושכים את כל ה-assignments. RLS מגביל לארגון, אז זה נכון; אבל זה מוריד את כל היסטוריית העסק לדפדפן בכל לחיצה. היום 93 שורות. במסלול "רשת" (150 עובדים × 12 חודשים) — 20–50 אלף שורות, ולולאות O(shifts × assignments) ב-JS על מכשיר של מנהל.

- **ביצוע:** להגביל ל-`schedule_period_id` הרלוונטי, או לחלון תאריכים (`shift_date >= period.start - 7d`), עם `.limit()` הגנתי
- **קבלה:** אין שאילתת `shifts` ללא `.eq/.in` על תקופה או `.gte` על תאריך; מדידה: < 500 שורות ל-rank בעסק של 80 עובדים

**B3 · צמצום ה-waterfall ב-schedule-builder** — `P1` · `M`
> `page.tsx` עושה 17 שאילתות שרת, ואז מרנדר ~10 פאנלים שכל אחד יורה עוד 2–11 ב-`useEffect`. **~60 round-trips לרנדר עמוד אחד.** `app/workspace/page.tsx` כבר עושה `Promise.all` נכון — הדפוס קיים, פשוט לא הועתק.

- **ביצוע:** להעביר את הנתונים המשותפים (shifts, assignments, workers, availability) מ-fetch-per-panel ל-props מהשרת; `Promise.all` בשרת; פאנל שצריך רענון מקבל `router.refresh()`
- **קבלה:** ספירת round-trips ראשוני < 20; TTI נמדד לפני/אחרי

**B4 · אינדקסים ל-9 FK + תיקון 4 RLS policies** — `P1` · `S`
> Supabase advisors: 9 FK ללא אינדקס מכסה (`push_delivery_queue` ×3, `push_devices`, `schedule_templates` ×3, `schedule_template_items` ×2). 4 policies מעריכות `auth.uid()` **לכל שורה** במקום `(select auth.uid())` — רגרסיה מהדפוס שנשמר ב-63 ה-policies האחרות.
- **קבלה:** `get_advisors(performance)` — 0 ממצאי `unindexed_foreign_keys` ו-`auth_rls_initplan`
- **בנוסף (P2):** 25 אינדקסים שלא בשימוש — לבחון מחיקה אחרי שיהיה עומס אמיתי, לא לפני

---

### Workstream C — Business Rules (התנאים)

**C1 · `lib/shift-time.ts` — מקור אמת אחד לחישובי זמן** — `P1` · `M`
> `shiftHours`, `bounds`, `overlaps`, `weekStartKey` משוכפלים ב-**6 מקומות** (5 פאנלים ב-`schedule-builder` ועוד `schedule-builder-client.tsx`) — העתק-הדבק. *(בסקירה ההנדסית נכתב "4"; נספר מחדש ב-10.9.)*
>
> **באג קונקרטי שנמצא ב-10.9:** ה-guardrail של ה-marketplace (`private.assert_shift_marketplace_eligibility`) מקבץ שבועות עם `date_trunc('week', …)` — שבוע ISO, **שני עד ראשון** — בעוד כל 6 העותקים בדפדפן (`getDay()`) סופרים **ראשון עד שבת**. אומת: `2026-09-13` (ראשון) נספר ב-SQL לשבוע שמתחיל ב-`2026-09-07`. לעסק ישראלי יום ראשון נספר לשבוע הקודם, כך שמגבלת השעות השבועית מחושבת לא נכון, והדפדפן והשרת לא מסכימים ביניהם. **חשיפה היום: אפס** (0 עובדים עם מגבלה שבועית, 0 בקשות marketplace) — אבל ל-3 ארגונים אמיתיים ה-marketplace פעיל, כך שהבאג ייפגע בעסק הראשון שיגדיר מגבלה.
- **ביצוע:** חילוץ למודול יחיד + unit tests (משמרת חוצת חצות, שבוע שמתחיל בראשון, שעון קיץ); מיגרציה שמחליפה ב-guardrail את `date_trunc('week', d)` ב-`d - extract(dow from d)::int` (שבוע שמתחיל בראשון), כך ש-SQL והדפדפן יגדירו "שבוע" אותו דבר.
- **קבלה:** 0 הגדרות כפולות; SQL והדפדפן מחזירים את אותה תחילת-שבוע לכל תאריך (טסט על שבת, ראשון ושני); כיסוי unit על חוצת-חצות ומעבר שעון.

**C2 · Timezone של הארגון בחישובי זמן** — `P1` · `S`
> `new Date(\`${shift.shift_date}T${shift.start_time}\`)` נפרש ב-**local time של הדפדפן**. ל-`organizations` יש עמודת `timezone` שלא בשימוש בקוד הזה. מנהל שנוסע לחו״ל יקבל תוצאות overlap שונות. באג שקט, קשה לשחזור.
- **ביצוע:** להעביר `organization.timezone` לפאנלים; חישובים ב-TZ של הארגון (`Intl.DateTimeFormat` / `temporal` polyfill)
- **קבלה:** טסט: אותו סידור, דפדפן ב-`Asia/Jerusalem` מול `America/New_York` → תוצאות זהות. תלוי ב-C1.

**C3 · תיעוד היכן כל חוק עסקי נאכף** — `P2` · `S`
> **תיקון לסקירה ההנדסית (10.9):** נכתב כאן ש"מנוחה מינימלית" ו"שעות שבועיות" קיימים כ-triggers ב-SQL. **זה לא נכון.** אלה עמודות בלבד (`organization_memberships.weekly_hours_limit`, `organizations.min_rest_hours`). הפונקציה היחידה ב-SQL שאוכפת אותן היא `private.assert_shift_marketplace_eligibility` — כלומר רק כשעובד מבקש משמרת פתוחה. **בשיבוצי מנהל הן מייעצות בלבד** ונבדקות רק בדפדפן. ה-triggers שכן רצים על כל `insert` ל-`shift_assignments` הם שלושה: שיוך למחלקה (`enforce_assignment_department`), חופשה מאושרת (`prevent_assignment_during_approved_leave`), וחפיפה (`shift_assignment_overlap_check`).
>
> המשמעות: אין "שני מקורות אמת" לאותו חוק — יש חוק שנאכף בשרת במסלול אחד ורק מוצג כאזהרה במסלול אחר, בלי שזה כתוב בשום מקום.
- **ביצוע:** טבלה ב-`docs/coverage-rules.md`: חוק → איפה נאכף (SQL / דפדפן / שניהם) → באיזה מסלול (מנהל / marketplace) → מה קורה כשהם לא מסכימים. **ובנוסף — החלטת מוצר:** האם מנהל צריך להיחסם כשהוא חורג ממגבלת שעות או מנוחה, או רק לקבל אזהרה.
- **קבלה:** כל חוק ב-`shift-validation.ts` מופיע בטבלה עם המסלול שבו הוא נאכף; ההחלטה על אכיפה למנהלים מתועדת.

---

### Workstream D — Verification Gates

**D1 · E2E על המסלול האמיתי** — `P0` · `M`
> 8 קבצי e2e — **כולם על `/demo` (mock data) ועמודים ציבוריים**. 7 unit tests — כולם פונקציות טהורות. **אף בדיקה לא נוגעת במסד נתונים.** הסוויטה מוכיחה שאתר השיווק והדמו עובדים; היא לא מוכיחה כלום על שיבוץ.

- **ביצוע:** spec אחד מול Staging: הזמנת עובד → הגשת זמינות → בניית סידור → פרסום → בקשת החלפה → אישור. עם ניקוי `finally`.
- **קבלה:** רץ ב-CI על כל PR (או לפחות nightly); נכשל אם אחד מהשלבים נשבר

**D2 · הפעלת ה-workflows הרדומים** — `P1` · `XS`
> `production-authenticated-e2e` (רץ לאחרונה 21.8), `staging-critical-e2e`, `staging-support-e2e`, `pilot-readiness` — כולם `workflow_dispatch` בלבד; **שלושה מעולם לא רצו.**
- **ביצוע:** `schedule:` לילי על staging-critical ועל staging-workspace (D1). שניהם מדלגים עם אזהרה כל עוד `STAGING_SUPABASE_SECRET_KEY` לא מוגדר
- **לא בתוכנית (החלטת בעלים, 10.9):** `production-authenticated-e2e` נשאר ידני בלבד, כדי שכל הרצה בעלת הרשאות גבוהות מול פרודקשן תהיה החלטה מפורשת
- **קבלה:** ריצה לילית מוצלחת אחת מתועדת לכל workflow של staging

**D3 · schema validation אמיתית (או להוריד לו את התואר)** — `P1` · `M`
> `scripts/validate-supabase-schema.mjs` — 986 שורות, **required status check על `main`**. הוא קורא את `db/supabase-scheduler-schema.sql` — **קובץ מ-PR #1, 8 באוגוסט**, שלא מכיל אף אחת מ-6 הטבלאות החדשות — ומחרוזת-מתאים מול **41 שמות קבצי מיגרציה מקודדים קשיח** (החדש שהוא מכיר: 4.9). **הוא לא מתחבר למסד נתונים.** הוא לא יכול לזהות drift, policy שבורה או אינדקס חסר.

- **אפשרות 1 (מומלץ):** לכתוב מחדש מול Staging — לשאול `pg_policies`, `pg_indexes`, `pg_proc`, `information_schema` ולאמת invariants אמיתיים (כל טבלה עם RLS, כל SECURITY DEFINER עם `search_path=''`, כל FK עם אינדקס)
- **אפשרות 2:** לשנות שם ל-`check-hardening-regressions.mjs`, לתעד שזו בדיקת רגרסיה על החלטות ספציפיות — ולהוסיף gate אמיתי בנפרד
- **קבלה:** הסקריפט מזהה שינוי סכימה אמיתי שהוכנס בכוונה בטסט. תלוי ב-E1.

**D4 · תיקון התיעוד שמפנה לקובץ המת** — `P1` · `XS`
> `README.md` ו-`ARCHITECTURE.md` מפנים ל-`db/supabase-scheduler-schema.sql` כ"סכימת המקור". הקובץ בן חודש. זה מטעה אקטיבית.
- **קבלה:** שני המסמכים מפנים ל-`supabase/migrations/` כמקור היחיד

---

### Workstream E — Infrastructure & Release

**E1 · החלת מיגרציות אוטומטית במיזוג** — `P0` · `S`
> אומת בכאב ב-8.9: `public.plans` נשאר במחירים ישנים אחרי מיזוג #217, עד להחלה ידנית. `RUNBOOK.md` סותר את עצמו — שורה 9 (נכון: לא אוטומטי) מול שורה 44 (שגוי: "מוחל אוטומטית"). **כל PR עם מיגרציה = צעד ידני שקל לשכוח = production mismatch.**
- **ביצוע:** GitHub Action ב-push ל-`main` שמריץ `supabase db push` על Production (עם `--dry-run` ב-PR)
- **קבלה:** מיגרציית בדיקה מוחלת אוטומטית תוך 5 דקות ממיזוג; `RUNBOOK.md` שורה 44 מתוקנת

**E2 · `version` ב-`/api/health?deep=1`** — `P1` · `XS`
> ה-Runbook מורה לאמת commit דרך deep — אבל רק ה-shallow מחזיר `version`.
- **קבלה:** `curl .../api/health?deep=1 | jq .version` מחזיר SHA

**E3 · מיזוג 3 Dependabot PRs** — `P0` · `XS`
> **browserslist HIGH** (#205, פתוח מ-5.9), @xmldom/xmldom MEDIUM (#173), postcss-selector-parser LOW (#174), uuid MEDIUM (transitive). כולם devDeps — אבל HIGH פתוח שבוע על ריפו עם branch protection.
- **קבלה:** 0 alerts פתוחים ברמת HIGH

**E4 · שדרוג ל-Vercel Pro** — `P0 (לפני לקוח משלם)` · `XS`
> ה-ToS של Vercel אוסר שימוש מסחרי ב-Hobby. לא מופיע במפת ההוצאות ($20/ח׳).
- **קבלה:** התוכנית Pro; ההוצאה במפת העבודה

**E5 · `crypto.timingSafeEqual` ב-cron auth** — `P2` · `XS`
> `app/api/cron/notifications/route.ts` משווה מחרוזות ישירות. לא מציאותי לניצול (סוד באנטרופיה גבוהה), אבל זו שורה אחת.

**E6 · ניקוי 99 ענפים** — `P2` · `XS`
> 13 ממוזגים לגמרי, עוד עשרות squash-merged. גם: לשקול שינוי שם הפרויקט ב-Vercel מ-`shiftpilot-demo`.

---

### Workstream F — Codebase Consolidation

**F1 · מחיקת מסלול הדמו הישן** — `P1` · `M`
> ~2,965 שורות: `lib/mock-data.ts`, `components/layout/app-shell.tsx` (**auth ב-localStorage**), ו-10 עמודים תחת `/manager`, `/employee`, `/schedule`, `/availability`, `/swap-requests`, `/my-shifts`, `/manager-requests`, `/admin/*`, `/pilot`. זה קודבייס שני שלם על mock data, במקביל ל-`/workspace/*` האמיתי. כל שינוי UX צריך להיעשות פעמיים, או שהדמו מתרחק מהמוצר. **הוא כבר לא מייצג את המוצר.**
> **וזה בדיוק מה שכל ה-e2e בודק** (D1) — הבדיקות בודקות את הקוד המת.

- **תלות:** חייב לבוא **אחרי** D1, אחרת נשארים בלי שום e2e
- **ביצוע:** להפוך את `/demo` ל-tenant אמיתי במצב read-only (הוא כבר קיים ב-DB — `is_demo`), ולמחוק את mock-data ואת 10 העמודים
- **קבלה:** `lib/mock-data.ts` לא קיים; `/demo` עדיין עובד; e2e עברו ל-`/workspace`

**F2 · פירוק JSX בצפיפות בלתי-קריאה** — `P2` · `S`
> `app/workspace/page.tsx` — שורות בודדות מעל **2,000 תווים**. אי אפשר לסקור ב-diff, blame חסר ערך, merge conflict = סיוט.
- **ביצוע:** Prettier עם `printWidth` סביר על `app/workspace/**`, חילוץ בלוקי ניווט לקומפוננטות
- **קבלה:** אין שורה > 200 תווים ב-`app/**`

---

### Workstream G — Design System (פונט + אנימציה)

**G1 · מעבר טיפוגרפי סיסטמתי** — `P1` · `M`
> `--font: Arial, "Noto Sans Hebrew"` — Arial לכותרות עבריות גדולות היא ברירת מחדל, לא בחירה. **ובעיה מוכחת:** `letter-spacing: -.055em` על `.pricing-hero h1` גרם לאותיות עבריות להיכנס אחת בשנייה (תוקן ב-PR #220). אותו tracking שלילי קיים בכותרות אחרות (`.pro-hero h1`, h2 בסקשנים).

- **ביצוע:**
  1. אודיט: כל `letter-spacing` שלילי מתחת ל-`-.01em` על טקסט עברי → לרכך
  2. בחירת פונט עברי אמיתי (Heebo / Assistant / Rubik דרך `next/font` — self-hosted, בלי FOUT)
  3. סקאלה טיפוגרפית מוגדרת (`--text-xs` … `--text-5xl`) במקום `clamp()` אד-הוק בכל מקום
- **קבלה:** אין tracking שלילי מתחת ל-`-.01em`; הפונט נטען דרך `next/font`; סקאלה מתועדת ב-`BRAND_GUIDE.md`

**G2 · `prefers-reduced-motion` בכל שכבות האנימציה** — `P1` · `S`
> מכובד **רק** ב-`site-intro.tsx`. `framer-motion` (login, hero) ו-`ScrollReveal` (כל סקשן) מתעלמים ממנו. בעיית נגישות (WCAG 2.3.3) — ובאתר שכבר עבר סריקות a11y.
- **ביצוע:** `<MotionConfig reducedMotion="user">` ברמת ה-layout; `useReducedMotion()` ב-`ScrollReveal`; `@media (prefers-reduced-motion: reduce)` על אנימציות ה-CSS
- **קבלה:** עם ההעדפה דלוקה — אפס תנועה; ה-axe scan הקיים מכסה

**G3 · תקציב אנימציה** — `P2` · `S`
> intro overlay של **3.6 שניות** בכניסה ראשונה, framer על login, blur-reveal על hero, `ScrollReveal` על כל סקשן. זה מצטבר לתחושת כבדות — ובדיוק הפידבק שניתן ב-19.8 ("מופיע עמוס ודחוס").
- **ביצוע:** לקצר את ה-intro ל-≤1.5ש׳ (או להריץ רק בביקור ראשון-אי-פעם, לא per-session); להסיר `ScrollReveal` מסקשנים מתחת לקיפול הראשון
- **קבלה:** LCP < 2.5ש׳ בדף הבית; intro לא חוזר בניווט פנימי

**G4 · תיקון באג ה-intro הישן** — `P2` · `XS`
> מתועד ב-`deferred-design-cleanup`: הבזק של הדף מתחת לפני שה-intro מופיע. תוקן חלקית ב-PR #156 עם preboot script — לוודא שזה עדיין תקף אחרי כל השינויים.

---

### Workstream H — Customer-Facing Surface (הצורה שהלקוח רואה)

**H1 · תיקון נתיב הליד ל-Enterprise** — `P0` · `S`
> כפתור **"דברו איתנו"** בכרטיס Enterprise ב-`/pricing` מקשר ל-`/support` — **קונסולת תמיכה פנימית auth-gated**. פרוספקט אנונימי מגיע למסך login. אין טופס קשר ציבורי, אין mailto בולט, אין Calendly. **לקוח ארגוני שרוצה לדבר איתך — לא יכול.**
- **ביצוע:** `/contact` ציבורי (טופס → `support_tickets` או מייל) או Calendly; לתקן את הלינק ב-`pricing-plans.tsx` ובכל מקום אחר שמפנה ל-`/support` מהצד הציבורי
- **קבלה:** משתמש אנונימי משלים פנייה מקצה לקצה

**H2 · Vercel Web Analytics** — `P0` · `XS`
> **לא מופעל.** אין שום מדידה של תנועה לאתר או ל-`/pricing`. ה-analytics הפנימי מודד רק אירועים בתוך המוצר. אתה עיוור למשפך השיווקי — ואתה עומד להשקיע במכירות.
- **קבלה:** דשבורד מציג pageviews ל-`/` ו-`/pricing`

**H3 · `robots.txt` + `sitemap.xml`** — `P1` · `S`
> שניהם 404.
- **ביצוע:** `app/robots.ts` + `app/sitemap.ts`. **חשוב:** `disallow` על `/workspace/*`, `/demo`, `/support`, `/pilot`, `/manager`, `/employee`, `/admin`
- **קבלה:** שניהם 200; מסלולים פרטיים חסומים

**H4 · דף הבית במובייל** — `P1` · `M`
> רווח לבן גדול מתחת ל-navbar, ואז 2 CTA + sticky bar עם עוד 2 CTA = **4 כפתורים זהים במסך אחד**. זה ה"עמוס ודחוס" מ-19.8.
- **ביצוע:** להסיר את כפילות ה-CTA (sticky bar *או* inline, לא שניהם); לצמצם את הרווח מעל ה-hero במובייל
- **קבלה:** מסך ראשון במובייל: CTA ראשי אחד + משני אחד

**H5 · כותרת PWA** — `P2` · `XS`
> `apple-mobile-web-app-title: "SP"` (`lib/app-config.ts` → `shortName`). האייקון על מסך הבית נקרא "SP".
- **קבלה:** "ShiftPilot"

**H6 · FAQ ציבורי לתמיכה** — `P2` · `S`
> `docs/SUPPORT_SOP.md` ו-`/workspace/help` קיימים — אבל אין שום עזרה ציבורית לפני הרשמה.

---

### Workstream I — Product UX (איך משתמשים באתר)

**I1 · אשף הקמה מלא בתוך המוצר** — `P1` · `L`
> מסומן "חלקי" במפת העבודה מאז 3.9. `/workspace` מציג 3 צעדים (סוגי משמרות → חודש עבודה → הזמנת צוות) — אבל אין הדרכה בתוך כל צעד, אין תבניות לפי סוג עסק, ואין מדידת פאנל.
- **ביצוע:** אשף מודרך לכל צעד; תבניות משמרות מוכנות (מסעדה / קפה / מועדון / קמעונאות); אירוע analytics לכל צעד
- **קבלה:** עסק חדש מגיע לסידור ראשון בלי הדרכה חיצונית; יש נתוני נשירה לכל צעד

**I2 · מצבי ריק ומצבי שגיאה** — `P2` · `M`
> `setMessage("...")` הוא דפוס הודעת השגיאה הרווח בפאנלים. הודעות טובות (למשל "השיבוץ השתנה מאז הדירוג") אבל לא אחיד, ואין מצבי ריק מעוצבים למסכים ללא נתונים.
- **קבלה:** קומפוננטת `<EmptyState>` ו-`<ErrorState>` אחידות בשימוש בכל מסכי `/workspace`

**I3 · תדירות סידור בפועל** — `P2` · `S`
> `schedule_cadence` נשמר ב-`organizations` (שבועי/דו-שבועי/חודשי/מותאם) ומוצהר בעמוד התמחור — אבל מסומן במיגרציה עצמה כ"informational and not used for billing". צריך לוודא שהוא באמת משפיע על פתיחת תקופות עבודה, ולא רק נשמר.

---

### Workstream J — Commercial Layer

**J1 · ספק סליקה** — `P0` · `L` · *חוסם הכנסה*
> Stripe (מהיר, קופונים מובנים למבצע ההשקה) או Tranzila/Cardcom (חשבונית ישראלית מובנית). תוכנית המימוש ב-`PRICING_BENCHMARK.md` §4.

**J2 · מסך ניהול מנוי + חשבוניות** — `P0` · `L`
> שדרוג, הורדה, הקפאה, ביטול. הטבלאות (`plans`, `subscriptions`) קיימות ומאוכלסות.

**J3 · אכיפת מכסות** — `P1` · `M`
> `organization_usage` view קיים ומחשב שימוש מול מכסה — **אבל אף אחד לא אוכף אותו.** אפשר להזמין 500 עובדים במסלול Solo.

**J4 · ישות עסקית + מערכת חשבוניות** — `P0` · חיצוני
**J5 · DPA** — `P0` · חיצוני · *דורש עו״ד*

---

## 4. סדר ביצוע

הסדר נגזר מתלויות ומסיכון, לא מגודל.

### Wave 0 — עצירת דימום (יומיים)
*מטרה: לסגור סיכוני נכונות פעילים ואת הדליפות שעולות כסף כל יום.*

| # | פריט | מאמץ |
|---|---|---|
| 1 | **E3** מיזוג Dependabot (HIGH פתוח) | XS |
| 2 | **H2** Vercel Analytics ON | XS |
| 3 | **H1** נתיב ליד ציבורי + תיקון הלינק | S |
| 4 | **E1** החלת מיגרציות אוטומטית + תיקון RUNBOOK | S |
| 5 | **E2** `version` ב-health deep · **D4** תיעוד שלא מפנה לקובץ מת | XS |

**Exit:** אין alert HIGH; יש מדידת תנועה; פרוספקט יכול ליצור קשר; מיגרציה לא יכולה "להישכח".

---

### Wave 1 — יסודות נכונות (4–5 ימים)
*מטרה: להחזיר את רשתות הביטחון לפני שנוגעים בעוד פיצ׳רים. **הכי חשוב.***

| # | פריט | מאמץ | תלות |
|---|---|---|---|
| 6 | **A1** רג׳נרוט טיפוסים + הסרת 60 `as any` | M | — |
| 7 | **B1** RPC `replace_shift_assignment` | S | A1 |
| 8 | **B2** הגבלת שאילתות בפאנלים | S | A1 |
| 9 | **D1** E2E על המסלול האמיתי מול Staging | M | — |
| 10 | **A2** lint אוסר `as any` | XS | A1 |
| 11 | **D2** הפעלת ה-workflows הרדומים | XS | D1 |

**Exit:** `grep "as any"` = 0 · אין כתיבת שיבוץ מהדפדפן · יש בדיקה אחת שמוכיחה שהמוצר עובד · CI מונע רגרסיה.

---

### Wave 2 — ניקיון וחוסן (5–6 ימים)
*מטרה: להסיר את החוב שיישבר בעומס או יאט כל שינוי עתידי.*

| # | פריט | מאמץ | תלות |
|---|---|---|---|
| 12 | **C1** `lib/shift-time.ts` + tests | M | — |
| 13 | **C2** timezone של הארגון | S | C1 |
| 14 | **B4** אינדקסי FK + 4 policies | S | — |
| 15 | **F1** מחיקת מסלול הדמו הישן | M | **D1** |
| 16 | **B3** צמצום ה-waterfall | M | A1 |
| 17 | **D3** schema validation אמיתית | M | E1 |
| 18 | **A3** normalize search_path · **E5** timing-safe · **E6** ניקוי ענפים | XS | — |

**Exit:** מקור אמת אחד לחישובי זמן · advisors נקי · ~3,000 שורות קוד מת נמחקו · ה-gate בודק משהו אמיתי.

---

### Wave 3 — פני המוצר (4–5 ימים)
*מטרה: מה שהלקוח רואה ומרגיש. אחרי שהיסודות יציבים — לא לפני.*

| # | פריט | מאמץ |
|---|---|---|
| 19 | **G1** מעבר טיפוגרפי (פונט + tracking + סקאלה) | M |
| 20 | **G2** `prefers-reduced-motion` בכל השכבות | S |
| 21 | **G3** תקציב אנימציה (intro, ScrollReveal) | S |
| 22 | **H4** דף הבית במובייל | M |
| 23 | **H3** robots + sitemap · **H5** כותרת PWA | S |
| 24 | **F2** פירוק ה-JSX הצפוף | S |

**Exit:** הכתיבה העברית נראית מכוונת · אין תנועה כפויה · המסך הראשון במובייל נקי.

---

### Wave 4 — הכנסה (7–10 ימים + זמן חיצוני)
| # | פריט |
|---|---|
| 25 | **E4** Vercel Pro *(לפני הלקוח המשלם הראשון)* |
| 26 | **J1** ספק סליקה |
| 27 | **J2** מסך ניהול מנוי + חשבוניות |
| 28 | **J3** אכיפת מכסות |
| 29 | **I1** אשף הקמה מלא |
| — | **J4/J5** ישות עסקית + DPA — *במקביל, חיצוני, להתחיל עכשיו* |

---

## 5. במקביל ובלתי-תלוי

שני דברים לא צריכים להמתין לאף גל, וכדאי להתחיל בהם **היום**:

- **פיילוט עם עסק אמיתי אחד.** `FIRST_BUSINESS_PILOT.md`, `PILOT_PLAYBOOK.md`, `pilot_mode`, `/workspace/pilot-baseline` — הכל בנוי ומחכה. חסר רק הלקוח. זה גם ייתן את הנתון היחיד שלא ניתן להשיג מהשולחן: איפה משתמש אמיתי נתקע.
- **עו״ד ל-DPA + פתיחת עוסק.** זמן חיצוני, לא מושפע מקוד.
- **בירור מצב App Store Connect** (`PROJECT_AUDIT` #3) — התיעוד סותר את הקוד; צריך לדעת מה נשלח לאפל בפועל.

---

## 6. מה **לא** עושים (נדחה במודע)

| פריט | למה |
|---|---|
| מחיקת 25 האינדקסים הלא-בשימוש | "לא בשימוש" ב-93 שורות חסר משמעות. להעריך מחדש אחרי עומס אמיתי. |
| Google Play | בונוס. אפל קודם. |
| החלפת framer-motion | עובד. G2/G3 פותרים את הבעיה בלי החלפה. |
| מיקרו-אופטימיזציות DB | 93 שורות. B2/B4 מספיקים עד 10K. |
| כתיבה מחדש של ה-schedule-builder | הארכיטקטורה תקינה; הבעיה היא גבולות שאילתה וטיפוסים. B2 + A1 פותרים. |

---

## 7. סיכום

**29 פריטים · 4 גלים · ~20–25 ימי עבודה** (לא כולל Wave 4 והתלויות החיצוניות).

הרצף לא שרירותי: **Wave 0** עוצר דימום · **Wave 1** מחזיר את רשתות הביטחון שאבדו כשהמהירות עלתה · **Wave 2** מנקה את מה שיישבר בעומס · **Wave 3** מטפל במה שהלקוח רואה · **Wave 4** מאפשר לגבות כסף.

**התובנה המרכזית משתי הסקירות:** הליבה — מודל הנתונים, ה-RLS, ה-concurrency — מהונדסת ברמה גבוהה. מה שנשבר הוא לא הארכיטקטורה, אלא **המנגנונים ששומרים על הקוד כן**: טיפוסים שלא עודכנו, validator שבודק קובץ מת, בדיקות שבודקות קוד מת. Wave 1 הוא כל התוכנית הזו בזעיר אנפין — הכל אחר-כך זול יותר אחריו.
