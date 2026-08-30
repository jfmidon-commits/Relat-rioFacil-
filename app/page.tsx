const auditFormUrl = process.env.NEXT_PUBLIC_AUDIT_FORM_URL ?? "https://tally.so/r/0QRR4A";

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="container nav">
          <a className="brand" href="/">Relatório<span>Fácil</span></a>
          <nav className="navlinks" aria-label="Navegação principal">
            <a href="#como-funciona">Como funciona</a>
            <a href="#beneficios">Benefícios</a>
            <a className="button" href="/login">Área do cliente</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">Auditoria de campo sem retrabalho</div>
            <h1>Da visita ao PDF enviado, em um único fluxo.</h1>
            <p>
              Registre checklist, observações e fotos. O RelatórioFácil organiza os dados,
              calcula a nota, gera o relatório e prepara a entrega para o cliente.
            </p>
            <div className="actions">
              <a className="button primary" href={auditFormUrl} target="_blank" rel="noreferrer">
                Iniciar auditoria
              </a>
              <a className="button" href="/login">Entrar na área segura</a>
            </div>
          </div>

          <aside className="hero-card" id="como-funciona">
            <div className="eyebrow">Fluxo validado</div>
            <div className="flow">
              {[
                "Coleta da visita",
                "Checklist e evidências",
                "Nota e não conformidades",
                "PDF com fotos",
                "Drive, e-mail e histórico",
              ].map((item, index) => (
                <div className="flow-item" key={item}>
                  <div className="flow-index">{index + 1}</div>
                  <strong>{item}</strong>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="section" id="beneficios">
        <div className="container">
          <h2>Menos trabalho manual. Mais consistência.</h2>
          <p className="section-lead">
            A camada web organiza a experiência do usuário enquanto o motor de automação cuida do processamento em segundo plano.
          </p>
          <div className="cards">
            <article className="card">
              <strong>Auditoria padronizada</strong>
              <p>Checklist simples, nota automática e evidências vinculadas à visita.</p>
            </article>
            <article className="card">
              <strong>Relatório profissional</strong>
              <p>PDF com identificação da loja, não conformidades, observações e registro fotográfico.</p>
            </article>
            <article className="card">
              <strong>Rastreabilidade</strong>
              <p>Status de processamento, referência única e histórico para reduzir duplicidade e perda de informação.</p>
            </article>
          </div>
        </div>
      </section>

      <footer>
        <div className="container">RelatórioFácil · MVP em evolução controlada</div>
      </footer>
    </main>
  );
}
