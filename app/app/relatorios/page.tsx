import LogoutButton from "@/components/logout-button";

export default function AppRelatoriosPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="container nav">
          <a className="brand" href="/app">Relatório<span>Fácil</span></a>
          <nav className="navlinks" aria-label="Navegação de relatórios">
            <a href="/app">Operação</a>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <section className="container app-page">
        <div className="app-header">
          <div>
            <div className="eyebrow">Relatórios</div>
            <h1>Histórico e entregas</h1>
            <p>Esta rota já está protegida. A conexão com os dados multi-tenant entra no próximo ciclo.</p>
          </div>
        </div>

        <section className="panel">
          <h2>Estado atual</h2>
          <p className="section-lead">
            O histórico operacional continua no backend atual. Nenhum token de Airtable ou credencial privada é enviado ao navegador.
          </p>
          <div className="status-row"><span>Sessão autenticada</span><span className="status-ok">Ativa</span></div>
          <div className="status-row"><span>PDF com referência única</span><span className="status-ok">Disponível no motor</span></div>
          <div className="status-row"><span>Status Pendente → Gerado → Enviado</span><span className="status-ok">Disponível no motor</span></div>
          <div className="status-row"><span>Filtro por cliente e loja</span><span className="status-next">Próximo ciclo</span></div>
          <div className="status-row"><span>Download e reenvio controlado</span><span className="status-next">Próximo ciclo</span></div>
        </section>
      </section>
    </main>
  );
}
