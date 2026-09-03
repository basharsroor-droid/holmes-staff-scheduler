import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LifeBuoy, Search } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type FaqItem = { question: string; answer: string };
type FaqCategory = { title: string; items: FaqItem[] };

// Real, grounded troubleshooting content -- every answer below describes
// actual current product behavior (verified against the code, not
// invented), so a customer who follows it gets a real answer instead of
// generic boilerplate. Kept in the same 5 categories as the support
// ticket form (technical/account/billing/feature/other) so the mapping
// from "didn't find an answer here" to "which category to pick" is obvious.
const categories: FaqCategory[] = [
  {
    title: "חשבון והרשאות",
    items: [
      {
        question: "שכחתי את הסיסמה שלי, מה עושים?",
        answer: "בעמוד הכניסה יש קישור \"שכחתי סיסמה\". לוחצים עליו, מזינים את כתובת המייל, ומגיע מייל איפוס מ-notifications@updates.shiftpilothq.com (כדאי לבדוק גם בתיקיית הספאם). הקישור במייל תקף לזמן מוגבל."
      },
      {
        question: "לא קיבלתי מייל הזמנה, או שהקישור בו כבר לא עובד",
        answer: "הזמנות תקפות ל-7 ימים. בקשו מהמנהל/ת שלכם להיכנס ל\"ניהול עובדים\" ולבצע \"שליחה חוזרת\" על ההזמנה שלכם — זה יוצר קישור חדש עם תוקף חדש, בלי לפתוח הזמנה כפולה."
      },
      {
        question: "אני לא רואה מחלקה או סניף שאני בטוח/ה שאמורים להיות לי",
        answer: "הגישה במערכת מדורגת: בעל מחלקה רואה רק את המחלקה שלו, ואילו בעל העסק או מנהל הסניף רואה את כל המחלקות והסניפים. אם משהו נראה חסר, זו כנראה רמת הרשאה מכוונת ולא תקלה — לבדוק מול המנהל/ת איזו רמת גישה הוגדרה לכם."
      },
      {
        question: "הושעיתי או שהעובד שלי הושעה — מה קורה לסידור?",
        answer: "השעיית עובד מסירה אוטומטית את כל השיבוצים העתידיים שלו מהסידור, אבל משמרות עבר נשארות בהיסטוריה כמו שהיו. עובד מושעה מאבד גישה מיידית לכל המסכים בסביבת העבודה."
      }
    ]
  },
  {
    title: "תקלה טכנית",
    items: [
      {
        question: "עדכנו משהו במערכת אבל אצלי זה עדיין נראה ישן",
        answer: "כמעט תמיד זו בעיית cache של הדפדפן, לא תקלה אמיתית. רענון קשיח (Ctrl+Shift+R בווינדוס, Cmd+Shift+R במאק) בדרך כלל פותר את זה. אם זה ממשיך, אפשר לנסות לפתוח בחלון גלישה בסתר כדי לוודא."
      },
      {
        question: "לא הצלחתי לפרסם את הסידור",
        answer: "לפני פרסום, לוודא שלכל המשמרות הפעילות בחודש יש לפחות שיבוץ אחד (או שהן סומנו כבוטלו במפורש). המערכת חוסמת פרסום של חודש עם משמרות פתוחות ללא שיבוץ ובלי סימון."
      },
      {
        question: "ניסיתי להגיש זמינות ולא הצליח",
        answer: "הגשת זמינות אפשרית רק בתוך חלון ההגשה שהמנהל/ת פתח/ה לאותו חודש (יש תאריך פתיחה וסגירה). אחרי מועד הסגירה ההגשה ננעלת אוטומטית, גם אם עדיין לא סימנתם הכול — לפנות למנהל/ת אם צריך הארכה."
      },
      {
        question: "ביקשתי החלפת משמרת ולא קרה כלום",
        answer: "בקשת החלפה דורשת שני אישורים ברצף: קודם העובד/ת שאיתו רוצים להחליף, ורק אחר כך אישור סופי של המנהל/ת. הסידור מתעדכן רק אחרי שני האישורים — אפשר לעקוב אחר הסטטוס במסך \"החלפת משמרת\"."
      }
    ]
  },
  {
    title: "חיוב ותשלום",
    items: [
      {
        question: "איך מתבצע חיוב על השימוש?",
        answer: "כל עסק מתחיל ב-30 ימי ניסיון ללא כרטיס אשראי. אחרי הניסיון בוחרים מסלול בתשלום לפי גודל העסק — הפירוט המלא בעמוד התמחור באתר (shiftpilothq.com/pricing). כל המחירים כרגע הם מחירי השקה. לשאלות על חיוב אפשר לפתוח פנייה בקטגוריית \"חיוב ותשלום\"."
      },
      {
        question: "מה קורה כשתקופת הניסיון נגמרת?",
        answer: "אם רוכשים מנוי, העבודה נמשכת כרגיל ללא אובדן מידע. אם לא — החשבון עובר לצפייה בלבד, המידע נשמר לפחות 60 יום, ואפשר לשלם ולהפעיל אותו מחדש מאותה נקודה בכל עת."
      }
    ]
  },
  {
    title: "הצעה לשיפור",
    items: [
      {
        question: "יש לי רעיון לפיצ'ר או שיפור — לאן שולחים?",
        answer: "בדיוק בשביל זה קיימת קטגוריית \"הצעה לשיפור\" בטופס הפנייה למטה. כל הצעה נקראת בפועל — פרטו במה מדובר ובאיזה תרחיש זה עוזר לכם."
      }
    ]
  },
  {
    title: "כללי",
    items: [
      {
        question: "איך מדווחים על חופשה או מחלה?",
        answer: "במסך \"הגשת זמינות\" יש אזור נפרד לחופשה ומחלה, לא תלוי בחלון ההגשה החודשי — מדווחים טווח תאריכים, וזה חוסם שיבוץ אוטומטי לתאריכים האלה בלי צורך באישור מנהל מראש."
      },
      {
        question: "אפשר להוסיף את המשמרות שלי ליומן Google?",
        answer: "כן — במסך \"המשמרות שלי\" יש קישור הוספה ליומן ליד כל משמרת שפורסמה."
      }
    ]
  }
];

export default async function HelpPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("organization_memberships")
    .select("organization_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (!membership) redirect("/workspace");

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-subheader"><div>
      <Link href="/workspace/support" className="back-link"><ArrowRight size={17} /> חזרה למרכז התמיכה</Link>
      <p className="eyebrow">עזרה ושירות</p>
      <h1><Search /> שאלות ותקלות נפוצות</h1>
      <p>הרבה דברים אפשר לפתור לבד תוך דקה, בלי לחכות לתשובה. אם לא מצאתם תשובה כאן — <Link href="/workspace/support">פתחו פנייה במרכז התמיכה</Link>.</p>
    </div></header>
    <div className="help-center">
      {categories.map((category) => <section className="template-list-card help-category" key={category.title}>
        <h2>{category.title}</h2>
        <div className="faq-grid help-faq-grid">
          {category.items.map((item) => <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>)}
        </div>
      </section>)}
      <section className="template-list-card help-category help-fallback">
        <LifeBuoy size={28} />
        <div>
          <h2>לא מצאתם תשובה?</h2>
          <p>פתחו פנייה במרכז התמיכה — נענה בהקדם. ככל שתתארו במדויק מה ניסיתם לעשות ומה קרה בפועל, כך נוכל לעזור מהר יותר.</p>
          <Link className="button primary" href="/workspace/support">מעבר למרכז התמיכה</Link>
        </div>
      </section>
    </div>
  </main>;
}
