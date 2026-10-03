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
  return { apiKey, agentId, baseUrl, enabled: Boolean(apiKey && agentId) };
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
export function makeCall(agentId: string, destination: string, isTestCall = false) {
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
export async function askAgent(sessionId: string, question: string, budgetMs = 9000): Promise<string | null> {
  const { agentId } = bimpeConfig();
  if (!agentId) throw new BimpeError("BIMPEAI_AGENT_ID is not set");
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
