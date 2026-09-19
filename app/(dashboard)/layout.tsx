import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Sidebar from "@/components/Sidebar";
import { OutletProvider } from "@/components/OutletContext";
import { getTenantOutlets } from "@/lib/permissions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as {
    id: string;
    name: string;
    email: string;
    role: string;
    organizationId: string;
    organizationName?: string;
  };

  const cookieStore = await cookies();
  const initialOutlet = cookieStore.get("pnr_outlet")?.value;

  // Pre-fetch outlets for fast server render
  const outlets = await getTenantOutlets(user.organizationId, user.id, user.role);

  return (
    <OutletProvider
      initialOutletId={initialOutlet || outlets[0]?.id}
      initialOutlets={outlets}
    >
      <div className="layout">
        <Sidebar user={user} />
        <main className="main-content">{children}</main>
      </div>
    </OutletProvider>
  );
}
