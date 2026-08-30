import LogoutButton from "@/components/logout-button";
import { getReportHistory } from "@/lib/services/history";
import styles from "../manage.module.css";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  generated: "Gerado",
  sent: "Enviado",
  error: "Erro",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type PageProps = {
  searchParams: Promise<{ client?: string; store?: string; status?: string; from?: string; to?: string }>;
};

export default async function AppRelatoriosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await getReportHistory(params);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="container nav">
          <a className="brand" href="/app">Relatório<span>Fácil</span></a>
          <nav className="navlinks" aria-label="Navegação de relatórios">
            <a href="/app">Dashboard</a>
            <a href="/app/visitas">Visitas</a>
            <a href="/app/clientes">Clientes</a>
            <a href="/app/lojas">Lojas</a>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <section className="container app-page">
        <div className="app-header">
          <div>
            <div className="eyebrow">Histórico</div>
            <h1>Relatórios</h1>
            <p>Consulte PDFs e estados de processamento do tenant selecionado.</p>
          </div>
          <div className={styles.toolbar}>
            <a className="button" href="/app">Dashboard</a>
            <a className="button" href="/app/visitas">Visitas</a>
          </div>
        </div>

        {data.hasError ? (
          <div className="notice error" role="alert">Não foi possível carregar o histórico de relatórios.</div>
        ) : null}

        {!data.clients.length ? (
          <section className="panel">
            <h2>Nenhum cliente disponível</h2>
            <p className="section-lead">Crie o primeiro cliente antes de consultar relatórios no novo banco.</p>
            <a className="button primary" href="/app/clientes">Ir para Clientes</a>
          </section>
        ) : (
          <div className={styles.pageGrid}>
            <section className="panel">
              <h2>Filtros</h2>
              <form method="get" className={styles.formGrid}>
                <label className={styles.field}>
                  Cliente
                  <select name="client" defaultValue={data.selectedClient?.id ?? ""}>
                    {data.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  Loja
                  <select name="store" defaultValue={params.store ?? ""}>
                    <option value="">Todas</option>
                    {data.stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  Status
                  <select name="status" defaultValue={params.status ?? ""}>
                    <option value="">Todos</option>
                    <option value="pending">Pendente</option>
                    <option value="generated">Gerado</option>
                    <option value="sent">Enviado</option>
                    <option value="error">Erro</option>
                  </select>
                </label>
                <label className={styles.field}>
                  De
                  <input type="date" name="from" defaultValue={params.from ?? ""} />
                </label>
                <label className={styles.field}>
                  Até
                  <input type="date" name="to" defaultValue={params.to ?? ""} />
                </label>
                <div className={styles.formActions}>
                  <a className="button" href="/app/relatorios">Limpar</a>
                  <button className="button primary" type="submit">Aplicar filtros</button>
                </div>
              </form>
            </section>

            <section className="panel">
              <h2>Resultados · {data.selectedClient?.name}</h2>
              {data.reports.length ? (
                <div className={styles.list}>
                  {data.reports.map((report) => (
                    <article className={styles.item} key={report.id}>
                      <div className={styles.itemHeader}>
                        <div>
                          <strong>{report.storeName}</strong>
                          <div className={styles.meta}>
                            <span>Relatório v{report.version}</span>
                            <span>•</span>
                            <span>Criado em {dateFormatter.format(new Date(report.createdAt))}</span>
                            {report.visitOccurredAt ? <><span>•</span><span>Visita em {dateFormatter.format(new Date(report.visitOccurredAt))}</span></> : null}
                          </div>
                        </div>
                        <div className={styles.toolbar}>
                          <span className={styles.badge}>{statusLabels[report.status] ?? report.status}</span>
                          {report.pdfUrl ? (
                            <a className="button" href={report.pdfUrl} target="_blank" rel="noreferrer">Abrir PDF</a>
                          ) : null}
                        </div>
                      </div>
                      {report.sentAt ? <p className="section-lead">Enviado em {dateFormatter.format(new Date(report.sentAt))}</p> : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>Nenhum relatório encontrado com os filtros atuais.</p>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
