import LogoutButton from "@/components/logout-button";
import { getManagementData } from "@/lib/services/management";

import { createStoreAction, updateStoreAction } from "./actions";
import styles from "../manage.module.css";

const successMessages: Record<string, string> = {
  created: "Loja criada com sucesso.",
  updated: "Loja atualizada com sucesso.",
};

const errorMessages: Record<string, string> = {
  invalid_data: "Revise os dados informados.",
  create_failed: "Não foi possível criar a loja.",
  update_failed: "Não foi possível atualizar a loja.",
  forbidden: "Sua conta não tem permissão para administrar esta loja.",
};

type PageProps = {
  searchParams: Promise<{ client?: string; ok?: string; error?: string }>;
};

export default async function LojasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await getManagementData();
  const selectedClient =
    data.clients.find((client) => client.id === params.client) ?? data.clients[0] ?? null;
  const stores = selectedClient
    ? data.stores.filter((store) => store.clientId === selectedClient.id)
    : [];

  return (
    <main className="shell">
      <header className="topbar">
        <div className="container nav">
          <a className="brand" href="/app">Relatório<span>Fácil</span></a>
          <nav className="navlinks" aria-label="Navegação de lojas">
            <a href="/app">Dashboard</a>
            <a href="/app/clientes">Clientes</a>
            <a href="/app/relatorios">Relatórios</a>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <section className="container app-page">
        <div className="app-header">
          <div>
            <div className="eyebrow">Gestão</div>
            <h1>Lojas</h1>
            <p>Organize as unidades de cada cliente sem misturar dados entre tenants.</p>
          </div>
          <div className={styles.toolbar}>
            <a className="button" href="/app">Dashboard</a>
            <a className="button" href="/app/clientes">Clientes</a>
          </div>
        </div>

        {params.ok && successMessages[params.ok] ? (
          <div className={`notice ${styles.notice}`} role="status">{successMessages[params.ok]}</div>
        ) : null}
        {params.error && errorMessages[params.error] ? (
          <div className={`notice error ${styles.notice}`} role="alert">{errorMessages[params.error]}</div>
        ) : null}
        {data.hasError ? (
          <div className={`notice error ${styles.notice}`} role="alert">Não foi possível carregar as lojas agora.</div>
        ) : null}

        {!data.clients.length ? (
          <section className="panel">
            <h2>Crie um cliente primeiro</h2>
            <p className="section-lead">Toda loja precisa pertencer a um tenant autorizado.</p>
            <a className="button primary" href="/app/clientes">Ir para Clientes</a>
          </section>
        ) : (
          <div className={styles.pageGrid}>
            <div className={styles.clientTabs} aria-label="Selecionar cliente">
              {data.clients.map((client) => (
                <a
                  key={client.id}
                  className={`${styles.clientTab} ${selectedClient?.id === client.id ? styles.clientTabActive : ""}`}
                  href={`/app/lojas?client=${encodeURIComponent(client.id)}`}
                >
                  {client.name}
                </a>
              ))}
            </div>

            <section className="panel">
              <h2>Nova loja · {selectedClient?.name}</h2>
              {selectedClient?.canManage ? (
                <form action={createStoreAction} className={styles.formGrid}>
                  <input type="hidden" name="client_id" value={selectedClient.id} />
                  <label className={styles.field}>
                    Nome da loja
                    <input name="name" type="text" minLength={2} maxLength={160} required placeholder="Ex.: Loja Centro" />
                  </label>
                  <label className={styles.field}>
                    Endereço
                    <input name="address" type="text" maxLength={500} placeholder="Endereço opcional" />
                  </label>
                  <div className={styles.formActions}>
                    <button className="button primary" type="submit">Criar loja</button>
                  </div>
                </form>
              ) : (
                <p className="section-lead">Você pode consultar estas lojas, mas não possui papel administrativo neste cliente.</p>
              )}
            </section>

            <section className="panel">
              <h2>Lojas de {selectedClient?.name}</h2>
              {stores.length ? (
                <div className={styles.list}>
                  {stores.map((store) => (
                    <article className={styles.item} key={store.id}>
                      <div className={styles.itemHeader}>
                        <div>
                          <strong>{store.name}</strong>
                          <div className={styles.meta}>
                            <span className={`${styles.badge} ${!store.isActive ? styles.badgePaused : ""}`}>
                              {store.isActive ? "Ativa" : "Inativa"}
                            </span>
                            {store.address ? <span>{store.address}</span> : <span>Sem endereço informado</span>}
                          </div>
                        </div>
                      </div>

                      {selectedClient?.canManage ? (
                        <form action={updateStoreAction} className={styles.formGrid}>
                          <input type="hidden" name="store_id" value={store.id} />
                          <input type="hidden" name="client_id" value={store.clientId} />
                          <label className={styles.field}>
                            Nome
                            <input name="name" type="text" minLength={2} maxLength={160} defaultValue={store.name} required />
                          </label>
                          <label className={styles.field}>
                            Endereço
                            <input name="address" type="text" maxLength={500} defaultValue={store.address ?? ""} />
                          </label>
                          <label className={styles.checkboxRow}>
                            <input name="is_active" type="checkbox" defaultChecked={store.isActive} />
                            Loja ativa
                          </label>
                          <div className={styles.formActions}>
                            <button className="button primary" type="submit">Salvar alterações</button>
                          </div>
                        </form>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>Nenhuma loja cadastrada para este cliente ainda.</p>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
