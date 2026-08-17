import Link from "next/link";
import { ArrowLeft, BarChart3, Building2, CalendarCheck, CalendarRange, Clock3, LockKeyhole, Repeat2, ShieldCheck, UserPlus } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { CinematicHero } from "@/components/marketing/cinematic-hero";
import { RolesShowcase } from "@/components/marketing/roles-showcase";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { ScrollToTop } from "@/components/marketing/scroll-to-top";
import { SiteNavbar } from "@/components/marketing/site-navbar";

const capabilities = [
  { icon: CalendarCheck, title: "כל הזמינות במקום אחד", text: "כל עובד מסמן מועדפת, זמין, רק אם צריך או לא זמין — והמנהל מקבל תמונה מסודרת לחודש." },
  { icon: CalendarRange, title: "שיבוץ לפי מה שהוגש", text: "רואים את זמינות העובדים לצד המשמרות והתקנים, ומשבצים על בסיס מידע עדכני." },
  { icon: Repeat2, title: "החלפות בתהליך ברור", text: "העובד השני מאשר, המנהל נותן אישור סופי וכל שינוי נשמר ומתועד במערכת." },
  { icon: UserPlus, title: "צוות, סניפים ומחלקות", text: "מזמינים עובדים במייל ומשייכים כל אחד לסניף, למחלקה, לתפקיד ולהרשאות המתאימות." },
  { icon: BarChart3, title: "תמונה ברורה לפני הפרסום", text: "רואים מי הגיש, מי עדיין חסר, אילו משמרות דורשות שיבוץ ומה מצב הסידור לפני שמפרסמים." },
  { icon: ShieldCheck, title: "גישה לפי עסק ותפקיד", text: "כל עסק פועל בסביבה נפרדת, וכל משתמש מקבל גישה לפי הארגון, הסניף והתפקיד שלו." }
];

const setupSteps = [
  { n: "01", title: "פתיחת חשבון עסקי", text: "נרשמים עם שם ומייל, מאמתים את הכתובת ומקבלים סביבת עבודה נפרדת לעסק." },
  { n: "02", title: "הגדרת העסק והמשמרות", text: "מוסיפים סניפים ומחלקות ומגדירים את סוגי המשמרות, השעות ומספר העובדים הנדרש." },
  { n: "03", title: "הזמנת הצוות", text: "שולחים לכל עובד הזמנה מאובטחת במייל. כל משתמש נכנס ישירות לסביבה ולתפקיד המתאימים לו." },
  { n: "04", title: "פתיחת חודש עבודה", text: "בוחרים חודש, קובעים מועד אחרון להגשה והעובדים ממלאים את הזמינות שלהם גם מהטלפון." },
  { n: "05", title: "שיבוץ ופרסום", text: "בונים את הסידור בהתאם לזמינות שהוגשה, משלימים את השיבוצים ומפרסמים אותו לצוות." }
];

