import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OUTLETS, getOutletById } from "@/lib/outlets";

export type SheetId =
  | "HYGIENE_REPORT"
  | "GLASS_REPORT"
  | "FRIDGE_REPORT"
  | "KITCHEN"
  | "PRODUCTION"
  | "PUFF_ROOM"
  | "CAKE_ROOM"
  | "ORETA_SHOP_CLEANING"
  | "ORETA_EQUIPMENT"
  | "ORETA_FRIDGE"
  | "ORETA_GLASS"
  | "ORETA_MONTHLY"
  | "ORETA_HYGIENE";

export const SHEET_LABELS: Record<SheetId, string> = {
  HYGIENE_REPORT: "Hygiene Report",
  GLASS_REPORT: "Glass Report",
  FRIDGE_REPORT: "Fridge Report",
  KITCHEN: "Kitchen",
  PRODUCTION: "Production",
  PUFF_ROOM: "Puff Room",
  CAKE_ROOM: "Cake Room",
  ORETA_SHOP_CLEANING: "House Keeping",
  ORETA_EQUIPMENT: "Equipment Cleaning",
  ORETA_FRIDGE: "Fridge & Display Temp",
  ORETA_GLASS: "Glass Report",
  ORETA_MONTHLY: "Monthly Maintenance",
  ORETA_HYGIENE: "House Keeping",
};

export const SHEET_ROUTES: Record<SheetId, string> = {
  HYGIENE_REPORT: "/hygiene",
  GLASS_REPORT: "/glass",
  FRIDGE_REPORT: "/fridge",
  KITCHEN: "/kitchen",
  PRODUCTION: "/production",
  PUFF_ROOM: "/puff-room",
  CAKE_ROOM: "/cake-room",
  ORETA_SHOP_CLEANING: "/oreta/shop-cleaning",
  ORETA_EQUIPMENT: "/oreta/equipment",
  ORETA_FRIDGE: "/oreta/fridge",
  ORETA_GLASS: "/oreta/glass",
  ORETA_MONTHLY: "/oreta/monthly",
  ORETA_HYGIENE: "/oreta/shop-cleaning",
};

export const SUPERVISORS = [
  "Aboli Wagh",
  "Sandeep Gargate",
  "Admin",
  "Oreta Supervisor",
];

export const SHEET_STAFF: Record<SheetId, string[]> = {
  HYGIENE_REPORT: ["Shridhar Jadhav", "Pravin Jadhav", "Mavshi"],
  GLASS_REPORT: ["Sanjay Jadhav", "Suresh"],
  FRIDGE_REPORT: ["Aboli Wagh", "Sandeep Gargate"],
  KITCHEN: ["Sagar Yadav", "Pravin Jadhav", "Mavshi", "Suresh"],
  PRODUCTION: ["Sagar Yadav", "Pravin Jadhav", "Mavshi"],
  PUFF_ROOM: ["Dilip", "Sandeep Gargate"],
  CAKE_ROOM: ["Meraj Khan", "Jaseen Siddique", "Nadeem Faruqi"],
  ORETA_SHOP_CLEANING: ["Rameshwar", "Bharti", "Mangla", "Arzaaan", "New Staff", "Admin"],
  ORETA_EQUIPMENT: ["Rameshwar", "Bharti", "Mangla", "Arzaaan", "New Staff", "Admin"],
  ORETA_FRIDGE: ["Rameshwar", "Bharti", "Mangla", "Arzaaan", "Admin"],
  ORETA_GLASS: ["Mangla", "Bharti", "Rameshwar", "Admin"],
  ORETA_MONTHLY: ["Mangla", "Rameshwar", "Bharti", "Arzaaan", "Admin"],
  ORETA_HYGIENE: ["Rameshwar", "Bharti", "Mangla", "Arzaaan", "New Staff", "Admin"],
};

export const ALL_STAFF = [
  "Aboli Wagh",
  "Sandeep Gargate",
  "Shridhar Jadhav",
  "Pravin Jadhav",
  "Mavshi",
  "Sanjay Jadhav",
  "Suresh",
  "Sagar Yadav",
  "Dilip",
  "Meraj Khan",
  "Jaseen Siddique",
  "Nadeem Faruqi",
  "Rameshwar",
  "Bharti",
  "Mangla",
  "Arzaaan",
  "New Staff",
];

export async function getUserSheetAccess(userId: string): Promise<SheetId[]> {
  const access = await prisma.sheetAccess.findMany({
    where: { userId },
    select: { sheet: true },
  });
  return access.map((a: { sheet: string }) => a.sheet as SheetId);
}

export async function hasSheetAccess(
  userId: string,
  sheet: SheetId,
  role: string
): Promise<boolean> {
  if (role === "ADMIN") return true;
  // Handle alias
  const normalizedSheet = sheet === "ORETA_HYGIENE" ? "ORETA_SHOP_CLEANING" : sheet;
  const access = await prisma.sheetAccess.findFirst({
    where: {
      userId,
      sheet: { in: [sheet, normalizedSheet, "ORETA_HYGIENE", "ORETA_SHOP_CLEANING"] },
    },
  });
  return !!access;
}

export function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function getDayName(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "long" });
}
