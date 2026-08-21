# ניטור, שגיאות ו־Analytics

ShiftPilot משתמשת בשכבת observability פנימית כדי לא להיות תלויה בחשבון Sentry או PostHog חיצוני בשלב הדמו. הנתונים נשמרים ב־Supabase תחת RLS ומוצגים רק לנציגי התמיכה המורשים במסוף `/support`.

## שגיאות

- `ClientObservability` מאזין ל־`window.error` ול־`unhandledrejection`.
- גבולות השגיאה של Next.js מדווחים גם על תקלות route ו־global.
- הדיווח נשלח רק ב־Production, לא בפיתוח מקומי.
- כתובות מייל, Bearer tokens, JWT ומחרוזות ארוכות שנראות כמו secrets מוסרים לפני שמירה.
- query strings ו־fragments אינם נשמרים; נשמר רק pathname.
- אותה תקלה מדווחת פעם אחת בכל session בדפדפן, והתראת מייל נשלחת לכל היותר פעם אחת בכל 15 דקות לכל fingerprint.
- האירועים נמחקים לאחר 90 יום באמצעות worker ההתראות.

## מילון אירועי מוצר

האירועים נוצרים בטריגרים של מסד הנתונים, ולכן אינם תלויים בכפתור או בדפדפן מסוים. אין בהם שמות עובדים, הערות, טקסט תמיכה או תוכן סידור.

| Event | מתי נרשם |
|---|---|
| `invite_created` | נוצרה הזמנה לעובד |
| `availability_submitted` | עובד הגיש זמינות |
| `schedule_published` | סידור פורסם |
| `swap_requested` | נפתחה בקשת החלפה |
| `swap_approved` | בקשת החלפה אושרה |
| `swap_rejected` | בקשת החלפה נדחתה |
| `swap_cancelled` | בקשת החלפה בוטלה |

## הרשאות ופרטיות

- למשתמשי `authenticated` ו־`anon` אין הרשאת insert/update/delete על `operational_events`.
- רק service role וטריגרים מוגנים כותבים אירועים.
- רק משתמש שנמצא ב־`platform_support_agents` יכול לקרוא את הזרם.
- נתוני השימוש נועדו למדדי פיילוט ולתפעול בלבד, לא לפרסום או לפרופיילינג של עובדים.
