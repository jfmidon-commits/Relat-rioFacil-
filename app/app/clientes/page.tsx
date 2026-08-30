import LogoutButton from "@/components/logout-button";
import { getManagementData } from "@/lib/services/management";

import { createClientAction, updateClientAction } from "./actions";
import styles from "../manage.module.css";

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
};

const successMessages: Record<string, string> = {
  created: "Cliente criado com sucesso.",
  updated: "Cliente atualizado com sucesso.",
};

const errorMessages: Record<string, string> = {
  invalid_name: "Informe um nome de cliente válido.",
  invalid_data: "Revise os dados informados.",
  create_failed: "Não foi possível criar o cliente.",
  update_failed: "Não foi possível atualizar o cliente.",
  forbidden: "Sua conta não tem permissão para alterar este cliente.",
};

type PageProps = {
  searchParams: Promise<{ ok?: string; error?: string }>;
};

export default async function ClientesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await getManagementData();

  return (
    <main className="shell">
      <header className="topbar">
        <div className="container nav">
          <a className="brand" href="/app">Relatório<span>Fácil</span></a>
          <nav className="navlinks" aria-label="Navegação de clientes">
            <a href="/app">Dashboard</a>
            <a href="/app/lojas">Lojas</a>
            <a href="/app/relatorios">Relatórios</a>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <section className="container app-page">
        <div className="app-header">
          <div>
            <div className="eyebrow">Gestão</div>
            <h1>Clientes</h1>
            <p>Cadastre e mantenha os ambientes que você tem permissão para administrar.</p>
          </div>
          <div className={styles.toolbar}>
            <a className="button" href="/app">Dashboard</a>
            <a className="button" href="/app/lojas">Lojas</a>
          </div>
        </div>

        {params.ok && successMessages[params.ok] ? (
          <div className={`notice ${styles.notice}`} role="status">{successMessages[params.ok]}</div>
        ) : null}
        {params.error && errorMessages[params.error] ? (
          <div className={`notice error ${styles.notice}`} role="alert">{errorMessages[params.error]}</div>
        ) : null}
        {data.hasError ? (
          <div className={`notice error ${styles.notice}`} role="alert">Não foi possível carregar seus clientes agora.</div>
        ) : null}

        <div className={styles.pageGrid}>
          <section className="panel">
            <h2>Novo cliente</h2>
            <p className="section-lead">Ao criar um cliente, sua conta se torna proprietária desse tenant automaticamente.</p>
            <form action={createClientAction} className={styles.formGrid}>
              <label className={`${styles.field} ${styles.fieldFull}`}>
                Nome do cliente
                <input name="name" type="text" minLength={2} maxLength={160} required autoComplete="organization" placeholder="Ex.: Rede Exemplo" />
              </label>
              <div className={styles.formActions}>
                <button className="button primary" type="submit">Criar cliente</button>
              </div>
            </form>
          </section>

          <section className="panel">
            <h2>Seus clientes</h2>
            {data.clients.length ? (
              <div className={styles.list}>
                {data.clients.map((client) => (
                  <article className={styles.item} key={client.id}>
                    <div className={styles.itemHeader}>
                      <div>
                        <strong>{client.name}</strong>
                        <div className={styles.meta}>
                          <span>{roleLabels[client.role] ?? client.role}</span>
                          <span>•</span>
                          <span className={`${styles.badge} ${client.status === "paused" ? styles.badgePaused : ""}`}>
                            {client.status === "paused" ? "Pausado" : "Ativo"}
                          </span>
                        </div>
                      </div>
                      <a className="button" href={`/app/lojas?client=${encodeURIComponent(client.id)}`}>Ver lojas</a>
                    </div>

                    {client.canManage ? (
                      <form action={updateClientAction} className={styles.formGrid}>
                        <input type="hidden" name="client_id" value={client.id} />
                        <label className={styles.field}>
                          Nome
                          <input name="name" type="text" minLength={2} maxLength={160} defaultValue={client.name} required />
                        </label>
                        <label className={styles.field}>
                          Status
                          <select name="status" defaultValue={client.status}>
                            <option value="active">Ativo</option>
                            <option value="paused">Pausado</option>
                          </select>
                        </label>
                        <div className={styles.formActions}>
                          <button className="button primary" type="submit">Salvar alterações</button>
                        </div>
                      </form>
                    ) : (
                      <p className="section-lead">Você tem acesso de leitura a este cliente, sem permissão administrativa.</p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.empty}>Nenhum cliente vinculado à sua conta ainda. Use o formulário acima para criar o primeiro.</p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
