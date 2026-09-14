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
export interface OretaAreaCheck {
  id: number;
  area: string;
  morning: { status: "YES" | "NO" | "N/A"; staff: string; time: string };
  afternoon: { status: "YES" | "NO" | "N/A"; staff: string; time: string };
  evening: { status: "YES" | "NO" | "N/A"; staff: string; time: string };
  night: { status: "YES" | "NO" | "N/A"; staff: string; time: string };
}

export const ORETA_HYGIENE_AREAS = [
  {
    id: 1,
    area: "KITCHEN",
    morningStaff: "RAMESHWAR / BHARTI",
    afternoonStaff: "RAMESHWAR / BHARTI",
    eveningStaff: "RAMESHWAR / BHARTI",
    nightStaff: "RAMESHWAR / BHARTI",
  },
  {
    id: 2,
    area: "WASH ROOM",
    morningStaff: "—",
    afternoonStaff: "MANGLA / BHARTI",
    eveningStaff: "MANGLA / BHARTI",
    nightStaff: "MANGLA / BHARTI",
  },
  {
    id: 3,
    area: "OUTDOOR CLEANING",
    morningStaff: "MANGLA / BHARTI",
    afternoonStaff: "MANGLA / BHARTI",
    eveningStaff: "MANGLA / BHARTI",
    nightStaff: "MANGLA / BHARTI",
  },
  {
    id: 4,
    area: "INSIDE TOP / GROUND CLEANING",
    morningStaff: "MANGLA / BHARTI",
    afternoonStaff: "MANGLA / BHARTI",
    eveningStaff: "MANGLA / BHARTI",
    nightStaff: "MANGLA / BHARTI",
  },
  {
    id: 5,
    area: "CASH COUNTER",
    morningStaff: "ARZAAAN / NEW",
    afternoonStaff: "ARZAAAN / NEW",
    eveningStaff: "ARZAAAN / NEW",
    nightStaff: "ARZAAAN / NEW",
  },
  {
    id: 6,
    area: "DISPLAY COUNTERS",
    morningStaff: "ARZAAAN / NEW",
    afternoonStaff: "ARZAAAN / NEW",
    eveningStaff: "ARZAAAN / NEW",
    nightStaff: "ARZAAAN / NEW",
  },
  {
    id: 7,
    area: "FREEZER",
    morningStaff: "ARZAAAN / NEW",
    afternoonStaff: "ARZAAAN / NEW",
    eveningStaff: "ARZAAAN / NEW",
    nightStaff: "ARZAAAN / NEW",
  },
  {
    id: 8,
    area: "RACKS",
    morningStaff: "ARZAAAN / NEW",
    afternoonStaff: "ARZAAAN / NEW",
    eveningStaff: "ARZAAAN / NEW",
    nightStaff: "ARZAAAN / NEW",
  },
  {
    id: 9,
    area: "STORE",
    morningStaff: "ARZAAAN / NEW",
    afternoonStaff: "ARZAAAN / NEW",
    eveningStaff: "ARZAAAN / NEW",
    nightStaff: "ARZAAAN / NEW",
  },
  {
    id: 10,
    area: "DUSTING",
    morningStaff: "BHARTI / MANGLA",
    afternoonStaff: "BHARTI / MANGLA",
    eveningStaff: "BHARTI / MANGLA",
    nightStaff: "BHARTI / MANGLA",
  },
  {
    id: 11,
    area: "TABLES / CHAIRS",
    morningStaff: "BHARTI / RAMESHWAR",
    afternoonStaff: "BHARTI / RAMESHWAR",
    eveningStaff: "BHARTI / RAMESHWAR",
    nightStaff: "BHARTI / RAMESHWAR",
  },
  {
    id: 12,
    area: "WASHING VESSELS",
    morningStaff: "BHARTI - RAMESHWAR",
    afternoonStaff: "BHARTI - RAMESHWAR",
    eveningStaff: "BHARTI - RAMESHWAR",
    nightStaff: "BHARTI - RAMESHWAR",
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
