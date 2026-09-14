export interface OutletSheet {
  id: string;
  label: string;
  icon: string;
  route: string;
  description?: string;
}

export interface OutletConfig {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  sheets: OutletSheet[];
}

export const OUTLETS: OutletConfig[] = [
  {
    id: "bakery",
    name: "Bakery",
    icon: "🥐",
    tagline: "Main Bakery Facility",
    sheets: [
      { id: "HYGIENE_REPORT", label: "Hygiene Report", icon: "🧹", route: "/hygiene" },
      { id: "GLASS_REPORT", label: "Glass Report", icon: "🪟", route: "/glass" },
      { id: "FRIDGE_REPORT", label: "Fridge Report", icon: "🧊", route: "/fridge" },
      { id: "KITCHEN", label: "Kitchen", icon: "🍳", route: "/kitchen" },
      { id: "PRODUCTION", label: "Production", icon: "🏭", route: "/production" },
      { id: "PUFF_ROOM", label: "Puff Room", icon: "🥐", route: "/puff-room" },
      { id: "CAKE_ROOM", label: "Cake Room", icon: "🎂", route: "/cake-room" },
    ],
  },
  {
    id: "oreta-world",
    name: "Oreta World",
    icon: "🌐",
    tagline: "Oreta World Outlet",
    sheets: [
      {
        id: "ORETA_HYGIENE",
        label: "Hygiene & Cleaning SOP",
        icon: "✨",
        route: "/oreta/hygiene",
        description: "4-Shift Daily Hygiene Checklist",
      },
    ],
  },
];

export const DEFAULT_OUTLET = OUTLETS[0];

export function getOutletById(id?: string | null): OutletConfig {
  if (!id) return DEFAULT_OUTLET;
  return OUTLETS.find((o) => o.id === id) || DEFAULT_OUTLET;
}

export function getOutletByRoute(pathname: string): OutletConfig {
  if (pathname.startsWith("/oreta")) {
    return OUTLETS.find((o) => o.id === "oreta-world") || DEFAULT_OUTLET;
  }
  return DEFAULT_OUTLET;
}

// ─── Oreta World Hygiene SOP Template ─────────────────────────────────────────
export interface OretaAreaDefinition {
  id: number;
  area: string;
  assignedStaff: string[];
  defaultStaff: string;
  morningDisabled?: boolean;
}

export const ORETA_HYGIENE_AREAS: OretaAreaDefinition[] = [
  {
    id: 1,
    area: "KITCHEN",
    assignedStaff: ["Rameshwar", "Bharti"],
    defaultStaff: "Rameshwar",
  },
  {
    id: 2,
    area: "WASH ROOM",
    assignedStaff: ["Mangla", "Bharti"],
    defaultStaff: "Mangla",
    morningDisabled: true,
  },
  {
    id: 3,
    area: "OUTDOOR CLEANING",
    assignedStaff: ["Mangla", "Bharti"],
    defaultStaff: "Mangla",
  },
  {
    id: 4,
    area: "INSIDE TOP / GROUND CLEANING",
    assignedStaff: ["Mangla", "Bharti"],
    defaultStaff: "Mangla",
  },
  {
    id: 5,
    area: "CASH COUNTER",
    assignedStaff: ["Arzaaan", "New Staff"],
    defaultStaff: "Arzaaan",
  },
  {
    id: 6,
    area: "DISPLAY COUNTERS",
    assignedStaff: ["Arzaaan", "New Staff"],
    defaultStaff: "Arzaaan",
  },
  {
    id: 7,
    area: "FREEZER",
    assignedStaff: ["Arzaaan", "New Staff"],
    defaultStaff: "Arzaaan",
  },
  {
    id: 8,
    area: "RACKS",
    assignedStaff: ["Arzaaan", "New Staff"],
    defaultStaff: "Arzaaan",
  },
  {
    id: 9,
    area: "STORE",
    assignedStaff: ["Arzaaan", "New Staff"],
    defaultStaff: "Arzaaan",
  },
  {
    id: 10,
    area: "DUSTING",
    assignedStaff: ["Bharti", "Mangla"],
    defaultStaff: "Bharti",
  },
  {
    id: 11,
    area: "TABLES / CHAIRS",
    assignedStaff: ["Bharti", "Rameshwar"],
    defaultStaff: "Bharti",
  },
  {
    id: 12,
    area: "WASHING VESSELS",
    assignedStaff: ["Bharti", "Rameshwar"],
    defaultStaff: "Bharti",
  },
];

export const ORETA_STAFF = [
  "Rameshwar",
  "Bharti",
  "Mangla",
  "Arzaaan",
  "New Staff",
  "Admin",
];
