const API_BASE =
  window.ASTRID_API_BASE ||
  (window.location.hostname.includes("localhost")
    ? "http://localhost:5000/api"
    : "https://your-render-backend.onrender.com/api");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Request failed for ${path}`);
  }
  return data.data;
}

const AstridApi = {
  jobs: {
    list: ({ q = "", location = "" } = {}) =>
      request(`/jobs?q=${encodeURIComponent(q)}&location=${encodeURIComponent(location)}`),
    ingest: ({ query, location, page = 1 }) =>
      request("/jobs/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, location, page }),
      }),
  },

  companies: {
    reviews: ({ companyId, companyName }) =>
      request(
        `/companies/${encodeURIComponent(companyId)}/reviews?companyName=${encodeURIComponent(
          companyName || companyId
        )}`
      ),
    hireRate: ({ companyId, companyName, ticker }) =>
      request(
        `/companies/${encodeURIComponent(companyId)}/hire-rate?companyName=${encodeURIComponent(
          companyName || companyId
        )}&ticker=${encodeURIComponent(ticker || "")}`
      ),
    jobStats: ({ companyId, companyName, jobTitle }) =>
      request(
        `/companies/${encodeURIComponent(companyId)}/job-stats?companyName=${encodeURIComponent(
          companyName || companyId
        )}&jobTitle=${encodeURIComponent(jobTitle || "Software Engineer")}`
      ),
  },

  resumax: {
    score: ({ resumeText, jobDescription, userCategory = "tech" }) =>
      request("/resumax/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription, userCategory }),
      }),
    optimize: ({ resumeText, jobDescription }) =>
      request("/resumax/optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-plan": "paid",
        },
        body: JSON.stringify({ resumeText, jobDescription }),
      }),
    export: ({ optimizedText, format = "txt" }) =>
      request("/resumax/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-plan": "paid",
        },
        body: JSON.stringify({ optimizedText, format }),
      }),
  },
};

window.AstridApi = AstridApi;
