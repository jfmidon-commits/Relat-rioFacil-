import SignupForm from "./signup-form";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="signup-title">
        <a className="brand auth-brand" href="/">
          Relatório<span>Fácil</span>
        </a>
        <div className="eyebrow">Nova conta</div>
        <h1 id="signup-title">Criar conta no RelatórioFácil</h1>
        <p className="auth-lead">
          Cadastre seu acesso. Depois da confirmação do e-mail, você poderá criar o primeiro cliente e iniciar seu ambiente.
        </p>
        <SignupForm />
        <p className="auth-back">
          Já tem conta? <a href="/login"><strong>Entrar</strong></a>
        </p>
        <a className="auth-back" href="/">← Voltar para o início</a>
      </section>
    </main>
  );
}
