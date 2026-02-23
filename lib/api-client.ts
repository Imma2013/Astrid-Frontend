const API_BASE =
  process.env.NEXT_PUBLIC_ASTRID_API_BASE ||
  (typeof window !== "undefined" && window.location.hostname.includes("localhost")
    ? "http://localhost:5000/api"
    : "https://your-render-backend.onrender.com/api");

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Request failed for ${path}`);
  }
  return data.data as T;
}

export const AstridApi = {
  jobs: {
    list: (params: { q?: string; location?: string } = {}) => {
      const q = params.q || "";
      const location = params.location || "";
      return request<any[]>(`/jobs?q=${encodeURIComponent(q)}&location=${encodeURIComponent(location)}`);
    },
    stats: (jobId: string) => request<any>(`/jobs/${encodeURIComponent(jobId)}/stats`),
  },
  companies: {
    reviews: (params: { companyId: string; companyName?: string }) =>
      request<any>(
        `/companies/${encodeURIComponent(params.companyId)}/reviews?companyName=${encodeURIComponent(
          params.companyName || params.companyId
        )}`
      ),
  },
};
