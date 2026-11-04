"use client";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="content"><p className="eyebrow">Não foi possível carregar</p><h1>O dashboard não abriu.</h1><p className="subtle">Tente novamente. Se o problema continuar, verifique a conexão com o Supabase.</p><button className="btn" onClick={() => reset()} style={{ marginTop: 20 }}>Tentar novamente</button></section>;
}
