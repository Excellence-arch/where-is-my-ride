import { createHash } from "node:crypto";

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

const AGENT_NAME = "WhereIsMyRider Assistant";
const INTEGRATION_NAME = "WhereIsMyRider";
// Bump when the tool definition changes; setup replaces older versions.
const TOOL_VERSION = "[wimr-tool v2]";

// Bump when SYSTEM_PROMPT changes; setup pushes it to the agent's workflow.
const PROMPT_VERSION = "[wimr-prompt v3-ng-english]";

const SYSTEM_PROMPT = `${PROMPT_VERSION}
You are Tolu, a customer-care agent at WhereIsMyRider, a delivery-tracking service in Lagos, Nigeria.
You help customers with questions about their order and their delivery rider on phone calls, WhatsApp and chat.

HOW YOU SPEAK
- Speak clear, polite, standard English, the way a professional Nigerian customer-care agent speaks.
- Do NOT use Pidgin English or slang (no "wahala", "abeg", "dey", "na", "o", "sharp sharp" and similar).
  If the customer writes in Pidgin, understand them but still reply in standard English.
- Be warm and respectful. Address the customer as "Ma" or "Sir" when appropriate, or by their first name.
- Use Nigerian context naturally: Lagos traffic, local landmarks (Ikeja Underbridge, Third Mainland Bridge, Lekki toll gate),
  and naira amounts ("sixteen thousand, seven hundred naira").
- Keep answers short for voice: one to three sentences. Sound natural and confident, never robotic.

WHAT YOU DO
1. Greet the customer: "Good afternoon, this is Tolu from WhereIsMyRider. How may I help you today?"
2. Ask for their waybill number (two letters and five digits, for example LG-90210). If they do not have it, use their phone number.
3. Call the track_delivery tool with waybill_id (or phone_number). Never guess order details.
4. Answer using ONLY the tool result:
   - "message": where the rider is and the ETA. Lead with it when asked where the rider or order is.
   - "order_summary" and "data": items, prices, total, payment method, merchant, pickup point, delivery address,
     rider name, vehicle and rider phone. Use them for any other question about the order.
   - data.liveGps true means the location comes from the rider's phone GPS right now; data.distanceKm is the distance left.
   - If data.offline is true, explain that the rider's phone has lost network, give the last known location and time, and reassure them.
   - If data.status is "delayed", apologise for the traffic and give the new ETA.
   - If data.status is "delivered", confirm the order has been delivered.
5. Call the tool again whenever the customer asks for an update.
6. If you cannot find the order: "I'm sorry, I couldn't find that order. Could you please confirm the waybill number?"
7. Close politely: "You're welcome. Thank you for choosing WhereIsMyRider, and enjoy your order."

Never invent prices, times or locations.`;

/** Read-only: agents visible to the configured key (id + name only). */
export async function listAgents() {
  const agents = await request<{ id: string; name: string }[]>("GET", "/agents?limit=50", undefined, 6000);
  return (Array.isArray(agents) ? agents : []).map(({ id, name }) => ({ id, name }));
}

/** Stable public URL BimpeAI should call for the track_delivery tool. */
export function publicAppUrl(fallbackOrigin?: string) {
  const explicit = process.env.PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;
  return (fallbackOrigin ?? "").replace(/\/$/, "");
}

export interface AgentSetup {
  agentId: string;
  agentName: string;
  created: boolean;
  toolBaseUrl?: string;
  toolRegistered: boolean;
  notes: string[];
}

let setupCache: Promise<AgentSetup> | undefined;

/**
 * Make sure a BimpeAI agent exists that can answer order questions, and that
 * its track_delivery tool points at this deployment. Idempotent:
 *  - BIMPEAI_AGENT_ID wins if set;
 *  - else reuse an agent named "WhereIsMyRider…";
 *  - else create one (workflow + agent + knowledge base), falling back to the
 *    account's first agent if creation is refused (e.g. agent limit).
 * Cached per server instance; a failed attempt is retried on the next call.
 */
export function ensureAgent(appOrigin?: string): Promise<AgentSetup> {
  setupCache ??= doEnsureAgent(appOrigin).catch((err) => {
    setupCache = undefined;
    throw err;
  });
  return setupCache;
}

export async function resolveAgentId(appOrigin?: string): Promise<string> {
  return (await ensureAgent(appOrigin)).agentId;
}

