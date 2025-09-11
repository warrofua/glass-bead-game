const API_BASE =
  // @ts-ignore - import.meta may not be available in tests
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE) ||
  (typeof process !== "undefined" && process.env.VITE_API_BASE) ||
  "http://localhost:8787";

export const api = async (path: string, opts: RequestInit = {}) => {
  const headers = opts.body
    ? { "Content-Type": "application/json", ...(opts.headers || {}) }
    : opts.headers;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with ${res.status}`);
  }
  return res;
};

export { API_BASE };
export default api;
