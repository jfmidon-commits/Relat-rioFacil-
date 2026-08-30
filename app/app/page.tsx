import LogoutButton from "@/components/logout-button";
import { getDashboardData } from "@/lib/services/dashboard";

const auditFormUrl = process.env.NEXT_PUBLIC_AUDIT_FORM_URL ?? "https://tally.so/r/0QRR4A";

const classificationLabels: Record<string, string> = {
  excellent: "Excelente",
  good: "Bom",
  attention: "Atenção",
  critical: "Crítico",
};

const statusLabels: Record<string, string> = {
  submitted: "Enviada",
  processing: "Processando",
  completed: "Concluída",
  error: "Erro",
};

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function AppHomePage() {
  const dashboard = await getDashboardData();
  const { metrics } = dashboard;

  return (
    <main className="shell">
      <header className="topbar">
        <div className="container nav">
          <a className="brand" href="/app">Relatório<span>Fácil</span></a>
          <nav className="navlinks" aria-label="Navegação operacional">
            <a href="/app/relatorios">Relatórios</a>
            <a className="button primary" href={auditFormUrl} target="_blank" rel="noreferrer">Nova auditoria</a>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <section className="container app-page">
        <div className="app-header">
          <div>
            <div className="eyebrow">Dashboard</div>
            <h1>{dashboard.client?.name ?? "Central do RelatórioFácil"}</h1>
            <p>
              {dashboard.client
                ? `Dados reais do seu ambiente · ${roleLabels[dashboard.role ?? ""] ?? "Usuário"}`
                : "Acompanhe visitas, qualidade e entregas em um único lugar."}
            </p>
          </div>
          <div className="actions">
            <a className="button primary" href={auditFormUrl} target="_blank" rel="noreferrer">Nova visita</a>
            <a className="button" href="/app/relatorios">Relatórios</a>
          </div>
        </div>

        {dashboard.hasError ? (
          <div className="notice error dashboard-notice" role="alert">
            Não foi possível carregar os indicadores agora. Tente novamente em instantes.
          </div>
        ) : null}

        {dashboard.needsOnboarding ? (
          <section className="panel empty-state">
            <div className="empty-state-icon" aria-hidden="true">RF</div>
            <div>
              <h2>Seu ambiente está pronto para começar</h2>
              <p>
                Sua conta ainda não está vinculada a um cliente. Quando o primeiro cliente for criado,
                este painel passará a mostrar visitas, notas, não conformidades e relatórios reais.
              </p>
            </div>
          </section>
        ) : (
          <>
            <div className="dashboard dashboard-five">
              <div className="metric"><span>Total de visitas</span><strong>{metrics.totalVisits}</strong></div>
              <div className="metric"><span>Nota média</span><strong>{metrics.averageScore === null ? "—" : metrics.averageScore.toFixed(1)}</strong></div>
              <div className="metric"><span>Não conformidades</span><strong>{metrics.nonconformities}</strong></div>
              <div className="metric"><span>PDFs gerados</span><strong>{metrics.reportsGenerated}</strong></div>
              <div className="metric"><span>PDFs enviados</span><strong>{metrics.reportsSent}</strong></div>
            </div>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Visitas recentes</h2>
                  <p>Últimas avaliações disponíveis para o cliente autenticado.</p>
                </div>
              </div>

              {dashboard.recentVisits.length ? (
                <div className="visit-list">
                  {dashboard.recentVisits.map((visit) => (
                    <article className="visit-row" key={visit.id}>
                      <div className="visit-main">
                        <strong>{visit.storeName}</strong>
                        <span>{dateFormatter.format(new Date(visit.occurredAt))}</span>
                      </div>
                      <div className="visit-meta">
                        <span className="badge">{classificationLabels[visit.classification ?? ""] ?? "Sem classificação"}</span>
                        <span>{visit.score === null ? "Sem nota" : `Nota ${visit.score.toFixed(1)}`}</span>
                        <span>{statusLabels[visit.status] ?? visit.status}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-inline">
                  <strong>Nenhuma visita registrada ainda.</strong>
                  <span>Faça a primeira auditoria para começar a alimentar o dashboard.</span>
                </div>
              )}
            </section>

            <section className="panel tenant-status">
              <h2>Ambiente</h2>
              <div className="status-row"><span>Cliente</span><span className="status-ok">{dashboard.client?.name}</span></div>
              <div className="status-row"><span>Status</span><span className="status-ok">{dashboard.client?.status === "active" ? "Ativo" : "Pausado"}</span></div>
              <div className="status-row"><span>Isolamento de dados</span><span className="status-ok">Multi-tenant ativo</span></div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
