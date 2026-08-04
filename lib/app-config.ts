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

export const defaultOrganizationId = "holmes-place";
export const defaultBranchId = "holmes-branch";

export const organizations: Organization[] = [
  {
    id: defaultOrganizationId,
    businessName: "Holmes Place",
    branchId: defaultBranchId,
    branchName: "סניף פיילוט",
    industryLabel: "מועדון כושר עם עובדים במשמרות",
    locationLabel: "Holmes Place",
    scheduleMonthLabel: "יולי 2026",
    pilotName: "פיילוט Holmes Place לניהול סידור עבודה"
  },
  {
    id: "demo-cafe",
    businessName: "Cafe Demo",
    branchId: "demo-cafe-main",
    branchName: "סניף מרכזי",
    industryLabel: "בית קפה עם עובדים במשמרות",
    locationLabel: "Cafe Demo",
    scheduleMonthLabel: "יולי 2026",
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