export default function HomePage() {
  return <main className="marketing-site" dir="rtl">
    {/* Absolute (not fixed) -- sits at the very top of the page without
        taking up flow space (so it doesn't push the Hero's h-screen down),
        but unlike `fixed` it scrolls away normally with the page instead of
        staying glued to the viewport and covering the pinned Hero card
        while scrolling through it. */}
    <div className="marketing-navbar-shell absolute inset-x-0 top-0 z-40">
      <SiteNavbar />
    </div>

    <CinematicHero />
    <ScrollToTop />

    <section className="proof-strip" tabIndex={0} aria-label="עסקים שעובדים במשמרות">
      <div className="proof-strip-track">
        <span>מסעדות</span><i /> <span>חדרי כושר</span><i /> <span>חנויות</span><i /> <span>מוקדי שירות</span><i /> <span>מרפאות</span><i /> <span>צוותי תפעול</span>
        {/* Exact duplicate so the marquee can loop seamlessly (translateX(-50%)
            lands precisely on the real set's end). aria-hidden goes on each
            element directly, not on a display:contents wrapper -- verified
            that combination is NOT reliably excluded from the accessibility
            tree, so a screen reader would otherwise read every business type
            twice in a row. */}
        <span aria-hidden="true">מסעדות</span><i aria-hidden="true" /> <span aria-hidden="true">חדרי כושר</span><i aria-hidden="true" /> <span aria-hidden="true">חנויות</span><i aria-hidden="true" /> <span aria-hidden="true">מוקדי שירות</span><i aria-hidden="true" /> <span aria-hidden="true">מרפאות</span><i aria-hidden="true" /> <span aria-hidden="true">צוותי תפעול</span>
      </div>
    </section>

    <section className="pro-section problem-section">
      <div className="section-glow blue" style={{ width: 420, height: 420, top: -140, left: -80 }} aria-hidden="true" />
      <ScrollReveal className="section-heading"><p className="pro-kicker dark">למה ShiftPilot?</p><h2>הבעיה היא לא הסידור. הבעיה היא קבוצת הוואטסאפ, האקסל הישן וההודעות שאף אחד לא זוכר אם ענה עליהן.</h2><p>כל שינוי הופך לשרשור הודעות חדש. כל גרסה של הסידור מתחרה בגרסה הקודמת. ואף אחד לא בטוח איזו מהן הנכונה.</p></ScrollReveal>
      <div className="comparison-grid">
        <ScrollReveal className="comparison-card old"><small>היום</small><h3>וואטסאפ, אקסל וזיכרון</h3><ul><li>עשרות הודעות זמינות מפוזרות בקבוצות וואטסאפ, SMS ושיחות טלפון</li><li>העתקה ידנית לאקסל, ללוח מחיק או לדף מודפס</li><li>התנגשויות וחוסרים שמתגלים רק כשהעובד כבר לא הגיע</li><li>החלפות משמרת בלי תיעוד — מי בעצם אישר את זה?</li></ul></ScrollReveal>
        <ScrollReveal className="comparison-card new" delay={120}><small>עם ShiftPilot</small><h3>כל הזמינות, במקום אחד</h3><ul><li>טופס אחד לכל העובדים — בלי קבוצות וואטסאפ נפרדות</li><li>תמונת מצב מיידית: מי הגיש, מי חסר, איפה יש חור בסידור</li><li>שיבוץ לפי זמינות ותקנים, לא לפי מי שהתקשר אחרון</li><li>כל החלפה עוברת אישור מתועד — תמיד יודעים מי אישר מה</li></ul></ScrollReveal>
      </div>
    </section>

    <section className="pro-section process-section" id="how">
      <ScrollReveal className="section-heading centered"><p className="pro-kicker dark">מהרשמה לסידור ראשון</p><h2>חמישה שלבים פשוטים להפעלת המערכת</h2><p>אין צורך בהטמעה טכנית או באיש IT. מגדירים את סביבת העבודה באופן עצמאי, מזמינים את הצוות ומתקדמים לסידור הראשון — בתהליך ברור ומסודר.</p></ScrollReveal>
      <div className="process-timeline">{setupSteps.map((step,index) => <ScrollReveal className="process-step" delay={index*70} key={step.n}><b>{step.n}</b><div><h3>{step.title}</h3><p>{step.text}</p></div></ScrollReveal>)}</div>
    </section>

    <RolesShowcase />

    <section className="pro-section example-section" id="example">
      <ScrollReveal className="section-heading centered"><p className="pro-kicker dark">סידור שמתאים לאופן העבודה שלכם</p><h2>פתיחה, אמצע או סגירה — אתם מגדירים</h2><p>לכל סוג משמרת מגדירים שעות, מספר עובדים ודרישות מיוחדות. זו דוגמה למבנה אפשרי — כל עסק מתאים אותו לצרכים שלו.</p></ScrollReveal>
      <ScrollReveal className="example-table-wrap" tabIndex={0} role="region" aria-label="דוגמת מבנה משמרות"><table className="example-table"><thead><tr><th>משמרת</th><th>שעות</th><th>מספר עובדים</th><th>דרישה מיוחדת</th><th>זמינות לדוגמה</th></tr></thead><tbody><tr><td><b>פתיחה</b></td><td>06:00–14:00</td><td>2 עובדים</td><td>עובד אחד מורשה פתיחה</td><td><span className="status preferred">מועדפת</span></td></tr><tr><td><b>אמצע</b></td><td>10:00–18:00</td><td>1 עובד</td><td>ללא</td><td><span className="status available">זמין</span></td></tr><tr><td><b>סגירה</b></td><td>14:00–22:00</td><td>2 עובדים</td><td>עובד בכיר / מורשה סגירה</td><td><span className="status needed">רק אם צריך</span></td></tr></tbody></table><div className="example-note"><Clock3 /><span><strong>המבנה נשאר גמיש</strong><small>אפשר להוסיף, לשנות או להסיר סוגי משמרות בהתאם לעונה, לסניף ולצורכי העסק.</small></span></div></ScrollReveal>
    </section>

    <section className="pro-section features-section">
      <div className="section-glow violet" style={{ width: 380, height: 380, top: -120, right: -60 }} aria-hidden="true" />
      <ScrollReveal className="section-heading centered"><p className="pro-kicker dark">יכולות המוצר</p><h2>כל מה שצריך, לאורך כל תהליך הסידור</h2></ScrollReveal>
      <div className="capability-grid">{capabilities.map((item,index)=><ScrollReveal className="capability-card" delay={(index%3)*70} key={item.title}><item.icon /><h3>{item.title}</h3><p>{item.text}</p></ScrollReveal>)}</div>
    </section>

    <section className="pro-section security-section" id="security">
      <ScrollReveal className="security-copy"><p className="pro-kicker">הרשאות והפרדת מידע</p><h2>הגישה למידע נקבעת לפי העסק והתפקיד.</h2><p>כל משתמש מקבל גישה בהתאם לארגון, לסניף ולתפקיד שלו. העובדים רואים את המידע הנדרש להם, המנהלים פועלים בתוך תחומי האחריות שלהם ובעל העסק שולט בהרשאות.</p><div><span><LockKeyhole /> כניסה מאובטחת ואימות מייל</span><span><ShieldCheck /> הרשאות לפי תפקיד וסניף</span><span><Building2 /> הפרדה בין סביבות עבודה</span></div></ScrollReveal>
      <ScrollReveal className="security-visual" delay={120}><ShieldCheck /><span><b>RLS</b><small>Row Level Security</small></span><i /><span><b>Roles</b><small>Owner · Manager · Employee</small></span><i /><span><b>Audit</b><small>פעולות והחלטות מתועדות</small></span></ScrollReveal>
    </section>

    <section className="pro-section faq-section"><ScrollReveal className="section-heading"><p className="pro-kicker dark">שאלות נפוצות</p><h2>לפני שמתחילים</h2></ScrollReveal><div className="faq-grid"><details open><summary>האם צריך להוריד אפליקציה?</summary><p>לא. ShiftPilot פועלת ישירות בדפדפן בטלפון ובמחשב, וכל משתמש נכנס לסביבה שלו באמצעות חשבון מאובטח.</p></details><details><summary>אפשר להתאים את המשמרות לכל עסק?</summary><p>כן. אפשר להגדיר שמות, שעות, מספר עובדים ודרישות מיוחדות בהתאם לסניף, לעונה ולאופן העבודה של העסק.</p></details><details><summary>איך מתבצעת החלפת משמרת?</summary><p>העובד שולח בקשה, העובד המחליף מאשר והמנהל נותן אישור סופי. הסידור מתעדכן רק לאחר השלמת התהליך.</p></details><details><summary>אפשר לנהל כמה סניפים ומחלקות?</summary><p>כן. אפשר לשייך עובדים, מנהלים ומשמרות לסניפים ולמחלקות, ולהגדיר לכל משתמש את תחומי הגישה המתאימים לו.</p></details></div></section>

    <section className="final-cta"><ScrollReveal><BrandLogo light /><h2>את הסידור הבא אפשר להתחיל אחרת.</h2><p>פתחו סביבת עבודה לעסק, הזמינו את הצוות ורכזו את הזמינות, השיבוצים וההחלפות במקום אחד.</p><div><Link className="button brand-button large" href="/onboarding">פתיחת עסק חדש <ArrowLeft size={18} /></Link><Link className="button glass-button large" href="/demo">צפייה בדמו</Link></div></ScrollReveal></section>

    <div className="mobile-sticky-actions"><Link href="/demo">דמו</Link><Link href="/onboarding">פתיחת עסק <ArrowLeft size={16} /></Link></div>

    <footer className="pro-footer">
      <div className="pro-footer-top">
        <div className="pro-footer-brand"><BrandLogo href="/" /><p>זמינות, סידורי עבודה והחלפות משמרת — במקום אחד.</p></div>
        <nav className="pro-footer-col" aria-label="גישה למערכת"><h4>גישה למערכת</h4><Link href="/login">כניסה למערכת</Link><Link href="/onboarding">פתיחת עסק</Link><Link href="/demo">סביבת הדמו</Link></nav>
        <nav className="pro-footer-col" aria-label="מידע ותמיכה"><h4>מידע ותמיכה</h4><Link href="/about">מי אנחנו</Link><Link href="/support">תמיכה</Link><a href="mailto:support@shiftpilothq.com">support@shiftpilothq.com</a><Link href="/terms">תנאי שימוש</Link><Link href="/privacy">מדיניות פרטיות</Link></nav>
      </div>
      <div className="pro-footer-wordmark" aria-hidden="true">ShiftPilot</div>
      <small>© 2026 ShiftPilot. כל הזכויות שמורות.</small>
    </footer>
  </main>;
}