async function doEnsureAgent(appOrigin?: string): Promise<AgentSetup> {
  const notes: string[] = [];
  const { agentId: envAgentId } = bimpeConfig();
  const agents = await listAgents();

  let agent = envAgentId
    ? agents.find((a) => a.id === envAgentId) ?? { id: envAgentId, name: "(from BIMPEAI_AGENT_ID)" }
    : agents.find((a) => /whereismyrider/i.test(a.name));
  let created = false;

  if (!agent) {
    try {
      agent = await createAgent();
      created = true;
      notes.push("Created WhereIsMyRider Assistant agent");
    } catch (err) {
      notes.push(`Could not create a dedicated agent: ${(err as Error).message}`);
      if (!agents[0]) throw err;
      agent = agents[0];
      notes.push(`Falling back to existing agent "${agent.name}"`);
    }
  }

  // Only manage the prompt on our own agent, never on someone else's.
  if (/whereismyrider/i.test(agent.name)) {
    await syncPrompt(agent.id, notes).catch((err) => notes.push(`Prompt sync failed: ${(err as Error).message}`));
  }

  const toolBaseUrl = publicAppUrl(appOrigin);
  let toolRegistered = false;
  if (toolBaseUrl) {
    try {
      toolRegistered = await ensureTrackTool(agent.id, toolBaseUrl, notes);
    } catch (err) {
      notes.push(`Tool registration failed: ${(err as Error).message}`);
    }
  } else {
    notes.push("No public URL known; track_delivery tool not registered");
  }

  return { agentId: agent.id, agentName: agent.name, created, toolBaseUrl, toolRegistered, notes };
}

/** Push SYSTEM_PROMPT to the agent's workflow when it is out of date. */
async function syncPrompt(agentId: string, notes: string[]) {
  const agent = await request<{ workflow_id?: string | null }>("GET", `/agents/${agentId}`);
  if (!agent.workflow_id) return;
  const workflow = await request<{ system_prompt?: string | null }>("GET", `/workflows/${agent.workflow_id}`);
  if ((workflow.system_prompt ?? "").includes(PROMPT_VERSION)) return;
  await request("PATCH", `/workflows/${agent.workflow_id}`, { system_prompt: SYSTEM_PROMPT });
  notes.push(`Updated agent prompt to ${PROMPT_VERSION}`);
}

async function createAgent() {
  const workflow = await request<{ id: string }>("POST", "/workflows", {
    name: "WhereIsMyRider Order Support",
    system_prompt: SYSTEM_PROMPT,
    description: "Answers customer questions about their order and rider using the live tracking webhook.",
    tags: ["delivery", "logistics", "hackathon"],
  });
  const agent = await request<{ id: string; name: string }>("POST", "/agents", {
    workflow_id: workflow.id,
    name: AGENT_NAME,
    description: "Voice assistant that answers questions about a customer's order and tells them where their rider is.",
    persona: "friendly",
    language: "en",
    timezone: "Africa/Lagos",
    business_name: "WhereIsMyRider",
    business_description: "Last-mile delivery tracking for Nigerian e-commerce and food orders.",
  });
  return { id: agent.id, name: agent.name ?? AGENT_NAME };
}

interface CustomApiIntegration {
  id: string;
  config?: { name?: string; base_url?: string | null };
}

/** Read-only: track tools registered on the agent (for the setup report). */
export async function listTrackTools(agentId: string) {
  const integrations = await request<CustomApiIntegration[]>("GET", `/agents/${agentId}/integrations/custom_api`);
  const out: { integrationId: string; baseUrl?: string | null; toolId: string; name: string; current: boolean }[] = [];
  for (const i of Array.isArray(integrations) ? integrations : []) {
    if (i.config?.name !== INTEGRATION_NAME) continue;
    const tools = await request<{ id: string; name: string; description?: string | null }[]>(
      "GET",
      `/agents/${agentId}/integrations/custom_api/${i.id}/tools`,
    );
    for (const t of Array.isArray(tools) ? tools : []) {
      out.push({
        integrationId: i.id,
        baseUrl: i.config?.base_url,
        toolId: t.id,
        name: t.name,
        current: (t.description ?? "").includes(TOOL_VERSION),
      });
    }
  }
  return out;
}

