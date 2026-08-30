import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const AIRTABLE_TABLES = {
  clients: "tblR08PZ0MiIOtUzi",
  stores: "tbl79Ck2Ss1GABTkp",
  visits: "tbltSnIPR5HMwhTax",
} as const;

const FIELDS = {
  clientName: "fld0VigkpsCON4eYy",
  storeName: "fld8VOomnwmGd1XFD",
  storeClientLink: "fldqNXKPbN0o74HI5",
  visitStoreLink: "fldul6k3ADRIr9I6G",
  auditor: "fldFHp8crvv0JeU6u",
  occurredAt: "fldTP3uI2uKBZcBdI",
  score: "fldv4j5XbwjBc7mDN",
  pdfStatus: "fldmKgKSerU4bTjQy",
  pdfUrl: "fldMjOqOQnDagvGLc",
  notes: "fldRYwTJbATAR1Zlu",
  processedAt: "fld6ldxlrrTdakewP",
  ignoreAutomation: "fldF2j5o8nMIn8DiX",
  classification: "fldXaTDE2jL00C5L4",
  fachada: "fldQbrbdVyXQOrGUh",
  tempo: "fldCIDosTRNnOcHFZ",
  precificacao: "fld0bV1N9CzxZ5EE9",
  limpeza: "fldcIUnYJm6hbLbJw",
  postura: "fldtMpRMg6aMP641F",
  fachadaObs: "fldX9dVrkTma8zXw8",
  tempoObs: "fld31kq1kL4xSvAcC",
  precificacaoObs: "fldDA56ddTevNeRsX",
  limpezaObs: "fldKDs593pBRUet49",
  posturaObs: "fldj34ab2sBBWQ5jB",
} as const;

type AirtableRecord = {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
};

type AirtableListResponse = {
  records?: AirtableRecord[];
  offset?: string;
};

type ImportClient = {
  id: string;
  name: string;
  status: string;
  role: string;
};

type ImportStore = {
  id: string;
  name: string;
  isActive: boolean;
};

type ChecklistEntry = {
  label: string;
  answer: string | null;
  observation: string | null;
};

type ImportCandidate = {
  recordId: string;
  createdTime: string;
  storeId: string;
  storeName: string;
  occurredAt: string;
  sourceUpdatedAt: string;
  score: number | null;
  classification: "excellent" | "good" | "attention" | "critical" | null;
  classificationLabel: string;
  notes: string | null;
  checklist: Record<string, ChecklistEntry | { auditor: string | null }>;
  nonconformities: Array<{ key: string; label: string; observation: string | null }>;
  reportStatus: "generated" | "sent";
  pdfUrl: string | null;
  sentAt: string | null;
  existingVisitId: string | null;
  state: "new" | "update" | "synced";
};

export type AirtableImportPreviewItem = {
  recordId: string;
  storeName: string;
  occurredAt: string;
  score: number | null;
  classificationLabel: string;
  reportStatus: "generated" | "sent";
  hasPdf: boolean;
  state: "new" | "update" | "synced" | "skipped";
  reason: string | null;
};

export type AirtableImportPreview = {
  clients: ImportClient[];
  selectedClient: ImportClient | null;
  stores: ImportStore[];
  configured: boolean;
  importEnabled: boolean;
  hasError: boolean;
  mappingError: string | null;
  items: AirtableImportPreviewItem[];
  readyCount: number;
  syncedCount: number;
  skippedCount: number;
};

type ImportPlan = AirtableImportPreview & {
  candidates: ImportCandidate[];
};

const normalizeName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

function readText(fields: Record<string, unknown>, fieldId: string) {
  const value = fields[fieldId];
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === "string" ? name.trim() : "";
  }
  return "";
}

function readNumber(fields: Record<string, unknown>, fieldId: string) {
  const value = fields[fieldId];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBoolean(fields: Record<string, unknown>, fieldId: string) {
  return fields[fieldId] === true;
}

function readLinks(fields: Record<string, unknown>, fieldId: string) {
  const value = fields[fieldId];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "id" in item) {
        const id = (item as { id?: unknown }).id;
        return typeof id === "string" ? id : "";
      }
      return "";
    })
    .filter(Boolean);
}

