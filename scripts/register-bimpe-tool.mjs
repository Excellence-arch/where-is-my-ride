// Registers this app's /api/track webhook as a custom API tool on your
// BimpeAI agent, so the voice agent can look up riders on live calls.
//
//   BIMPEAI_API_KEY=sk_... BIMPEAI_AGENT_ID=... PUBLIC_APP_URL=https://... \
//     npm run bimpe:register-tool

const { BIMPEAI_API_KEY, BIMPEAI_AGENT_ID, PUBLIC_APP_URL } = process.env;
const BASE = (process.env.BIMPEAI_BASE_URL || "https://api.bimpe.ai").replace(/\/$/, "") + "/api/v1/console";

if (!BIMPEAI_API_KEY || !BIMPEAI_AGENT_ID || !PUBLIC_APP_URL) {
  console.error("Set BIMPEAI_API_KEY, BIMPEAI_AGENT_ID and PUBLIC_APP_URL first.");
  process.exit(1);
}

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${BIMPEAI_API_KEY}`, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  return json.data ?? json;
}

const agent = `/agents/${BIMPEAI_AGENT_ID}`;
const integration = await call("POST", `${agent}/integrations/custom_api/configure`, {
  name: "WhereIsMyRider",
  base_url: PUBLIC_APP_URL.replace(/\/$/, ""),
});
console.log("Custom API integration:", integration.id);

const tool = await call("POST", `${agent}/integrations/custom_api/${integration.id}/tools`, {
  name: "track_delivery",
  http_method: "POST",
  url_template: "/api/track",
  description:
    "Look up the live location and ETA of a delivery rider by waybill number. Call this whenever the customer asks where their rider, order or package is. Read the returned `message` field back to the customer.",
  body_params: [
    {
      name: "waybill_id",
      type: "string",
      description: "The waybill number the customer read out, e.g. LG-90210. Pass it exactly as heard.",
      required: true,
    },
  ],
  timeout: 2000, // milliseconds
});
console.log("Tool registered:", tool.id ?? tool);
