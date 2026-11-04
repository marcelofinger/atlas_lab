import { signIn } from "@/app/actions";

export function LoginForm({ error, configured }: { error?: string; configured: boolean }) {
  return <form action={signIn} className="auth-form">
    <p className="login-mark">ACESSO AO CRM</p>
    <h2>Bem-vindo de volta</h2>
    <p className="subtle">Entre com sua conta Atlas para continuar.</p>
    {!configured && <div className="notice"><span>i</span><span>Conecte o projeto Supabase para habilitar a autenticação e os dados do CRM.</span></div>}
    {error && <p className="error-text" role="alert">{error}</p>}
    <div className="field"><label htmlFor="email">E-mail</label><input id="email" className="field-input" type="email" name="email" autoComplete="username" required /></div>
    <div className="field"><label htmlFor="password">Senha</label><input id="password" className="field-input" type="password" name="password" autoComplete="current-password" required /></div>
    <button className={`btn ${configured ? "" : "disabled"}`} disabled={!configured}>Entrar no Atlas CRM <span>→</span></button>
    <p className="subtle" style={{ textAlign: "center", marginTop: 18, fontSize: 11 }}>Acesso restrito a contas autorizadas.</p>
  </form>;
}