function mapClassification(value: string) {
  const normalized = normalizeName(value);
  if (normalized === "excelente") return "excellent" as const;
  if (normalized === "bom") return "good" as const;
  if (normalized === "atencao") return "attention" as const;
  if (normalized === "critico") return "critical" as const;
  return null;
}

function getAirtableConfig() {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  return {
    token,
    baseId,
    configured: Boolean(token && baseId),
    importEnabled: process.env.AIRTABLE_IMPORT_ENABLED === "true",
  };
}

async function fetchAirtableTable(tableId: string, fieldIds: string[]) {
  const { token, baseId } = getAirtableConfig();
  if (!token || !baseId) throw new Error("airtable_not_configured");

  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  for (let page = 0; page < 5; page += 1) {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("returnFieldsByFieldId", "true");
    fieldIds.forEach((fieldId) => url.searchParams.append("fields[]", fieldId));
    if (offset) url.searchParams.set("offset", offset);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`airtable_http_${response.status}`);
    const payload = (await response.json()) as AirtableListResponse;
    allRecords.push(...(payload.records ?? []));
    offset = payload.offset;
    if (!offset) break;
  }

  return allRecords;
}

async function getImportScope(requestedClientId?: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { supabase, clients: [] as ImportClient[], selectedClient: null, stores: [] as ImportStore[], hasError: true };
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("client_memberships")
    .select("client_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (membershipError) {
    return { supabase, clients: [] as ImportClient[], selectedClient: null, stores: [] as ImportStore[], hasError: true };
  }

  const manageable = (memberships ?? []).filter(
    (membership) => membership.role === "owner" || membership.role === "admin",
  );
  const clientIds = manageable.map((membership) => membership.client_id);

  if (!clientIds.length) {
    return { supabase, clients: [] as ImportClient[], selectedClient: null, stores: [] as ImportStore[], hasError: false };
  }

  const roleByClient = new Map(manageable.map((membership) => [membership.client_id, membership.role]));
  const { data: clientRows, error: clientsError } = await supabase
    .from("clients")
    .select("id, name, status")
    .in("id", clientIds)
    .order("name", { ascending: true });

  if (clientsError) {
    return { supabase, clients: [] as ImportClient[], selectedClient: null, stores: [] as ImportStore[], hasError: true };
  }

  const clients: ImportClient[] = (clientRows ?? []).map((client) => ({
    id: client.id,
    name: client.name,
    status: client.status,
    role: roleByClient.get(client.id) ?? "admin",
  }));
  const selectedClient = clients.find((client) => client.id === requestedClientId) ?? clients[0] ?? null;

  if (!selectedClient) {
    return { supabase, clients, selectedClient: null, stores: [] as ImportStore[], hasError: false };
  }

  const { data: storeRows, error: storesError } = await supabase
    .from("stores")
    .select("id, name, is_active")
    .eq("client_id", selectedClient.id)
    .order("name", { ascending: true });

  return {
    supabase,
    clients,
    selectedClient,
    stores: (storeRows ?? []).map((store) => ({ id: store.id, name: store.name, isActive: store.is_active })),
    hasError: Boolean(storesError),
  };
}

function buildChecklist(fields: Record<string, unknown>) {
  const definitions = [
    ["fachada_e_vitrine", "Fachada e vitrine", FIELDS.fachada, FIELDS.fachadaObs],
    ["tempo_de_atendimento", "Tempo de atendimento", FIELDS.tempo, FIELDS.tempoObs],
    ["precificacao_conferida", "Precificação conferida", FIELDS.precificacao, FIELDS.precificacaoObs],
    ["limpeza_e_organizacao", "Limpeza e organização", FIELDS.limpeza, FIELDS.limpezaObs],
    ["postura_da_equipe", "Postura da equipe", FIELDS.postura, FIELDS.posturaObs],
  ] as const;

  const checklist: Record<string, ChecklistEntry | { auditor: string | null }> = {};
  const nonconformities: Array<{ key: string; label: string; observation: string | null }> = [];

  definitions.forEach(([key, label, answerField, observationField]) => {
    const answer = readText(fields, answerField) || null;
    const observation = readText(fields, observationField) || null;
    checklist[key] = { label, answer, observation };
    if (normalizeName(answer ?? "") === "nao") {
      nonconformities.push({ key, label, observation });
    }
  });

  checklist._source = { auditor: readText(fields, FIELDS.auditor) || null };
  return { checklist, nonconformities };
}

