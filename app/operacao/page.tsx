const auditFormUrl = process.env.NEXT_PUBLIC_AUDIT_FORM_URL ?? "https://tally.so/r/0QRR4A";
const reportsUrl = process.env.NEXT_PUBLIC_REPORTS_URL;

export default function OperacaoPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="container nav">
          <a className="brand" href="/">Relatório<span>Fácil</span></a>
          <nav className="navlinks" aria-label="Navegação operacional">
            <a href="/">Início</a>
            <a href="/relatorios">Relatórios</a>
            <a className="button primary" href={auditFormUrl} target="_blank" rel="noreferrer">Nova auditoria</a>
          </nav>
        </div>
      </header>

      <section className="container app-page">
        <div className="app-header">
          <div>
            <div className="eyebrow">Operação</div>
            <h1>Central do RelatórioFácil</h1>
            <p>Acompanhe o fluxo e acesse as ações principais do MVP.</p>
          </div>
          <div className="actions">
            <a className="button primary" href={auditFormUrl} target="_blank" rel="noreferrer">Nova visita</a>
            {reportsUrl ? <a className="button" href={reportsUrl} target="_blank" rel="noreferrer">Abrir arquivos</a> : null}
          </div>
        </div>

        <div className="dashboard">
          <div className="metric"><span>Motor operacional</span><strong>Validado</strong></div>
          <div className="metric"><span>Geração de PDF</span><strong>Ativa</strong></div>
          <div className="metric"><span>Proteção contra duplicidade</span><strong>Ativa</strong></div>
        </div>

        <section className="panel">
          <h2>Pipeline</h2>
          <div className="status-row"><span>Entrada da auditoria</span><span className="status-ok">Operacional</span></div>
          <div className="status-row"><span>Nota e não conformidades</span><span className="status-ok">Operacional</span></div>
          <div className="status-row"><span>Fotos e relatório</span><span className="status-ok">Operacional</span></div>
          <div className="status-row"><span>PDF e armazenamento</span><span className="status-ok">Operacional</span></div>
          <div className="status-row"><span>Envio controlado por cliente</span><span className="status-ok">Operacional</span></div>
        </section>

        <section className="panel">
          <h2>Próxima evolução</h2>
          <div className="status-row"><span>Login e isolamento por cliente</span><span className="status-next">Próximo</span></div>
          <div className="status-row"><span>Clientes e lojas dentro do app</span><span className="status-next">Próximo</span></div>
          <div className="status-row"><span>Histórico conectado ao banco</span><span className="status-next">Próximo</span></div>
        </section>
      </section>
    </main>
  );
}
