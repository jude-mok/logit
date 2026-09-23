export interface Moment {
  id: number;
  image_path: string;
  comment: string | null;
  is_starred: boolean;
  created_at: number;
}
export interface User {
  id: number;
  user_name: string;
  email: string;
}
const base =
  (import.meta as unknown as { env: Record<string, string> }).env
    .VITE_API_URL || "/api";
export const session = {
  get: () => sessionStorage.getItem("logit.access"),
  set: (token: string) => sessionStorage.setItem("logit.access", token),
  clear: () => sessionStorage.removeItem("logit.access"),
};
export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const token = session.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token && session.get() === token) {
      session.clear();
      window.dispatchEvent(new Event("logit:expired"));
    }
    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : Array.isArray(data?.detail)
          ? data.detail[0]?.msg
          : `Request failed (${response.status}). Please try again.`,
    );
  }
  return data as T;
}
export const imageUrl = (path: string) =>
  /^(https?:|data:|blob:)/.test(path)
    ? path
    : `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
export function monthKey(timestamp: number) {
  const date = new Date(timestamp * 1000);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
export function filterMoments(
  moments: Moment[],
  query: string,
  starred: boolean,
  month: string,
) {
  return moments
    .filter(
      (m) =>
        (!starred || m.is_starred) &&
        (!month || monthKey(m.created_at) === month) &&
        (m.comment || "").toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => b.created_at - a.created_at);
}
