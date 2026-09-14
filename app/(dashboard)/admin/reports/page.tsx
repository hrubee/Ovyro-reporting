import { auth } from "@/lib/auth";
import { prisma, ensureDbSchema } from "@/lib/db";
import { redirect } from "next/navigation";
import ReportsClient from "./ReportsClient";

export default async function AdminReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as { role: string };
  if (user.role !== "ADMIN") redirect("/dashboard");

  await ensureDbSchema();

  // Pull last 60 days of all entries across all outlets safely
  const [hygiene, glass, fridge, kitchen, production, puffRoom, cakeRoom, oretaHygiene] =
    await Promise.all([
      prisma.hygieneEntry.findMany({ orderBy: { date: "desc" }, take: 60, include: { submittedBy: { select: { name: true } } } }).catch(() => []),
      prisma.glassEntry.findMany({ orderBy: { date: "desc" }, take: 60, include: { submittedBy: { select: { name: true } } } }).catch(() => []),
      prisma.fridgeEntry.findMany({ orderBy: { date: "desc" }, take: 60, include: { submittedBy: { select: { name: true } } } }).catch(() => []),
      prisma.kitchenEntry.findMany({ orderBy: { date: "desc" }, take: 60, include: { submittedBy: { select: { name: true } } } }).catch(() => []),
      prisma.productionEntry.findMany({ orderBy: { date: "desc" }, take: 60, include: { submittedBy: { select: { name: true } } } }).catch(() => []),
      prisma.puffRoomEntry.findMany({ orderBy: { date: "desc" }, take: 60, include: { submittedBy: { select: { name: true } } } }).catch(() => []),
      prisma.cakeRoomEntry.findMany({ orderBy: { date: "desc" }, take: 60, include: { submittedBy: { select: { name: true } } } }).catch(() => []),
      prisma.oretaHygieneEntry.findMany({ orderBy: { date: "desc" }, take: 60, include: { submittedBy: { select: { name: true } } } }).catch(() => []),
    ]);

  return (
    <ReportsClient
      data={{
        hygiene: JSON.parse(JSON.stringify(hygiene)),
        glass: JSON.parse(JSON.stringify(glass)),
        fridge: JSON.parse(JSON.stringify(fridge)),
        kitchen: JSON.parse(JSON.stringify(kitchen)),
        production: JSON.parse(JSON.stringify(production)),
        puffRoom: JSON.parse(JSON.stringify(puffRoom)),
        cakeRoom: JSON.parse(JSON.stringify(cakeRoom)),
        oretaHygiene: JSON.parse(JSON.stringify(oretaHygiene)),
      }}
    />
  );
}
