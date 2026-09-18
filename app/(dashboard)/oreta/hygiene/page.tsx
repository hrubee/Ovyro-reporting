import { redirect } from "next/navigation";

export default async function OretaHygieneRedirect({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const resolved = (await searchParams) || {};
  if (resolved.date) {
    redirect(`/oreta/shop-cleaning?date=${resolved.date}`);
  }
  redirect("/oreta/shop-cleaning");
}