async function buildImportPlan(requestedClientId?: string): Promise<ImportPlan> {
  const config = getAirtableConfig();
  const scope = await getImportScope(requestedClientId);
  const base: ImportPlan = {
    clients: scope.clients,
    selectedClient: scope.selectedClient,
    stores: scope.stores,
    configured: config.configured,
    importEnabled: config.importEnabled,
    hasError: scope.hasError,
    mappingError: null,
    items: [],
    readyCount: 0,
    syncedCount: 0,
    skippedCount: 0,
    candidates: [],
  };

  if (scope.hasError || !scope.selectedClient || !config.configured) return base;

  try {
    const [airClients, airStores, airVisits] = await Promise.all([
      fetchAirtableTable(AIRTABLE_TABLES.clients, [FIELDS.clientName]),
      fetchAirtableTable(AIRTABLE_TABLES.stores, [FIELDS.storeName, FIELDS.storeClientLink]),
      fetchAirtableTable(AIRTABLE_TABLES.visits, [
        FIELDS.visitStoreLink,
        FIELDS.auditor,
        FIELDS.occurredAt,
        FIELDS.score,
        FIELDS.pdfStatus,
        FIELDS.pdfUrl,
        FIELDS.notes,
        FIELDS.processedAt,
        FIELDS.ignoreAutomation,
        FIELDS.classification,
        FIELDS.fachada,
        FIELDS.tempo,
        FIELDS.precificacao,
        FIELDS.limpeza,
        FIELDS.postura,
        FIELDS.fachadaObs,
        FIELDS.tempoObs,
        FIELDS.precificacaoObs,
        FIELDS.limpezaObs,
        FIELDS.posturaObs,
      ]),
    ]);

    const matchingAirClients = airClients.filter(
      (client) => normalizeName(readText(client.fields, FIELDS.clientName)) === normalizeName(scope.selectedClient!.name),
    );

    if (matchingAirClients.length !== 1) {
      return { ...base, mappingError: matchingAirClients.length ? "client_ambiguous" : "client_not_found" };
    }

    const airClientId = matchingAirClients[0].id;
    const airStoreById = new Map(
      airStores
        .filter((store) => readLinks(store.fields, FIELDS.storeClientLink).includes(airClientId))
        .map((store) => [store.id, store]),
    );
    const supabaseStoresByName = new Map<string, ImportStore[]>();
    scope.stores.forEach((store) => {
      const key = normalizeName(store.name);
      const current = supabaseStoresByName.get(key) ?? [];
      current.push(store);
      supabaseStoresByName.set(key, current);
    });

    const provisional: Array<ImportCandidate | AirtableImportPreviewItem> = [];

    for (const visit of airVisits) {
      const pdfStatus = readText(visit.fields, FIELDS.pdfStatus);
      const occurredAt = readText(visit.fields, FIELDS.occurredAt) || visit.createdTime;
      const classificationLabel = readText(visit.fields, FIELDS.classification) || "Sem classificação";

      const skipped = (reason: string): AirtableImportPreviewItem => ({
        recordId: visit.id,
        storeName: "—",
        occurredAt,
        score: readNumber(visit.fields, FIELDS.score),
        classificationLabel,
        reportStatus: normalizeName(pdfStatus) === "enviado" ? "sent" : "generated",
        hasPdf: Boolean(readText(visit.fields, FIELDS.pdfUrl)),
        state: "skipped",
        reason,
      });

      if (readBoolean(visit.fields, FIELDS.ignoreAutomation)) {
        provisional.push(skipped("Registro marcado para ignorar automação"));
        continue;
      }

      if (pdfStatus !== "Gerado" && pdfStatus !== "Enviado") {
        provisional.push(skipped("PDF ainda não concluído"));
        continue;
      }

      const linkedStoreIds = readLinks(visit.fields, FIELDS.visitStoreLink);
      if (linkedStoreIds.length !== 1) {
        provisional.push(skipped("Visita sem vínculo único de loja"));
        continue;
      }

      const airStore = airStoreById.get(linkedStoreIds[0]);
      if (!airStore) {
        provisional.push(skipped("Loja não pertence ao cliente correspondente no Airtable"));
        continue;
      }

      const storeName = readText(airStore.fields, FIELDS.storeName);
      const supabaseStoreMatches = supabaseStoresByName.get(normalizeName(storeName)) ?? [];
      if (supabaseStoreMatches.length !== 1) {
        const item = skipped(supabaseStoreMatches.length ? "Loja ambígua no Supabase" : "Loja ainda não existe no Supabase");
        item.storeName = storeName || "—";
        provisional.push(item);
        continue;
      }

      const { checklist, nonconformities } = buildChecklist(visit.fields);
      const processedAt = readText(visit.fields, FIELDS.processedAt);
      provisional.push({
        recordId: visit.id,
        createdTime: visit.createdTime,
        storeId: supabaseStoreMatches[0].id,
        storeName,
        occurredAt,
        sourceUpdatedAt: processedAt || occurredAt || visit.createdTime,
        score: readNumber(visit.fields, FIELDS.score),
        classification: mapClassification(classificationLabel),
        classificationLabel,
        notes: readText(visit.fields, FIELDS.notes) || null,
        checklist,
        nonconformities,
        reportStatus: pdfStatus === "Enviado" ? "sent" : "generated",
        pdfUrl: readText(visit.fields, FIELDS.pdfUrl) || null,
        sentAt: pdfStatus === "Enviado" ? processedAt || null : null,
        existingVisitId: null,
        state: "new",
      });
    }

    const candidateRefs = provisional
      .filter((item): item is ImportCandidate => "storeId" in item)
      .map((item) => item.recordId);
    const existingByRef = new Map<string, { id: string; source_updated_at: string | null }>();

    if (candidateRefs.length) {
      const { data: existing, error: existingError } = await scope.supabase
        .from("visits")
        .select("id, source_ref, source_updated_at")
        .eq("client_id", scope.selectedClient.id)
        .eq("source", "airtable")
        .in("source_ref", candidateRefs);

      if (existingError) return { ...base, hasError: true };
      (existing ?? []).forEach((row) => {
        if (row.source_ref) existingByRef.set(row.source_ref, { id: row.id, source_updated_at: row.source_updated_at });
      });
    }

    const candidates: ImportCandidate[] = [];
    const items: AirtableImportPreviewItem[] = provisional.map((item) => {
      if (!("storeId" in item)) return item;

      const existing = existingByRef.get(item.recordId);
      if (existing) {
        item.existingVisitId = existing.id;
        const sourceTime = Date.parse(item.sourceUpdatedAt);
        const existingTime = existing.source_updated_at ? Date.parse(existing.source_updated_at) : 0;
        item.state = existingTime >= sourceTime ? "synced" : "update";
      }
      candidates.push(item);
      return {
        recordId: item.recordId,
        storeName: item.storeName,
        occurredAt: item.occurredAt,
        score: item.score,
        classificationLabel: item.classificationLabel,
        reportStatus: item.reportStatus,
        hasPdf: Boolean(item.pdfUrl),
        state: item.state,
        reason: null,
      };
    });

    return {
      ...base,
      items,
      candidates,
      readyCount: candidates.filter((candidate) => candidate.state === "new" || candidate.state === "update").length,
      syncedCount: candidates.filter((candidate) => candidate.state === "synced").length,
      skippedCount: items.filter((item) => item.state === "skipped").length,
    };
  } catch {
    return { ...base, hasError: true };
  }
}

