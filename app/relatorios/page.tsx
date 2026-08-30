export default function RelatoriosPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="container nav">
          <a className="brand" href="/">Relatório<span>Fácil</span></a>
          <nav className="navlinks" aria-label="Navegação de relatórios">
            <a href="/operacao">Operação</a>
            <a className="button" href="/">Início</a>
          </nav>
        </div>
      </header>

      <section className="container app-page">
        <div className="app-header">
          <div>
            <div className="eyebrow">Relatórios</div>
            <h1>Histórico e entregas</h1>
            <p>Esta tela é a base da futura consulta segura de visitas e PDFs por cliente.</p>
          </div>
        </div>

        <section className="panel">
          <h2>Estado atual</h2>
          <p className="section-lead">
            O histórico operacional já existe no backend do MVP. A próxima etapa conecta esta página ao banco de forma autenticada, sem expor tokens no navegador.
          </p>
          <div className="status-row"><span>PDF com referência única</span><span className="status-ok">Disponível no motor</span></div>
          <div className="status-row"><span>Status Pendente → Gerado → Enviado</span><span className="status-ok">Disponível no motor</span></div>
          <div className="status-row"><span>Filtro por cliente e loja</span><span className="status-next">Integração web</span></div>
          <div className="status-row"><span>Download e reenvio controlado</span><span className="status-next">Integração web</span></div>
        </section>
      </section>
    </main>
  );
}
