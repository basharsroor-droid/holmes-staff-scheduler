// The three pilot setup steps (I1 in docs/REMEDIATION_PLAN.md). One source for
// the /workspace checklist and for the guide at the top of each setup screen
// (components/workspace/setup-step-guide.tsx), so the two never drift apart.

export type SetupStepKey = "shift-types" | "work-month" | "team";

export type SetupStep = {
  key: SetupStepKey;
  href: string;
  title: string;
  description: string;
  howTo: string[];
};

export const SETUP_STEPS: SetupStep[] = [
  {
    key: "shift-types",
    href: "/workspace/shift-templates",
    title: "הגדרת סוגי משמרות",
    description: "הוסיפו פתיחה, אמצע וסגירה עם השעות והתקן האמיתיים.",
    howTo: [
      "בחרו מחלקה והוסיפו כל סוג משמרת עם שעות התחלה וסיום ומספר העובדים הדרוש.",
      "אין לכם עדיין מבנה? לחצו על תבנית מוכנה לפי סוג העסק — מסעדה, בית קפה, מכון כושר או חנות.",
      "סמנו 'נדרש עובד בכיר' במשמרות שבהן חייב להיות אחראי."
    ]
  },
  {
    key: "work-month",
    href: "/workspace/work-months",
    title: "פתיחת חודש עבודה",
    description: "בחרו חודש וקבעו מתי העובדים יכולים להגיש זמינות.",
    howTo: [
      "בחרו סניף, מחלקה וחודש — לכל מחלקה נפתח חודש עבודה משלה.",
      "קבעו מתי נפתחת ונסגרת הגשת הזמינות. העובדים יכולים להגיש רק בחלון הזה.",
      "כשההגשה נסגרת, בונים את הסידור במסך בניית הסידור ומפרסמים לצוות."
    ]
  },
  {
    key: "team",
    href: "/workspace/employees",
    title: "הזמנת צוות הפיילוט",
    description: "הזמינו מנהל/ת ולפחות שני עובדי בדיקה במייל.",
    howTo: [
      "הזמינו כל עובד במייל — הוא מקבל קישור אישי להצטרפות לסביבת העבודה.",
      "אחרי ההצטרפות, שייכו כל עובד למחלקה במסך 'סניפים ומחלקות', כדי שיופיע בבניית הסידור שלה.",
      "לפיילוט מספיקים מנהל/ת ושני עובדים."
    ]
  }
];
