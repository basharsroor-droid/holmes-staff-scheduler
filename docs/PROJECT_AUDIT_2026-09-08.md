# סקירת פרויקט ShiftPilot — 8.9.2026

סקירה מלאה של הריפו, GitHub, Vercel, Supabase, האפליקציה החיה, iOS, התיעוד והתהליך.
מקורות: `origin/main` @ `44275cf`, `gh` API, Vercel MCP, Supabase MCP (פרויקט `forstsmvakpsreffdiwb`), סיור חי ב-www.shiftpilothq.com, ו-`docs/מפת-העבודה-ShiftPilot.xlsx`.

> מה **לא** נבדק כאן: ה-workspace המחובר (דורש login), מצב App Store Connect, ותרגול restore בפועל.

---

## שורה תחתונה

**המוצר בנוי, מאובטח, מנוטר ופרוס. אין לו לקוחות.**

| מדד (פרודקשן) | ערך |
|---|---|
| ארגונים | 4 (1 דמו, 3 פנימיים) |
| משתמשי auth | 6 |
| הארגון האחרון שנוצר | **16.8.2026** |
| מנויים (כולם trial פנימי) | 4 |
| טריאלים אמיתיים / לקוחות משלמים | **0 / 0** |
| PR-ים שמוזגו ב-3 השבועות האחרונים | ~40 |

הפער בין קצב הבנייה לקצב ההפצה הוא הבעיה המרכזית של הפרויקט — לא שום באג.

---

## מה טוב

