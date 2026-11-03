/** Queue API base id (no subpath like /kontext/multi). */
export function falQueueBaseId(modelPath = process.env.FAL_MODEL_ID || "fal-ai/flux-pro/kontext/multi") {
  const parts = modelPath.replace(/^\/+|\/+$/g, "").split("/");
  if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  return modelPath;
}

export function falQueueSubmitUrl(modelPath?: string) {
  return `https://queue.fal.run/${modelPath || process.env.FAL_MODEL_ID || "fal-ai/flux-pro/kontext/multi"}`;
}

export function falQueueStatusUrl(requestId: string, statusUrl?: string | null, modelPath?: string) {
  if (statusUrl?.startsWith("http")) return statusUrl;
  const base = falQueueBaseId(modelPath);
  return `https://queue.fal.run/${base}/requests/${requestId}/status`;
}

export function falQueueResultUrl(requestId: string, responseUrl?: string | null, modelPath?: string) {
  if (responseUrl?.startsWith("http")) return responseUrl;
  const base = falQueueBaseId(modelPath);
  return `https://queue.fal.run/${base}/requests/${requestId}`;
}

export type FalSubmitResponse = {
  requestId: string;
  statusUrl: string;
  responseUrl: string;
};

export function parseFalSubmitBody(body: {
  request_id?: string;
  status_url?: string;
  response_url?: string;
}): FalSubmitResponse {
  const requestId = body.request_id;
  if (!requestId) throw new Error("fal queue did not return a request id");
  const modelPath = process.env.FAL_MODEL_ID || "fal-ai/flux-pro/kontext/multi";
  return {
    requestId,
    statusUrl: body.status_url || falQueueStatusUrl(requestId, null, modelPath),
    responseUrl: body.response_url || falQueueResultUrl(requestId, null, modelPath),
  };
}
