import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <a className="brand auth-brand" href="/">
          Relatório<span>Fácil</span>
        </a>
        <div className="eyebrow">Área segura</div>
        <h1 id="login-title">Entrar no RelatórioFácil</h1>
        <p className="auth-lead">
          Acesse a operação, clientes, lojas, visitas e relatórios do seu ambiente.
        </p>
        <LoginForm />
        <p className="auth-back">
          Ainda não tem conta? <a href="/cadastro"><strong>Criar conta</strong></a>
        </p>
        <a className="auth-back" href="/">← Voltar para o início</a>
      </section>
    </main>
  );
}
