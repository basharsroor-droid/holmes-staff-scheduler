export const productConfig = {
  name: "ShiftPilot",
  shortName: "SP",
  tagline: "ניהול סידור עבודה פשוט לכל עסק",
  description: "מערכת לניהול זמינות, שיבוצים, החלפות וסידור עבודה לעובדים."
};

export type Organization = {
  id: string;
  businessName: string;
  branchId: string;
  branchName: string;
  industryLabel: string;
  locationLabel: string;
  scheduleMonthLabel: string;
  pilotName: string;
};

export const defaultOrganizationId = "nova-studio";
export const defaultBranchId = "nova-carmel";

export const organizations: Organization[] = [
  {
    id: defaultOrganizationId,
    businessName: "Nova Studio",
    branchId: defaultBranchId,
    branchName: "סניף הכרמל",
    industryLabel: "מועדון כושר עם עובדים במשמרות",
    locationLabel: "Nova Studio",
    scheduleMonthLabel: "אוגוסט 2026",
    pilotName: "פיילוט Nova Studio לניהול סידור עבודה"
  },
  {
    id: "demo-cafe",
    businessName: "Cafe Demo",
    branchId: "demo-cafe-main",
    branchName: "סניף מרכזי",
    industryLabel: "בית קפה עם עובדים במשמרות",
    locationLabel: "Cafe Demo",
    scheduleMonthLabel: "אוגוסט 2026",
    pilotName: "פיילוט בית קפה לניהול סידור עבודה"
  }
];

export function getOrganizationById(organizationId?: string) {
  return (
    organizations.find((organization) => organization.id === organizationId) ??
    organizations.find((organization) => organization.id === defaultOrganizationId) ??
    organizations[0]
  );
}

export function organizationDisplayName(organizationId?: string) {
  const organization = getOrganizationById(organizationId);
  return `${organization.businessName} · ${organization.branchName}`;
}

export const demoOrganization = getOrganizationById(defaultOrganizationId);
