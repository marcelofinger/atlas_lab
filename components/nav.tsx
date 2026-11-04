"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [["◫", "Dashboard", "/dashboard"], ["▤", "Propostas", "/propostas"], ["◷", "Histórico", "/historico"]];

export function Navigation() {
  const pathname = usePathname();
  return <nav className="nav" aria-label="Navegação principal">{links.map(([icon, label, href]) => <Link key={href} href={href} className={pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`)) ? "active" : undefined}><span className="nav-icon" aria-hidden="true">{icon}</span><span>{label}</span></Link>)}</nav>;
}
