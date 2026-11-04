import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  redirect(await getIdentity() ? "/dashboard" : "/login");
}
