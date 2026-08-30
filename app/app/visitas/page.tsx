import LogoutButton from "@/components/logout-button";
import { getVisitHistory } from "@/lib/services/history";
import styles from "../manage.module.css";

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

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type PageProps = {
  searchParams: Promise<{ client?: string; store?: string; status?: string; from?: string; to?: string }>;
};

export default async function VisitasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await getVisitHistory(params);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="container nav">
          <a className="brand" href="/app">Relatório<span>Fácil</span></a>
          <nav className="navlinks" aria-label="Navegação de visitas">
            <a href="/app">Dashboard</a>
            <a href="/app/clientes">Clientes</a>
            <a href="/app/lojas">Lojas</a>
            <a href="/app/relatorios">Relatórios</a>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <section className="container app-page">
        <div className="app-header">
          <div>
            <div className="eyebrow">Histórico</div>
            <h1>Visitas</h1>
            <p>Consulte as avaliações do tenant selecionado com filtros server-side.</p>
          </div>
          <div className={styles.toolbar}>
            <a className="button" href="/app">Dashboard</a>
            <a className="button" href="/app/relatorios">Relatórios</a>
          </div>
        </div>

        {data.hasError ? (
          <div className="notice error" role="alert">Não foi possível carregar o histórico de visitas.</div>
        ) : null}

        {!data.clients.length ? (
          <section className="panel">
            <h2>Nenhum cliente disponível</h2>
            <p className="section-lead">Crie um cliente e uma loja antes de registrar visitas no novo banco.</p>
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
                    <option value="submitted">Enviada</option>
                    <option value="processing">Processando</option>
                    <option value="completed">Concluída</option>
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
                  <a className="button" href="/app/visitas">Limpar</a>
                  <button className="button primary" type="submit">Aplicar filtros</button>
                </div>
              </form>
            </section>

            <section className="panel">
              <h2>Resultados · {data.selectedClient?.name}</h2>
              {data.visits.length ? (
                <div className={styles.list}>
                  {data.visits.map((visit) => (
                    <article className={styles.item} key={visit.id}>
                      <div className={styles.itemHeader}>
                        <div>
                          <strong>{visit.storeName}</strong>
                          <div className={styles.meta}>
                            <span>{dateFormatter.format(new Date(visit.occurredAt))}</span>
                            <span>•</span>
                            <span>{visit.score === null ? "Sem nota" : `Nota ${visit.score.toFixed(1)}`}</span>
                            <span>•</span>
                            <span>{visit.nonconformities} não conformidade(s)</span>
                          </div>
                        </div>
                        <div className={styles.meta}>
                          <span className={styles.badge}>{classificationLabels[visit.classification ?? ""] ?? "Sem classificação"}</span>
                          <span className={styles.badge}>{statusLabels[visit.status] ?? visit.status}</span>
                        </div>
                      </div>
                      {visit.notes ? <p className="section-lead">{visit.notes}</p> : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>Nenhuma visita encontrada com os filtros atuais.</p>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