- **אבטחה ברמה גבוהה למוצר בגודל הזה.** 30 טבלאות, 100% עם RLS, 67 policies, 0 טבלאות חשופות. RPC-ים ב-`SECURITY DEFINER` עם `search_path=''`. Leaked-password protection דלוק. Security headers מלאים (HSTS, X-Frame DENY, nosniff, Referrer-Policy, Permissions-Policy). `.env*` ב-gitignore, אין סודות בקוד.
- **CI רציני:** validate:schema → unit → lint → typecheck → build → Playwright, על כל PR ו-push ל-main. Branch protection על main (required check). 0 שגיאות Runtime ב-Vercel ב-7 הימים האחרונים (חוץ מ-idempotency-key אחת בשליחת מייל התראה).
- **תפעול:** גיבוי לילי מוצפן (age) רץ ומצליח, production-health מתוזמן רץ, incident-tabletop רץ על כל PR. Runbook, Incident Response, QA Checklist, Support SOP קיימים.
- **המוצר עשיר:** onboarding, זמינות, סידור, פרסום, החלפות, time-off, open shifts, תבניות, מחלקות, audit log, תמיכה, PWA, iOS wrapper, push notifications.
- **תמחור סגור וחי** (PR #217/#218/#220/#221): 5 מסלולים, בנצ'מרק, מבצע השקה, DB ו-UI מסונכרנים.
- **קוד נקי:** 15.7K שורות TS/TSX, 3 `eslint-disable` בלבד (עם הסבר), 0 TODO/FIXME.

---

## 🔴 חמור / חוסם

### 1. אין ערוץ הפצה, ואין דרך לדעת אם מישהו מגיע
- **Vercel Web Analytics לא מופעל.** אין מדידה של תנועה לאתר או ל-`/pricing`. ה-analytics הפנימי מודד רק אירועים בתוך המוצר.
- **אין `robots.txt` ואין `sitemap.xml`** (שניהם 404). הדף אינדקסבילי אבל לא עוזרים למנועי חיפוש.
- הפיילוט עם הולמס פלייס — "טרם בוצע" לפי מפת העבודה.

### 2. נתיב הליד ל-Enterprise שבור
כפתור "דברו איתנו" בכרטיס Enterprise ב-`/pricing` (וגם לינקים ב-`/demo`) מקשר ל-`/support` — **קונסולת התמיכה הפנימית**, auth-gated. פרוספקט אנונימי מגיע למסך login. אין טופס קשר ציבורי, אין mailto בולט, אין Calendly. לקוח ארגוני שרוצה לדבר איתך — לא יכול.

### 3. סטטוס App Store לא ברור, והתיעוד סותר את הקוד
- מפת העבודה: "In Review מ-2.9".
- `docs/app-store-review-response-guideline-3.2.md` (3.9): תשובה לאפל שמבטיחה כפתור "Create a new business" באפליקציה.
- PR #177 הוסיף את הכפתור; **PR #211 (5.9) הסיר אותו** בגלל Guideline 3.1.1. הקוד הנוכחי: native = login-only (`app/login/page.tsx` מסתיר את לינק ה-onboarding כש-`isNativeApp()`).
- אחרי זה 6 PR-ים של iOS polish + push (7–8.9) — כנראה build חדש.
- **המסמך לאפל מבטיח משהו שהקוד מסיר.** צריך לבדוק ב-App Store Connect את הסטטוס האמיתי ולעדכן את מסמך התשובה ואת מפת העבודה.

### 4. אפס כיסוי E2E למוצר האמיתי
- כל 8 ה-Playwright specs ב-CI (`tests/e2e/`) רצים על `/demo` והמסלולים הישנים (mock-data). `/workspace/*` — הסידור, ההגשות, ההחלפות, ה-onboarding האמיתי — לא מכוסה בשום בדיקה אוטומטית (מלבד assert של redirect לאנונימי).
- ה-workflows שבודקים סביבות אמיתיות — `production-authenticated-e2e`, `staging-critical-e2e`, `staging-support-e2e`, `pilot-readiness` — כולם `workflow_dispatch` בלבד. הראשון רץ לאחרונה ב-21.8; **השאר מעולם לא רצו.**
- 40 PR-ים לשבוע על מוצר שבדיקות הרגרסיה שלו לא רצות.

### 5. פגיעויות תלויות פתוחות
Dependabot: **browserslist HIGH** (#205), @xmldom/xmldom MEDIUM (#173), postcss-selector-parser LOW (#174), uuid MEDIUM (transitive, ללא PR). כולם devDeps — לא מסוכן בפרודקשן, אבל HIGH פתוח 5 ימים.

---

## 🟠 צריך תיקון

6. **שני UI-ים מקבילים.** `/manager`, `/employee`, `/schedule`, `/availability`, `/swap-requests`, `/my-shifts`, `/manager-requests`, `/admin/*` (~10 עמודים) + `lib/mock-data.ts` (304 שורות) + `components/forms/manager-schedule-builder.tsx` (400 שורות) = ה-demo mode הישן על mock data, חי במקביל ל-`/workspace/*` האמיתי (שיש לו `schedule-builder-client.tsx` משלו, 394 שורות). כל שינוי UX צריך להיעשות פעמיים, או שהדמו מתרחק מהמוצר. הדמו כבר לא מייצג את המוצר.

7. **מיגרציות לא מוחלות אוטומטית במיזוג.** אומת היום: `public.plans` נשאר ישן אחרי merge של #217 עד להחלה ידנית דרך `apply_migration`. `docs/RUNBOOK.md` סותר את עצמו — שורה 9 (נכון: לא אוטומטי) מול שורה 44 (שגוי: "מוחל אוטומטית"). כל PR עם מיגרציה = צעד ידני שקל לשכוח.

8. **Supabase performance advisors:**
   - 4 policies עם `auth.uid()` לא עטוף ב-`(select ...)` — re-evaluated לכל שורה: `open_shift_requests` (×2), `schedule_templates`, `schedule_template_items`.
   - 9 FK ללא אינדקס על `push_devices`, `push_delivery_queue`, `schedule_templates`, `schedule_template_items` — הטבלאות החדשות מ-4–8.9.
   - 25 אינדקסים שמעולם לא שומשו.
   - Auth DB connections = 10 absolute (מומלץ אחוזי).
   - `push_devices` / `push_delivery_queue`: RLS enabled ללא policies. בטוח (deny-all; ה-API משתמש ב-service role), אבל כדאי לתעד שזה מכוון.

9. **`docs/ARCHITECTURE.md` מיושן** (21.8). חסרים: plans/subscriptions, schedule cadence, time-off, open shifts, schedule templates, shift marketplace, pilot mode, push notifications.

10. **`/api/health?deep=1` לא מחזיר `version`** — רק ה-shallow מחזיר. ה-Runbook (Smoke step 1) מצפה לאמת commit; זה עובד רק בלי `deep`.

11. **99 ענפים ב-remote** — 13 ממוזגים לגמרי ועוד עשרות squash-merged. ניקוי.

12. **Vercel Hobby.** לפי ה-ToS של Vercel אסור שימוש מסחרי ב-Hobby. ברגע שיש לקוח משלם — Pro ($20/ח׳). לא מופיע במפת ההוצאות.

13. הפרויקט ב-Vercel נקרא `shiftpilot-demo`. קוסמטי, מבלבל.

---

## 🟡 שיפור / עיצוב

14. **אנימציות כבדות בכל מקום.** intro overlay 3.6 שניות בכניסה ראשונה, framer-motion על `/login`, blur-reveal על ה-hero, `ScrollReveal` על כל סקשן. `prefers-reduced-motion` מכובד רק ב-intro (`site-intro.tsx`) — **לא ב-framer** (אין `useReducedMotion` / `MotionConfig` בקוד). בעיית נגישות + כבדות.
    *הערה:* בגלל זה צילומי מסך מטאב רקע נראו "שבורים" (אנימציות מוקפאות). אומת ב-DOM: הכל תקין. אין באג רינדור ב-`/login` או ב-hero.

15. **דף הבית במובייל:** רווח לבן גדול מתחת ל-navbar, ואז 2 CTA + sticky bar עם עוד 2 CTA = 4 כפתורים זהים במסך אחד. זה ה"עמוס ודחוס" שדובר עליו ב-19.8 — עדיין שם. ראו `deferred-design-cleanup` בזיכרון.

16. **פונט.** `--font: Arial, Noto Sans Hebrew`. Arial לכותרות עבריות גדולות — ברירת מחדל, לא בחירה. ה-tracking השלילי ששבר את כותרת `/pricing` (PR #220) כנראה קיים גם ב-`.pro-hero h1` ובכותרות אחרות.

17. `apple-mobile-web-app-title: "SP"` (`lib/app-config.ts` → `shortName`). כותרת ה-PWA על מסך הבית היא "SP". עדיף "ShiftPilot".

18. אין FAQ ציבורי לתמיכה ואין דף קשר ציבורי (ראו #2).

19. עם sitemap צריך לוודא ש-`/workspace/*`, `/demo`, `/support`, `/pilot`, `/manager`, `/employee` לא באינדקס.

---

## סקירה לפי מערכת

| מערכת | מצב | הערות |
|---|---|---|
| **קוד** | 🟢 | 15.7K שורות, 54 routes, 41 קומפוננטות, 24 lib, 58 מיגרציות, 7 unit tests. חוב: UI כפול (#6). |
| **GitHub** | 🟡 | CI מצוין. 3 Dependabot פתוחים (#5). 99 ענפים (#11). Contributor יחיד, reviews=0, enforce_admins=false. |
| **Vercel** | 🟡 | Prod תקין, 0 שגיאות ב-7 ימים. **אין Web Analytics** (#1). Hobby plan (#12). SSO protection על previews (`all_except_custom_domains`). |
| **Supabase** | 🟢 | Pro. 30 טבלאות, RLS מלא. Staging branch קיים. 4 perf WARN + 9 FK ללא index (#8). 57 מיגרציות מוחלות. |
| **iOS / App Store** | 🔴❓ | App ID 6803401252, bundle `com.shiftpilothq.app`. סטטוס לא ידוע. תיעוד סותר קוד (#3). Push עובד (#215). |
| **תיעוד** | 🟡 | 15 מסמכים ב-`docs/`. ARCHITECTURE מיושן (#9), RUNBOOK סותר עצמו (#7), App Review doc מיושן (#3). |
| **מפת עבודה** | 🟡 | מעודכנת עד היום. "In Review" ו"שלב 5 · 4/14" לא משקפים שאין לקוח. |
| **בדיקות** | 🔴 | e2e רק על דמו (#4). Production spec ידני, רץ לאחרונה 21.8. |

---

## מצב לפי שלבי הלוז (מפת העבודה)

| שלב | מצב במפה | הערכה |
|---|---|---|
| 0–4 · בסיס, אבטחה, פיילוט פנימי, מיילים, לוגיקה עסקית | ✅ | אמיתי. |
| 5 · שכבה מסחרית | 4/14 | תמחור ✅. חסר: סליקה, מסך חיוב, ניהול מנוי, DPA, ישות עסקית, חשבוניות. **אי אפשר לגבות שקל.** |
| 6 · ניטור וחוסן | 4/13 | ניטור ✅. חסר: תרגול restore, e2e על המוצר האמיתי. |
| 7 · אפליקציה | 2/3 | wrapper עובד. פרסום תלוי באפל — סטטוס לא ברור. |
| — · הפצה ומכירה | **אין שלב כזה במפה** | זה הפער. |

---

## השלב הבא

**להפסיק לבנות פיצ'רים לחודש.** יש יותר מוצר ממה שלקוח ראשון צריך.

### שבוע 1 — לסגור דליפות (2–3 ימי עבודה)
1. טופס "דברו איתנו" ציבורי (או Calendly / mailto בולט) + לתקן את הלינק ב-Enterprise ל-`/pricing`. (#2)
2. Vercel Web Analytics ON + `app/robots.ts` + `app/sitemap.ts`. (#1, #19)
3. לבדוק App Store Connect; לעדכן את `app-store-review-response-guideline-3.2.md` שיתאים ל-#211; לעדכן את מפת העבודה. (#3)
4. למזג 3 Dependabot PRs. (#5)
5. RUNBOOK שורה 44 + `version` ב-health deep. (#7, #10)

### שבוע 2 — לקוח אחד אמיתי
6. **פיילוט בפועל** (הולמס פלייס או כל עסק). `FIRST_BUSINESS_PILOT.md`, `PILOT_PLAYBOOK.md`, `pilot_mode`, `/workspace/pilot-baseline` — הכל מוכן, חסר רק לקוח. זה הדבר היחיד שישנה את ה-0.
7. במקביל: `production-authenticated-e2e` על schedule שבועי + spec אחד ל-`/workspace` core flow (הגשה → סידור → פרסום). (#4)

### שבוע 3–4 — כסף
8. סליקה (Stripe הכי מהיר; Tranzila/Cardcom אם צריך חשבונית ישראלית מובנית) + מסך חיוב מינימלי + קופון מבצע ההשקה (ראו `PRICING_BENCHMARK.md` §4). עוסק מורשה לפני. DPA — עו"ד, במקביל.
9. Vercel Pro לפני הלקוח המשלם הראשון. (#12)

### אחרי שיש לקוח משלם
10. Design pass (#14–#16), ניקוי ה-UI הכפול (#6), advisors (#8), ARCHITECTURE (#9), ניקוי ענפים (#11).

---

## נספח — נתונים גולמיים

- **PR-ים פתוחים:** #205, #174, #173 (Dependabot).
- **Workflows:** `ci` (PR/push), `production-health` (schedule ✅ 8.9), `database-backup` (schedule ✅ 8.9), `notification-delivery` (schedule ✅ 8.9), `incident-tabletop` (PR ✅ 8.9), `production-authenticated-e2e` (dispatch, 21.8), `staging-critical-e2e` / `staging-support-e2e` / `pilot-readiness` (dispatch, מעולם לא רצו).
- **Vercel:** project `prj_Eu8hfFgHi3MS8R8MKOUDaEoURS6A`, team `team_WGbe2zCOeZtwGkShl23PJxkM`, Node 24, latest prod `4a664a2` READY.
- **Supabase advisors (security):** 2× `rls_enabled_no_policy` (push_*), 23× `authenticated_security_definer_function_executable` (מכוון, לפי ARCHITECTURE).
- **Supabase advisors (performance):** 9× unindexed FK, 4× auth_rls_initplan, 25× unused index, 1× auth connections absolute.
- **תלויות:** next 16.3.0, react 18.3.1, @supabase/supabase-js 2.112.1, @capacitor/* 8.x, zod 4.4.3.
- **מבנה ריפו:** `app/` 110 קבצים, `supabase/` 60, `components/` 41, `ios/` 35, `lib/` 25, `docs/` 22, `tests/` 16, `scripts/` 12.
