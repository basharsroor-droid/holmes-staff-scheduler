import Link from "next/link";
import { ArrowLeft, CalendarCheck, CalendarRange, CheckCircle2, Clock3, Repeat2, ShieldCheck, Sparkles, Users } from "lucide-react";

const features = [
  { icon: CalendarCheck, title: "הגשת זמינות", text: "העובדים מגישים זמינות חודשית בצורה מסודרת, במקום הודעות מפוזרות." },
  { icon: CalendarRange, title: "בניית סידור", text: "המנהלת משבצת לפי הזמינות, מזהה התנגשויות ומפרסמת לצוות." },
  { icon: Repeat2, title: "החלפת משמרות", text: "בקשה, אישור העובד השני ואישור מנהל בתהליך אחד ברור." }
];

export default function HomePage() {
  return <main className="landing-page" dir="rtl">
    <nav className="landing-nav">
      <Link href="/" className="brand"><div className="brand-mark">SP</div><div><div className="brand-title">ShiftPilot</div><div className="brand-subtitle">ניהול משמרות חכם</div></div></Link>
      <div className="landing-nav-actions"><Link className="button" href="/demo">צפייה בדמו</Link><Link className="button" href="/login">כניסה</Link><Link className="button primary" href="/onboarding">פתיחת עסק</Link></div>
    </nav>

    <section className="landing-hero">
      <div>
        <p className="eyebrow"><Sparkles size={16} /> פחות הודעות. פחות טעויות. יותר סדר.</p>
        <h1>סידור העבודה שמסתדר עם כולם.</h1>
        <p className="landing-lead">ShiftPilot מרכזת הגשת זמינות, בניית סידור, פרסום משמרות והחלפות — במערכת אחת פשוטה לעובדים ולמנהלים.</p>
        <div className="landing-cta"><Link className="button primary" href="/onboarding">התחלה ללא עלות <ArrowLeft size={17} /></Link><Link className="button" href="/demo">פתיחת הדמו</Link></div>
        <div className="landing-trust"><span><CheckCircle2 /> הקמה מהירה</span><span><ShieldCheck /> הפרדת נתונים מאובטחת</span><span><Users /> מתאים לכל צוות</span></div>
      </div>
      <div className="landing-preview">
        <div className="landing-preview-top"><span><i /> ShiftPilot · אוגוסט 2026</span><strong>הסידור פורסם</strong></div>
        <div className="landing-preview-grid">
          <article><CalendarCheck /><span><strong>12</strong><small>הגישו זמינות</small></span></article>
          <article><Clock3 /><span><strong>84</strong><small>משמרות החודש</small></span></article>
          <article><Users /><span><strong>100%</strong><small>משמרות מאוישות</small></span></article>
        </div>
        <div className="landing-shift"><span><strong>ראשון, 9 באוגוסט</strong><small>פתיחה · 06:00–14:00</small></span><div><b>מיה</b><b>אדם</b></div></div>
        <div className="landing-shift"><span><strong>ראשון, 9 באוגוסט</strong><small>סגירה · 14:00–22:00</small></span><div><b>נועה</b><b>עומר</b></div></div>
      </div>
    </section>

    <section className="landing-features"><div className="landing-section-heading"><p className="eyebrow">תהליך אחד, מקצה לקצה</p><h2>כל מה שצריך כדי לנהל משמרות נכון</h2></div><div className="landing-feature-grid">{features.map(({ icon: Icon, title, text }) => <article key={title}><Icon /><h3>{title}</h3><p>{text}</p></article>)}</div></section>

    <section className="landing-final"><div><p className="eyebrow">מוכנים להתחיל?</p><h2>הקימו סביבת עבודה לצוות שלכם</h2><p>פתחו עסק, הגדירו סניף וסוגי משמרות והזמינו את העובדים.</p></div><Link className="button primary" href="/onboarding">פתיחת חשבון <ArrowLeft size={17} /></Link></section>

    <footer className="landing-footer"><span>© 2026 ShiftPilot</span><div><Link href="/login">כניסה</Link><Link href="/demo">דמו Holmes Place</Link></div></footer>
  </main>;
}
