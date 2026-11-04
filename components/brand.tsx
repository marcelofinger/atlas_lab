import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { Navigation } from "@/components/nav";

export function Brand() {
  return <Link href="/dashboard" className="brand" aria-label="Atlas CRM"><Image src="/logo.svg" width={390} height={106} alt="Atlas Soluções Comerciais" priority /></Link>;
}

export function AppShell({ children, email = "" }: { children: React.ReactNode; email?: string }) {
  const initial = (email.split("@")[0]?.[0] ?? "A").toUpperCase();
  return <div className="shell">
    <aside className="sidebar">
      <Brand />
      <Navigation />
      <div className="side-bottom"><p className="tagline">Cada oportunidade com um próximo passo.</p><p className="side-caption">Atlas CRM · Laboratório</p></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="crumb">Atlas <span aria-hidden="true">/</span> Área de trabalho</div><div className="user"><div className="avatar">{initial}</div><div className="user-meta">{email || "Usuário Atlas"}<small>Conta de laboratório</small></div><form action={signOut}><button aria-label="Sair" title="Sair" className="btn secondary" style={{ padding: "8px 10px" }}>Sair</button></form></div></header>
      {children}
    </main>
  </div>;
}