export async function getAirtableImportPreview(clientId?: string): Promise<AirtableImportPreview> {
  const plan = await buildImportPlan(clientId);
  const { candidates: _candidates, ...preview } = plan;
  return preview;
}

export type AirtableImportResult = {
  ok: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errorCode: string | null;
};

export async function runAirtableImport(clientId: string): Promise<AirtableImportResult> {
  const config = getAirtableConfig();
  if (!config.configured) return { ok: false, imported: 0, updated: 0, skipped: 0, errorCode: "not_configured" };
  if (!config.importEnabled) return { ok: false, imported: 0, updated: 0, skipped: 0, errorCode: "disabled" };

  const plan = await buildImportPlan(clientId);
  if (plan.hasError || !plan.selectedClient || plan.selectedClient.id !== clientId) {
    return { ok: false, imported: 0, updated: 0, skipped: 0, errorCode: "forbidden_or_unavailable" };
  }
  if (plan.mappingError) {
    return { ok: false, imported: 0, updated: 0, skipped: 0, errorCode: plan.mappingError };
  }

  const scope = await getImportScope(clientId);
  if (scope.hasError || !scope.selectedClient || scope.selectedClient.id !== clientId) {
    return { ok: false, imported: 0, updated: 0, skipped: 0, errorCode: "forbidden" };
  }

  let imported = 0;
  let updated = 0;
  let skipped = plan.skippedCount + plan.syncedCount;

  for (const candidate of plan.candidates.filter((item) => item.state !== "synced").slice(0, 100)) {
    const visitPayload = {
      client_id: clientId,
      store_id: candidate.storeId,
      auditor_user_id: null,
      occurred_at: candidate.occurredAt,
      score: candidate.score,
      classification: candidate.classification,
      checklist: candidate.checklist,
      nonconformities: candidate.nonconformities,
      notes: candidate.notes,
      status: "completed",
      source: "airtable",
      source_ref: candidate.recordId,
      source_updated_at: candidate.sourceUpdatedAt,
    };

    let visitId = candidate.existingVisitId;
    let visitError = null as unknown;

    if (visitId) {
      const result = await scope.supabase
        .from("visits")
        .update(visitPayload)
        .eq("id", visitId)
        .eq("client_id", clientId)
        .select("id")
        .maybeSingle();
      visitError = result.error;
      visitId = result.data?.id ?? null;
    } else {
      const result = await scope.supabase.from("visits").insert(visitPayload).select("id").maybeSingle();
      visitError = result.error;
      visitId = result.data?.id ?? null;

      if (visitError || !visitId) {
        const retry = await scope.supabase
          .from("visits")
          .select("id")
          .eq("client_id", clientId)
          .eq("source", "airtable")
          .eq("source_ref", candidate.recordId)
          .maybeSingle();
        if (!retry.error && retry.data?.id) {
          visitId = retry.data.id;
          const updateResult = await scope.supabase
            .from("visits")
            .update(visitPayload)
            .eq("id", visitId)
            .eq("client_id", clientId);
          visitError = updateResult.error;
        }
      }
    }

    if (visitError || !visitId) {
      skipped += 1;
      continue;
    }

    const reportPayload = {
      client_id: clientId,
      visit_id: visitId,
      version: 1,
      status: candidate.reportStatus,
      pdf_url: candidate.pdfUrl,
      sent_at: candidate.sentAt,
      error_code: null,
    };
    const { data: existingReport, error: reportLookupError } = await scope.supabase
      .from("reports")
      .select("id")
      .eq("client_id", clientId)
      .eq("visit_id", visitId)
      .eq("version", 1)
      .maybeSingle();

    if (reportLookupError) {
      skipped += 1;
      continue;
    }

    const reportResult = existingReport?.id
      ? await scope.supabase
          .from("reports")
          .update(reportPayload)
          .eq("id", existingReport.id)
          .eq("client_id", clientId)
      : await scope.supabase.from("reports").insert(reportPayload);

    if (reportResult.error) {
      skipped += 1;
      continue;
    }

    if (candidate.state === "update") updated += 1;
    else imported += 1;
  }

  return { ok: true, imported, updated, skipped, errorCode: null };
}
