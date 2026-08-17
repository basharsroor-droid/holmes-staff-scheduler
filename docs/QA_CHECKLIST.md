# QA — סגירת גרסת הדמו/פיילוט

מבוסס על `01_Product_Demo_QA_Plan_AR.docx` (מסלול P0-01). מטרת המסלול: הדגמה של 7–10 דקות בלי שום תקלה פונקציונלית או ויזואלית, ובלי להסביר על משהו לא גמור. ראו גם [RUNBOOK.md](./RUNBOOK.md) — ה-Release checklist שם מכסה את מנגנון ה-deploy עצמו; זה כאן מכסה את **חוויית** הדמו/הפיילוט, שהיא בדיקה שונה.

## מטריצת Page × Role × Device × State

לא מטריצה תיאורטית — ממופה ישירות מול 22 ה-routes הקיימים ומול הכיסוי האוטומטי שכבר רץ ב-CI (`tests/e2e/*.spec.ts`). "✓ אוטומטי" = יש בדיקת Playwright שרצה על כל push; "ידני" = לא מכוסה אוטומטית, דורש עובר-אורח לפני דמו.

| אזור | Routes | תפקידים | מובייל | Desktop | Loading/Empty/Error/Success |
|---|---|---|---|---|---|
| ציבורי + שיווקי | `/`, `/privacy`, `/terms` | — | ✓ אוטומטי (`responsive-layout`) | ✓ אוטומטי (`public-and-auth`, `accessibility`) | ידני (empty/error לא רלוונטי לעמוד סטטי) |
| הרשמה/כניסה | `/login`, `/onboarding`, `/auth/*` | owner (חדש) | ✓ אוטומטי | ✓ אוטומטי (`public-and-auth`) | ✓ אוטומטי — טוקן פג, סיסמה ריקה (`public-and-auth`) |
| כניסת דמו | `/demo` | manager, employee | ✓ אוטומטי | ✓ אוטומטי (`responsive-layout`) | ✓ אוטומטי (`demo-roles`) |
| מסלול מנהל בדמו | `/pilot`, `/manager`, `/manager-requests`, `/manager/schedule` | manager | ✓ אוטומטי (`responsive-layout`) | ✓ אוטומטי (`demo-workflows`) | ידני — success מכוסה, error/empty לא |
| מסלול עובד בדמו | `/employee`, `/my-shifts`, `/availability`, `/swap-requests` | employee | ✓ אוטומטי (`responsive-layout`) | ✓ אוטומטי (`demo-workflows`) | ידני — success מכוסה, error/empty לא |
| Workspace — ליבה | `/workspace`, `/workspace/schedule-builder`, `/workspace/departments`, `/workspace/employees` | owner/admin/manager (מסונן-מחלקה) | ידני | ידני (כוסה בביקורת נגישות/מובייל חד-פעמית, לא ב-CI רץ) | ידני |
| Workspace — עובד | `/workspace/availability`, `/workspace/my-shifts`, `/workspace/shift-swaps`, `/workspace/submissions` | employee | ידני | ידני | ידני |
| Workspace — תפעול | `/workspace/audit-log`, `/workspace/notifications`, `/workspace/shift-templates`, `/workspace/work-months` | owner/admin/manager | ידני | ידני | ידני |
| תמיכה | `/support`, `/workspace/support`, `/workspace/help` | support agent / כולם | ידני | ידני | ✓ חלקי — פילטרים נבדקו ידנית ב-PR #125 |

**המסקנה מהמטריצה:** האזור הציבורי, האותנטיקציה והדמו (manager/employee) כבר עם כיסוי CI רציף. כל אזור ה-`/workspace` האמיתי (13 routes, מסונן-הרשאות ומסונן-מחלקה) עדיין נבדק רק ידנית, בביקורות חד-פעמיות (נגישות ב-PR #81, מובייל ב-PR #85–88) — לא בכל push. זו הפער המרכזי בין המצב היום לדרישת התוכנית.

## מסלול הבדיקה המרכזי (חייב להצליח 3 פעמים רצופות לפני דמו)

1. הרשמה/onboarding → יצירת עסק וסניף ראשון.
2. הזמנת עובד → קבלת הזמנה → כניסה ראשונה + החלפת סיסמה.
3. יצירת סוג משמרת + חודש עבודה + חלון הגשה.
4. הגשת זמינות כעובד.
5. בניית סידור ופרסום כמנהל.
6. "המשמרות שלי" כעובד.
7. בקשת החלפה → אישור עובד יעד → אישור מנהל.
8. ניווט למרכז העזרה/תמיכה ופתיחת פנייה.

**קריטריון סגירה:** המסלול הזה מצליח 3 פעמים רצופות, אפס תקלת P0/P1 פתוחה, לפני שמראים למישהו את הדמו. לא בוצע כתרגול פורמלי נפרד — אבל בפועל רץ בהצלחה לפחות פעם אחת מקצה לקצה תוך כדי הפיתוח (שלב 2 ב[מפת הדרך](https://claude.ai/code/artifact/9a06ea37-4836-45e8-870a-dfbab53bfdc3), עם 5 באגים אמיתיים שנתפסו ותוקנו בדרך).

## Regression checklist — לפני שמראים דמו למישהו (לא deploy, חוויה)

- [ ] המסלול המרכזי למעלה רץ פעם אחת נקי, עכשיו, לא "עבד שבוע שעבר".
- [ ] אין טקסט קטוע/גולש באף עמוד ב-1280px, 768px, 375px (הרוחבים שנבדקים ב-`responsive-layout.spec.ts`).
- [ ] `npx playwright test tests/e2e/` מלא (לא רק שלוש החבילות שרצות לפני כל push) — כולל `demo-roles`, `demo-workflows`, `security-boundaries`.
- [ ] `/api/health?deep=1` מחזיר `ok` מול הפרודקשן החי.
- [ ] סביבת הדמו אופסה (`reset_demo_environment()`) כדי שהמצב יהיה נקי ולא שריד מהדגמה קודמת.
- [ ] אין P0/P1 פתוח ב-GitHub Issues (או ברשימת ה-TODO הידנית) שקשור למסלול המוצג.

## מה עדיין חסר מול התוכנית (P0-01)

- [ ] כיסוי E2E רציף (לא רק ביקורת חד-פעמית) לאזור `/workspace` האמיתי — 13 routes, כרגע לא ב-CI.
- [ ] הרצת ה-Regression checklist למעלה בפועל, לא רק כתיבתו.
- [ ] "3 הצלחות רצופות" כתרגול מתועד, לא רק ריצה בודדת תוך כדי פיתוח.