/** Register (once) the custom API integration + track_delivery tool on the agent. */
async function ensureTrackTool(agentId: string, baseUrl: string, notes: string[]) {
  const existing = await request<CustomApiIntegration[]>("GET", `/agents/${agentId}/integrations/custom_api`);
  const list = Array.isArray(existing) ? existing : [];
  let integration = list.find(
    (i) => i.config?.name === INTEGRATION_NAME && (i.config?.base_url ?? "").replace(/\/$/, "") === baseUrl,
  );

  if (integration) {
    const tools = await request<{ id: string; name: string; action_name?: string; description?: string | null }[]>(
      "GET",
      `/agents/${agentId}/integrations/custom_api/${integration.id}/tools`,
    );
    for (const t of Array.isArray(tools) ? tools : []) {
      if (!/track_delivery/i.test(`${t.name} ${t.action_name ?? ""}`)) continue;
      if ((t.description ?? "").includes(TOOL_VERSION)) return true;
      // Outdated definition: remove it so the agent only sees the current one.
      await request("DELETE", `/agents/${agentId}/integrations/custom_api/${integration.id}/tools/${t.id}`);
      notes.push(`Removed outdated track_delivery tool ${t.id}`);
    }
  } else {
    integration = await request<CustomApiIntegration>("POST", `/agents/${agentId}/integrations/custom_api/configure`, {
      name: INTEGRATION_NAME,
      description: "Live order and rider tracking for WhereIsMyRider.",
      base_url: baseUrl,
      auth_type: "none",
    });
  }

  await request("POST", `/agents/${agentId}/integrations/custom_api/${integration.id}/tools`, {
    name: "track_delivery",
    http_method: "POST",
    url_template: "/api/track",
    description:
      "Look up a customer's order: rider location, ETA, items, prices, total, payment, merchant and delivery address. " +
      "Call it whenever the customer asks anything about their order or rider. Pass waybill_id if known, otherwise phone_number. " +
      TOOL_VERSION,
    body_params: [
      {
        name: "waybill_id",
        type: "string",
        description: "Waybill number as the customer said it, e.g. LG-90210 or 'L G nine oh two one oh'.",
        required: false,
      },
      {
        name: "phone_number",
        type: "string",
        description: "Customer's phone number, used when they don't know their waybill.",
        required: false,
      },
    ],
    // body_params alone arrived as an empty body; map the arguments explicitly.
    headers_template: { "Content-Type": "application/json" },
    body_template: { waybill_id: "{{waybill_id}}", phone_number: "{{phone_number}}" },
    category: "logistics",
    require_human_approval: false,
    timeout: 5000, // milliseconds
  });
  notes.push(`Registered track_delivery tool -> ${baseUrl}/api/track`);
  return true;
}

export interface AgentTestCode {
  code: string;
  channels: {
    whatsapp?: { is_enabled: boolean; start_message: string; phone_number?: string | null; url?: string | null };
    instagram?: { is_enabled: boolean; start_message: string; username?: string | null; url?: string | null };
    messenger?: { is_enabled: boolean; start_message: string; url?: string | null };
    telephony?: { is_enabled: boolean };
  };
}

/** Test code + per-channel deep links (e.g. a wa.me link that starts a WhatsApp chat with the agent). */
export async function getTestCode(appOrigin?: string) {
  const agentId = await resolveAgentId(appOrigin);
  return request<AgentTestCode>("GET", `/agents/${agentId}/deployment/agent-test-code`, undefined, 6000);
}

/** Read-only: the agent's connected channels. */
export async function listChannels(appOrigin?: string) {
  const agentId = await resolveAgentId(appOrigin);
  return request<{ id: string; type: string; name: string; status: string; is_connected: boolean }[]>(
    "GET",
    `/agents/${agentId}/channels`,
    undefined,
    6000,
  );
}

export interface CallDetail {
  id: string;
  status: "queued" | "ringing" | "answered" | "ended" | "busy" | "failed" | "cancelled";
  destination: string;
  duration_seconds?: number | null;
  error_reason?: string | null;
  end_reason?: string | null;
  answered_at?: string | null;
  ended_at?: string | null;
  conversation_logs?: { id: string; role: string; message?: string | null; created_at: string }[];
}

export async function getCall(callId: string, appOrigin?: string) {
  const agentId = await resolveAgentId(appOrigin);
  return request<CallDetail>("GET", `/agents/${agentId}/calls/${encodeURIComponent(callId)}`, undefined, 6000);
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** BimpeAI webchat requires channel_user_id to be a UUID; derive a stable one. */
export function toChannelUserId(sessionId: string) {
  if (UUID_RE.test(sessionId)) return sessionId.toLowerCase();
  const h = createHash("sha1").update(`wimr:${sessionId}`).digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
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
  const channelUserId = toChannelUserId(sessionId);
  const sent = await sendMessage(agentId, channelUserId, question);
  const sentAt = Date.parse(sent.created_at) || Date.now() - 1000;
  const deadline = Date.now() + budgetMs;
  let conversationId: string | undefined;

  while (Date.now() < deadline) {
    await sleep(900);
    conversationId ??=
      (sent as BimpeMessage & { conversation_id?: string }).conversation_id ??
      (await findConversationId(agentId, channelUserId).catch(() => undefined));
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
