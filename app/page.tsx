import Link from "next/link";
import { ArrowLeft, BarChart3, Building2, CalendarCheck, CalendarDays, CalendarRange, Check, CheckCircle2, Clock3, LockKeyhole, Mail, Repeat2, ShieldCheck, Sparkles, UserPlus, Users, Wand2 } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

const capabilities = [
  { icon: CalendarCheck, title: "הגשת זמינות מסודרת", text: "כל עובד מסמן מועדפת, זמין, רק אם צריך או לא זמין — לכל משמרת בחודש." },
  { icon: CalendarRange, title: "בניית סידור חכמה", text: "המנהל רואה את כל ההגשות במקום אחד ומשבץ בלי התנגשויות ובלי לנחש." },
  { icon: Repeat2, title: "החלפות עם אישורים", text: "העובד השני מאשר, המנהל מאשר סופית והסידור מתעדכן באופן מבוקר." },
  { icon: UserPlus, title: "ניהול עובדים", text: "הזמנה במייל, שיוך לסניף, תפקיד, הרשאות פתיחה וסגירה ורמת ותק." },
  { icon: BarChart3, title: "תמונה ניהולית", text: "מי הגיש, מי חסר, אילו משמרות אינן מאוישות ומה עומס השעות של כל עובד." },
  { icon: ShieldCheck, title: "סביבה פרטית לכל עסק", text: "העובדים רואים רק את המידע שלהם והמנהלים פועלים רק בתוך הארגון והסניף." }
];

const setupSteps = [
  { n: "01", title: "פתיחת חשבון עסקי", text: "נרשמים עם שם ומייל, מאמתים את הכתובת ויוצרים סביבת עבודה פרטית." },
  { n: "02", title: "הגדרת העסק והמשמרות", text: "מוסיפים סניף ומגדירים פתיחה, אמצע וסגירה עם שעות וכמות עובדים נדרשת." },
  { n: "03", title: "הזמנת הצוות", text: "שולחים לעובדים הזמנה מאובטחת במייל ומשייכים תפקיד והרשאות." },
  { n: "04", title: "פתיחת חודש עבודה", text: "בוחרים חודש, קובעים מועד אחרון ומאפשרים לעובדים להגיש זמינות." },
  { n: "05", title: "שיבוץ ופרסום", text: "בונים את הסידור לפי ההגשות, משלימים תקנים ומפרסמים לצוות." }
];

