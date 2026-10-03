// Minimal server-side client for the BimpeAI Agent Console API.
// Mirrors the official SDK (pypi: bimpeai): Bearer auth, base
// https://api.bimpe.ai/api/v1/console, responses wrapped as { data, meta }.

const API_PREFIX = "/api/v1/console";

export class BimpeError extends Error {
  constructor(message: string, public status?: number, public body?: unknown) {
    super(message);
  }
}

export function bimpeConfig() {
  const apiKey = process.env.BIMPEAI_API_KEY;
  const agentId = process.env.BIMPEAI_AGENT_ID;
  const baseUrl = (process.env.BIMPEAI_BASE_URL || "https://api.bimpe.ai").replace(/\/$/, "");
  // The agent id is optional: resolveAgentId() discovers or provisions one.
  return { apiKey, agentId, baseUrl, enabled: Boolean(apiKey) };
}

async function request<T>(method: string, path: string, body?: unknown, timeoutMs = 8000): Promise<T> {
  const { apiKey, baseUrl } = bimpeConfig();
  if (!apiKey) throw new BimpeError("BIMPEAI_API_KEY is not set");
  const res = await fetch(`${baseUrl}${API_PREFIX}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as { error?: { message?: string }; message?: string })?.error?.message ??
      (json as { message?: string })?.message ?? `BimpeAI request failed (${res.status})`;
    throw new BimpeError(msg, res.status, json);
  }
  return ((json as { data?: T }).data ?? json) as T;
}

const SYSTEM_PROMPT = `You are the WhereIsMyRider delivery assistant for Nigerian e-commerce customers.
When a customer asks where their rider, order or package is, ask for their waybill number if they have not given it,
then call the track_delivery tool with it and read back the tool's "message" field naturally and briefly.
Waybills look like LG-90210 (two letters, five digits). Be warm, concise and reassuring.`;

/** Read-only: agents visible to the configured key (id + name only). */
export async function listAgents() {
  const agents = await request<{ id: string; name: string }[]>("GET", "/agents?limit=50", undefined, 6000);
  return (Array.isArray(agents) ? agents : []).map(({ id, name }) => ({ id, name }));
}

let cachedAgentId: string | undefined;

/**
 * BimpeAI calls and conversations are agent-scoped. Use BIMPEAI_AGENT_ID when
 * set; otherwise reuse the first agent on the account; otherwise create a
 * "WhereIsMyRider Assistant" agent (with the track_delivery tool) once.
 */
export async function resolveAgentId(appOrigin?: string): Promise<string> {
  const { agentId } = bimpeConfig();
  if (agentId) return agentId;
  if (cachedAgentId) return cachedAgentId;

  const agents = await request<{ id: string; name: string }[]>("GET", "/agents?limit=50");
  const list = Array.isArray(agents) ? agents : [];
  const existing = list.find((a) => /whereismyrider/i.test(a.name)) ?? list[0];
  if (existing) return (cachedAgentId = existing.id);

  const workflow = await request<{ id: string }>("POST", "/workflows", {
    name: "WhereIsMyRider Tracking",
    system_prompt: SYSTEM_PROMPT,
    description: "Answers 'where is my rider?' using the live tracking webhook.",
  });
  const agent = await request<{ id: string }>("POST", "/agents", {
    workflow_id: workflow.id,
    name: "WhereIsMyRider Assistant",
    description: "Voice assistant that tells customers where their delivery rider is.",
    persona: "friendly",
    language: "en",
    timezone: "Africa/Lagos",
    business_name: "WhereIsMyRider",
  });
  cachedAgentId = agent.id;
  if (appOrigin) await registerTrackTool(agent.id, appOrigin).catch(() => {});
  return agent.id;
}

/** Point the agent's custom API tool at this deployment's /api/track. */
export async function registerTrackTool(agentId: string, appOrigin: string) {
  const integration = await request<{ id: string }>("POST", `/agents/${agentId}/integrations/custom_api/configure`, {
    name: "WhereIsMyRider",
    base_url: appOrigin.replace(/\/$/, ""),
  });
  return request<{ id: string }>("POST", `/agents/${agentId}/integrations/custom_api/${integration.id}/tools`, {
    name: "track_delivery",
    http_method: "POST",
    url_template: "/api/track",
    description:
      "Look up the live location and ETA of a delivery rider by waybill number. Read the returned `message` field back to the customer.",
    body_params: [
      { name: "waybill_id", type: "string", description: "Waybill number as heard, e.g. LG-90210.", required: true },
    ],
    timeout: 2,
  });
}

export interface BimpeMessage {
  id: string;
  role: string;
  message?: string | null;
  created_at: string;
}

interface BimpeConversation {
  id: string;
  channel_user_id?: string | null;
}

export interface MakeCallResult {
  status: "initiated" | "busy" | "failed";
  call_id?: string;
  detail?: string;
}

/** Outbound phone call from the BimpeAI agent to the customer. */
export function makeCall(agentId: string, destination: string, isTestCall = true) {
  return request<MakeCallResult>("POST", `/agents/${agentId}/calls`, {
    destination,
    is_test_call: isTestCall,
  });
}

/** Send a customer utterance into a (test) webchat conversation keyed by sessionId. */
export function sendMessage(agentId: string, sessionId: string, message: string) {
  return request<BimpeMessage>("POST", `/agents/${agentId}/conversations/messages`, {
    message,
    role: "user",
    channel_type: "webchat",
    channel_user_id: sessionId,
    channel_username: "WhereIsMyRider customer",
    is_test_channel: true,
  });
}

async function findConversationId(agentId: string, sessionId: string) {
  const qs = new URLSearchParams({ search: sessionId, limit: "10", sort: "-created_at" });
  const list = await request<BimpeConversation[]>("GET", `/agents/${agentId}/conversations?${qs}`, undefined, 4000);
  return (Array.isArray(list) ? list : []).find((c) => c.channel_user_id === sessionId)?.id;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Ask the agent a question and wait (bounded) for its reply.
 * Returns null on timeout so callers can fall back to the local answer.
 */
export async function askAgent(
  sessionId: string,
  question: string,
  appOrigin?: string,
  budgetMs = 9000,
): Promise<string | null> {
  const agentId = await resolveAgentId(appOrigin);
  const sent = await sendMessage(agentId, sessionId, question);
  const sentAt = Date.parse(sent.created_at) || Date.now() - 1000;
  const deadline = Date.now() + budgetMs;
  let conversationId: string | undefined;

  while (Date.now() < deadline) {
    await sleep(900);
    conversationId ??= await findConversationId(agentId, sessionId).catch(() => undefined);
    if (!conversationId) continue;
    const qs = new URLSearchParams({ limit: "10", sort: "-created_at" });
    const msgs = await request<BimpeMessage[]>(
      "GET",
      `/agents/${agentId}/conversations/${conversationId}/messages?${qs}`,
      undefined,
      4000,
    ).catch(() => [] as BimpeMessage[]);
    const reply = (Array.isArray(msgs) ? msgs : []).find(
      (m) => m.role === "assistant" && m.message && Date.parse(m.created_at) >= sentAt - 500,
    );
    if (reply?.message) return reply.message;
  }
  return null;
}
