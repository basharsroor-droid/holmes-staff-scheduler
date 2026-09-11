// I1 (docs/REMEDIATION_PLAN.md): ready-made shift types so a new business
// doesn't start from an empty screen. Each preset is a sensible starting point:
// the manager adds more shift types or turns off the ones that don't fit. Every
// shift starts and ends on the same day.

export type ShiftTemplatePreset = {
  name: string;
  shiftType: "opening" | "middle" | "closing" | "custom";
  startTime: string;
  endTime: string;
  requiredEmployees: number;
  requiresSenior: boolean;
};

export type BusinessPreset = {
  key: "restaurant" | "cafe" | "gym" | "retail";
  label: string;
  templates: ShiftTemplatePreset[];
};

export const BUSINESS_PRESETS: BusinessPreset[] = [
  {
    key: "restaurant",
    label: "מסעדה",
    templates: [
      {
        name: "בוקר",
        shiftType: "opening",
        startTime: "08:00",
        endTime: "16:00",
        requiredEmployees: 2,
        requiresSenior: true
      },
      {
        name: "ערב",
        shiftType: "closing",
        startTime: "16:00",
        endTime: "23:30",
        requiredEmployees: 3,
        requiresSenior: true
      }
    ]
  },
  {
    key: "cafe",
    label: "בית קפה",
    templates: [
      {
        name: "פתיחה",
        shiftType: "opening",
        startTime: "06:30",
        endTime: "14:30",
        requiredEmployees: 2,
        requiresSenior: true
      },
      {
        name: "סגירה",
        shiftType: "closing",
        startTime: "14:00",
        endTime: "22:00",
        requiredEmployees: 2,
        requiresSenior: true
      }
    ]
  },
  {
    key: "gym",
    label: "מכון כושר",
    templates: [
      {
        name: "בוקר",
        shiftType: "opening",
        startTime: "06:00",
        endTime: "14:00",
        requiredEmployees: 1,
        requiresSenior: true
      },
      {
        name: "ערב",
        shiftType: "closing",
        startTime: "14:00",
        endTime: "22:00",
        requiredEmployees: 1,
        requiresSenior: true
      }
    ]
  },
  {
    key: "retail",
    label: "חנות",
    templates: [
      {
        name: "פתיחה",
        shiftType: "opening",
        startTime: "09:00",
        endTime: "15:00",
        requiredEmployees: 2,
        requiresSenior: true
      },
      {
        name: "אמצע",
        shiftType: "middle",
        startTime: "11:00",
        endTime: "19:00",
        requiredEmployees: 1,
        requiresSenior: false
      },
      {
        name: "סגירה",
        shiftType: "closing",
        startTime: "15:00",
        endTime: "21:00",
        requiredEmployees: 2,
        requiresSenior: true
      }
    ]
  }
];