export default function HomePage() {
  return <main className="marketing-site" dir="rtl">
    <nav className="pro-nav">
      <BrandLogo href="/" />
      <div className="pro-nav-links"><a href="#how">איך זה עובד</a><a href="#roles">למי זה מתאים</a><a href="#example">דוגמה</a><a href="#security">אבטחה</a></div>
      <div className="pro-nav-actions"><Link className="button ghost-light" href="/demo">דמו</Link><Link className="button ghost-light" href="/login">כניסה</Link><Link className="button brand-button" href="/onboarding">פתיחת עסק</Link></div>
    </nav>

    <header className="pro-hero">
      <div className="hero-glow one" /><div className="hero-glow two" />
      <ScrollReveal className="pro-hero-copy">
        <p className="pro-kicker"><Sparkles size={16} /> ניהול משמרות לעסקים שרוצים לעבוד מסודר</p>
        <h1>מהגשת זמינות ועד סידור עבודה — <span>בלי כאוס בקבוצת הוואטסאפ.</span></h1>
        <p>ShiftPilot מחברת בין העובדים למנהלים בתהליך אחד: פתיחת חודש, הגשת זמינות, בניית סידור, פרסום משמרות והחלפות מאושרות.</p>
        <div className="pro-hero-actions"><Link className="button brand-button large" href="/onboarding">פתיחת סביבת עבודה <ArrowLeft size={18} /></Link><Link className="button glass-button large" href="/demo">לצפייה בדמו</Link></div>
        <div className="hero-assurances"><span><Check /> ללא התקנה</span><span><Check /> עובד בטלפון ובמחשב</span><span><Check /> הקמה תוך דקות</span></div>
      </ScrollReveal>
      <ScrollReveal className="product-window" delay={150}>
        <div className="window-bar"><i /><i /><i /><span className="window-product-title"><bdi dir="ltr">ShiftPilot</bdi><i>·</i> סידור אוגוסט</span><b>פורסם</b></div>
        <div className="window-body">
          <aside><BrandLogo compact /><span className="active"><CalendarRange /> סידור עבודה</span><span><Users /> עובדים</span><span><CalendarCheck /> הגשות</span><span><Repeat2 /> החלפות</span></aside>
          <div className="window-content"><div className="window-heading"><div><small>סניף הכרמל</small><strong>אוגוסט 2026</strong></div><button>פרסום הסידור</button></div>
            <div className="mock-stats"><span><b>84</b><small>משמרות</small></span><span><b>12/12</b><small>הגישו</small></span><span><b>96%</b><small>מאויש</small></span></div>
            <div className="mock-day"><strong>יום ראשון · 9 באוגוסט</strong><div><span><b>פתיחה</b><small>06:00–14:00</small></span><em>מיה</em><em>אדם</em><i>2/2</i></div><div><span><b>סגירה</b><small>14:00–22:00</small></span><em>נועה</em><em>עומר</em><i>2/2</i></div></div>
          </div>
        </div>
      </ScrollReveal>
    </header>

    <section className="proof-strip"><span>מתאים למסעדות</span><i /> <span>חדרי כושר</span><i /> <span>חנויות</span><i /> <span>מוקדי שירות</span><i /> <span>מרפאות</span><i /> <span>כל צוות שעובד במשמרות</span></section>

    <section className="pro-section problem-section">
      <ScrollReveal className="section-heading"><p className="pro-kicker dark">למה ShiftPilot?</p><h2>הבעיה היא לא הסידור. הבעיה היא כל מה שקורה סביבו.</h2><p>הודעות פרטיות, שינויים ברגע האחרון, טבלאות לא מעודכנות ועובדים שלא יודעים איזו גרסה היא הסופית.</p></ScrollReveal>
      <div className="comparison-grid">
        <ScrollReveal className="comparison-card old"><small>היום</small><h3>ניהול ידני ומפוזר</h3><ul><li>עשרות הודעות זמינות בפורמטים שונים</li><li>העתקה ידנית לאקסל או לדף</li><li>התנגשויות וחוסרים שמתגלים מאוחר</li><li>החלפות ללא תיעוד ברור</li></ul></ScrollReveal>
        <ScrollReveal className="comparison-card new" delay={120}><small>עם ShiftPilot</small><h3>תהליך אחד ושקוף</h3><ul><li>טופס אחיד לכל העובדים</li><li>תמונת מצב מיידית למנהלת</li><li>שיבוץ לפי זמינות ותקנים</li><li>כל שינוי עובר אישור ומתועד</li></ul></ScrollReveal>
      </div>
    </section>

    <section className="pro-section process-section" id="how">
      <ScrollReveal className="section-heading centered"><p className="pro-kicker dark">מהרשמה לסידור ראשון</p><h2>חמישה שלבים פשוטים להפעלת המערכת</h2><p>אין צורך בהטמעה טכנית. בעל העסק מגדיר את סביבת העבודה והצוות מתחיל להשתמש.</p></ScrollReveal>
      <div className="process-timeline">{setupSteps.map((step,index) => <ScrollReveal className="process-step" delay={index*70} key={step.n}><b>{step.n}</b><div><h3>{step.title}</h3><p>{step.text}</p></div></ScrollReveal>)}</div>
    </section>

    <section className="pro-section roles-section" id="roles">
      <ScrollReveal className="section-heading"><p className="pro-kicker dark">שתי חוויות, מערכת אחת</p><h2>פשוט לעובדים. עוצמתי למנהלים.</h2></ScrollReveal>
      <div className="role-showcase">
        <ScrollReveal className="role-panel employee"><div className="role-icon"><Users /></div><small>סביבת העובד</small><h3>העובד יודע בדיוק מה צריך לעשות</h3><ul><li><CheckCircle2 /> הגשת זמינות חודשית מהטלפון</li><li><CalendarDays /> צפייה במשמרת הקרובה ובכל החודש</li><li><Repeat2 /> בקשת החלפה ומעקב אחר האישורים</li><li><Mail /> קבלת הזמנה וגישה אישית</li></ul><div className="phone-mock"><div><b>המשמרת הקרובה</b><span>יום ראשון · פתיחה</span><strong>06:00–14:00</strong><small>סניף הכרמל</small></div></div></ScrollReveal>
        <ScrollReveal className="role-panel manager" delay={120}><div className="role-icon"><Wand2 /></div><small>סביבת המנהל</small><h3>המנהל מקבל שליטה ותמונה מלאה</h3><ul><li><BarChart3 /> מעקב מי הגיש ומי עדיין חסר</li><li><CalendarRange /> יצירת משמרות ושיבוץ עובדים</li><li><ShieldCheck /> תפקידים, סניפים והרשאות</li><li><Repeat2 /> אישור החלפות ועדכון הסידור</li></ul><div className="manager-mock"><span><b>12</b><small>עובדים</small></span><span><b>10</b><small>הגישו</small></span><span><b>2</b><small>חסרים</small></span></div></ScrollReveal>
      </div>
    </section>

    <section className="pro-section example-section" id="example">
      <ScrollReveal className="section-heading centered"><p className="pro-kicker dark">דוגמה אמיתית למבנה</p><h2>כך נראה חודש עבודה ב־ShiftPilot</h2><p>העסק יכול לשנות את מספר המשמרות והשעות בכל עת. זו דוגמה למועדון עם פתיחה, אמצע וסגירה.</p></ScrollReveal>
      <ScrollReveal className="example-table-wrap"><table className="example-table"><thead><tr><th>סוג משמרת</th><th>שעות</th><th>תקן</th><th>דרישה</th><th>דוגמת זמינות</th></tr></thead><tbody><tr><td><b>פתיחה</b></td><td>06:00–14:00</td><td>2 עובדים</td><td>עובד אחד מורשה פתיחה</td><td><span className="status preferred">מועדפת</span></td></tr><tr><td><b>אמצע</b></td><td>10:00–18:00</td><td>1 עובד</td><td>ללא</td><td><span className="status available">זמין</span></td></tr><tr><td><b>סגירה</b></td><td>14:00–22:00</td><td>2 עובדים</td><td>עובד בכיר / מורשה סגירה</td><td><span className="status needed">רק אם צריך</span></td></tr></tbody></table><div className="example-note"><Clock3 /><span><strong>המערכת גמישה</strong><small>ביולי ואוגוסט אפשר להפעיל ארבע משמרות ביום, ובחודשים אחרים שתיים בלבד — לפי צורכי העסק.</small></span></div></ScrollReveal>
    </section>

    <section className="pro-section features-section">
      <ScrollReveal className="section-heading centered"><p className="pro-kicker dark">יכולות המוצר</p><h2>כל הכלים, בלי להעמיס על הצוות</h2></ScrollReveal>
      <div className="capability-grid">{capabilities.map((item,index)=><ScrollReveal className="capability-card" delay={(index%3)*70} key={item.title}><item.icon /><h3>{item.title}</h3><p>{item.text}</p></ScrollReveal>)}</div>
    </section>

    <section className="pro-section security-section" id="security">
      <ScrollReveal className="security-copy"><p className="pro-kicker">בנוי לעבודה אמיתית</p><h2>המידע של כל עסק נשאר בתוך העסק.</h2><p>לכל ארגון סביבת נתונים נפרדת. העובד רואה את הזמינות והשיבוצים שלו, מנהל רואה את הסניף שלו ובעל העסק שולט בהרשאות.</p><div><span><LockKeyhole /> כניסה מאובטחת ואימות מייל</span><span><ShieldCheck /> הרשאות לפי תפקיד</span><span><Building2 /> הפרדה מלאה בין ארגונים</span></div></ScrollReveal>
      <ScrollReveal className="security-visual" delay={120}><ShieldCheck /><span><b>RLS</b><small>Row Level Security</small></span><i /><span><b>Roles</b><small>Owner · Manager · Employee</small></span><i /><span><b>Audit</b><small>פעולות והחלטות מתועדות</small></span></ScrollReveal>
    </section>

    <section className="pro-section faq-section"><ScrollReveal className="section-heading"><p className="pro-kicker dark">שאלות נפוצות</p><h2>לפני שמתחילים</h2></ScrollReveal><div className="faq-grid"><details open><summary>האם העובדים צריכים להוריד אפליקציה?</summary><p>לא. המערכת פועלת בדפדפן בטלפון ובמחשב, וכל עובד נכנס דרך קישור מאובטח.</p></details><details><summary>אפשר לשנות את סוגי המשמרות בכל חודש?</summary><p>כן. שעות, שמות, תקנים ודרישות ניהוליות ניתנים לשינוי לפי עונה וסניף.</p></details><details><summary>מה קורה אחרי פרסום הסידור?</summary><p>כל עובד רואה רק את המשמרות שלו. החלפות מתבצעות דרך תהליך אישור ולא משנות את הסידור ללא מנהל.</p></details><details><summary>אפשר לנהל יותר מסניף אחד?</summary><p>המבנה כבר בנוי לשיוך עובדים, משמרות וחודשים לפי ארגון וסניף.</p></details></div></section>

    <section className="final-cta"><ScrollReveal><BrandLogo light /><h2>הגיע הזמן להפסיק לרדוף אחרי המשמרות.</h2><p>פתחו סביבת עבודה, הגדירו את הסניף הראשון והכינו את הסידור הבא בצורה מסודרת.</p><div><Link className="button brand-button large" href="/onboarding">פתיחת עסק חדש <ArrowLeft size={18} /></Link><Link className="button glass-button large" href="/demo">כניסה לדמו</Link></div></ScrollReveal></section>

    <footer className="pro-footer"><BrandLogo href="/" /><p>ShiftPilot — הדרך הקלה למשמרת הבאה שלך.</p><div><Link href="/login">כניסה</Link><Link href="/onboarding">הרשמה</Link><Link href="/demo">דמו Holmes Place</Link></div><small>© 2026 ShiftPilot. כל הזכויות שמורות.</small></footer>
  </main>;
}
