import LogoutButton from "@/components/logout-button";
import { getAirtableImportPreview } from "@/lib/services/airtable-import";
import styles from "../manage.module.css";
import { importAirtableAction } from "./actions";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const stateLabels = {
  new: "Novo",
  update: "Atualizar",
  synced: "Sincronizado",
  skipped: "Ignorado",
} as const;

const reportLabels = {
  generated: "PDF gerado",
  sent: "PDF enviado",
} as const;

type PageProps = {
  searchParams: Promise<{
    client?: string;
    ok?: string;
    error?: string;
    new?: string;
    updated?: string;
    skipped?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid_client: "Selecione um cliente válido.",
  not_configured: "A integração com Airtable ainda não foi configurada neste ambiente.",
  disabled: "A importação está em modo seguro e ainda não foi habilitada neste ambiente.",
  forbidden_or_unavailable: "Seu usuário não pode importar dados para esse cliente.",
  forbidden: "Seu usuário não tem permissão administrativa para esse cliente.",
  client_not_found: "Não foi encontrado um cliente correspondente no Airtable.",
  client_ambiguous: "Há mais de um cliente correspondente no Airtable; a importação foi bloqueada por segurança.",
  import_failed: "A importação não pôde ser concluída.",
};

export default async function ImportarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await getAirtableImportPreview(params.client);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="container nav">
          <a className="brand" href="/app">Relatório<span>Fácil</span></a>
          <nav className="navlinks" aria-label="Navegação de importação">
            <a href="/app">Dashboard</a>
            <a href="/app/visitas">Visitas</a>
            <a href="/app/relatorios">Relatórios</a>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <section className="container app-page">
        <div className="app-header">
          <div>
            <div className="eyebrow">Migração segura</div>
            <h1>Airtable → Supabase</h1>
            <p>Pré-visualize registros concluídos do motor atual antes de copiá-los para o novo banco.</p>
          </div>
          <div className={styles.toolbar}>
            <a className="button" href="/app/visitas">Visitas</a>
            <a className="button" href="/app/relatorios">Relatórios</a>
          </div>
        </div>

        {params.ok === "imported" ? (
          <div className="notice success" role="status">
            Importação concluída: {params.new ?? "0"} novo(s), {params.updated ?? "0"} atualizado(s) e {params.skipped ?? "0"} ignorado(s).
          </div>
        ) : null}

        {params.error ? (
          <div className="notice error" role="alert">
            {errorMessages[params.error] ?? "Não foi possível concluir a importação."}
          </div>
        ) : null}

        {data.hasError ? (
          <div className="notice error" role="alert">Não foi possível montar o preview de importação.</div>
        ) : null}

        {!data.clients.length ? (
          <section className="panel">
            <h2>Nenhum cliente administrável</h2>
            <p className="section-lead">A importação exige papel de proprietário ou administrador em pelo menos um cliente.</p>
            <a className="button primary" href="/app/clientes">Ir para Clientes</a>
          </section>
        ) : (
          <div className={styles.pageGrid}>
            <section className="panel">
              <h2>Escopo</h2>
              <form method="get" className={styles.formGrid}>
                <label className={styles.field}>
                  Cliente de destino
                  <select name="client" defaultValue={data.selectedClient?.id ?? ""}>
                    {data.clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </label>
                <div className={styles.formActions}>
                  <button className="button" type="submit">Atualizar preview</button>
                </div>
              </form>

              <div className="status-row"><span>Airtable configurado</span><span className={data.configured ? "status-ok" : "status-next"}>{data.configured ? "Sim" : "Não"}</span></div>
              <div className="status-row"><span>Importação liberada</span><span className={data.importEnabled ? "status-ok" : "status-next"}>{data.importEnabled ? "Sim" : "Não"}</span></div>
              <div className="status-row"><span>Registros prontos</span><strong>{data.readyCount}</strong></div>
              <div className="status-row"><span>Já sincronizados</span><strong>{data.syncedCount}</strong></div>
              <div className="status-row"><span>Ignorados por segurança</span><strong>{data.skippedCount}</strong></div>
            </section>

            {data.mappingError ? (
              <div className="notice warning" role="status">
                {data.mappingError === "client_ambiguous"
                  ? "Há mais de um cliente com esse nome no Airtable. O sistema não fará suposições."
                  : "O nome do cliente selecionado ainda não corresponde a um cliente do Airtable."}
              </div>
            ) : null}

            <section className="panel">
              <h2>Preview · {data.selectedClient?.name}</h2>
              {data.items.length ? (
                <div className={styles.list}>
                  {data.items.map((item) => (
                    <article className={styles.item} key={item.recordId}>
                      <div className={styles.itemHeader}>
                        <div>
                          <strong>{item.storeName}</strong>
                          <div className={styles.meta}>
                            <span>{dateFormatter.format(new Date(item.occurredAt))}</span>
                            <span>•</span>
                            <span>{item.score === null ? "Sem nota" : `Nota ${item.score.toFixed(1)}`}</span>
                            <span>•</span>
                            <span>{item.classificationLabel}</span>
                          </div>
                        </div>
                        <div className={styles.meta}>
                          <span className={styles.badge}>{stateLabels[item.state]}</span>
                          <span className={styles.badge}>{reportLabels[item.reportStatus]}</span>
                          {!item.hasPdf ? <span className={styles.badge}>Sem link PDF</span> : null}
                        </div>
                      </div>
                      <div className={styles.meta}>
                        <span>Origem: {item.recordId}</span>
                        {item.reason ? <span>• {item.reason}</span> : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>
                  {data.configured ? "Nenhum registro disponível para esse cliente." : "Configure as variáveis server-side do Airtable para carregar o preview."}
                </p>
              )}
            </section>

            <section className="panel">
              <h2>Executar importação</h2>
              <p className="section-lead">
                A operação apenas copia dados concluídos para o Supabase. O Airtable, os PDFs e a automação atual não são alterados.
              </p>
              <form action={importAirtableAction}>
                <input type="hidden" name="client_id" value={data.selectedClient?.id ?? ""} />
                <button
                  className="button primary"
                  type="submit"
                  disabled={!data.importEnabled || !data.configured || !data.readyCount || Boolean(data.mappingError)}
                >
                  Importar {data.readyCount} registro(s) pronto(s)
                </button>
              </form>
              {!data.importEnabled ? (
                <p className={styles.empty}>Por segurança, o botão só é liberado quando `AIRTABLE_IMPORT_ENABLED=true` estiver configurado no servidor.</p>
              ) : null}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
