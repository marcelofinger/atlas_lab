import { redirect } from "next/navigation";
import Image from "next/image";
import { LoginForm } from "@/components/login-form";
import { getIdentity } from "@/lib/data";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (await getIdentity()) redirect("/dashboard");
  const { erro } = await searchParams;
  return <main className="auth-page">
    <section className="auth-story"><div className="auth-brand"><Image src="/logo.svg" alt="Atlas Soluções Comerciais" width={190} height={52} priority /></div><div className="auth-copy"><p className="eyebrow">Atlas CRM · Laboratório</p><h1>O próximo passo começa com clareza.</h1><p>Organize propostas, acompanhe a carteira e transforme cada oportunidade em uma conversa bem conduzida.</p></div><p className="auth-foot">© 2026 Atlas Soluções Comerciais · Caso de treinamento</p></section>
    <section className="auth-form-side"><LoginForm configured={hasSupabaseEnv()} error={erro === "config" ? undefined : erro} /></section>
  </main>;
}
