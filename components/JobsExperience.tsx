"use client";

import { useEffect, useMemo, useState } from "react";
import { AstridApi } from "@/lib/api-client";
import { CachedJob, db } from "@/lib/local-db";

type MetricTone = "good" | "mid" | "bad" | "neutral";

const FACTUAL_STRAITJACKET_PROMPT = `You are Resumax in Factual Straitjacket mode.
Rules:
1) Never invent jobs, titles, dates, companies, education, certifications, or skills.
2) Only use information found in SOURCE_RESUME.
3) If TARGET_JD contains missing requirements, list them in Gap Analysis.
4) Optimize only by reordering, tightening bullets, and mirroring terminology from TARGET_JD where it maps to existing facts.
Output format:
[Optimized Resume]
...optimized resume text...

[Gap Analysis]
- ...`;

const INITIAL_JOBS: CachedJob[] = [
  {
    jobId: "northline-sr-fe",
    companyId: "northline-labs",
    title: "Senior Frontend Engineer",
    company: "Northline Labs",
    location: "Dallas, TX (Hybrid)",
    pay: "$145,000 - $175,000 a year",
    summary: "Build and scale customer-facing React surfaces for a B2B analytics platform used by 10k+ teams.",
    bullets: [
      "Lead UI architecture and design systems",
      "Partner with product and design weekly",
      "Ship performance improvements and accessibility fixes",
    ],
    applyUrl: "https://jobs.example.com/northline-sr-fe",
    updatedAt: Date.now(),
  },
  {
    jobId: "astrid-frontend-ii",
    companyId: "astrid-health",
    title: "Frontend Engineer II",
    company: "Astrid Health",
    location: "Plano, TX (Remote)",
    pay: "$128,000 - $150,000 a year",
    summary: "Own booking and patient engagement flows with strong UI quality and experimentation.",
    bullets: [
      "Ship experiments for conversion lift",
      "Maintain TypeScript component library",
      "Write tests for critical user journeys",
    ],
    applyUrl: "https://jobs.example.com/astrid-frontend-ii",
    updatedAt: Date.now(),
  },
  {
    jobId: "bluefield-ui-platform",
    companyId: "bluefield",
    title: "UI Engineer, Platform",
    company: "Bluefield",
    location: "Irving, TX",
    pay: "$120,000 - $142,000 a year",
    summary: "Build reusable dashboard primitives and data visualization components for internal teams.",
    bullets: [
      "Create reusable charting primitives",
      "Collaborate with backend platform teams",
      "Improve visual consistency across products",
    ],
    applyUrl: "https://jobs.example.com/bluefield-ui-platform",
    updatedAt: Date.now(),
  },
];

const keywordList = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s+.-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

function matchScore(resume: string, jd: string) {
  const jdSet = new Set(keywordList(jd));
  const resumeSet = new Set(keywordList(resume));
  let hits = 0;
  jdSet.forEach((token) => {
    if (resumeSet.has(token)) hits += 1;
  });
  return Math.max(0, Math.min(100, Math.round((hits / Math.max(jdSet.size, 1)) * 100)));
}

export default function JobsExperience() {
  const [jobs, setJobs] = useState<CachedJob[]>(INITIAL_JOBS);
  const [activeJobId, setActiveJobId] = useState(INITIAL_JOBS[0].jobId);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [offlineNote, setOfflineNote] = useState("");
  const [searchWhat, setSearchWhat] = useState("frontend engineer");
  const [searchWhere, setSearchWhere] = useState("Dallas, TX");

  const [hiredRate, setHiredRate] = useState("--");
  const [hiredMonth, setHiredMonth] = useState("--");
  const [reviewsScore, setReviewsScore] = useState("--");
  const [reviewsTone, setReviewsTone] = useState<MetricTone>("neutral");
  const [reviewsLine, setReviewsLine] = useState("Most recent: --");
  const [resumeScore, setResumeScore] = useState("--");
  const [gaps, setGaps] = useState<string[]>([]);
  const [optimizeOutput, setOptimizeOutput] = useState("");
  const [optimizing, setOptimizing] = useState(false);

  const activeJob = useMemo(() => jobs.find((j) => j.jobId === activeJobId) || jobs[0], [jobs, activeJobId]);

  async function hydrateSaved() {
    const list = await db.saved_jobs.toArray();
    setSavedJobs(list.map((item) => item.jobId));
  }

  async function cacheJobs(input: CachedJob[]) {
    await db.jobs_cache.bulkPut(input.map((j) => ({ ...j, updatedAt: Date.now() })));
  }

  async function hydrateInitialCache() {
    const cached = await db.jobs_cache.toArray();
    if (cached.length) {
      setJobs(cached);
      setActiveJobId(cached[0].jobId);
      return;
    }
    await cacheJobs(INITIAL_JOBS);
  }

  async function readResumeDraft() {
    const dexieDoc = await db.local_docs.get("resume_draft");
    if (dexieDoc?.value) return dexieDoc.value;

    try {
      if (navigator.storage?.getDirectory) {
        const root = await navigator.storage.getDirectory();
        const fileHandle = await root.getFileHandle("resume_draft.txt");
        const file = await fileHandle.getFile();
        const text = await file.text();
        if (text) return text;
      }
    } catch {
      // no local opfs file yet
    }

    const fallback =
      localStorage.getItem("resumax_resume_draft") ||
      "Senior Frontend Engineer with React, TypeScript, and performance optimization experience.";
    await db.local_docs.put({ key: "resume_draft", value: fallback, updatedAt: Date.now() });
    return fallback;
  }

  async function refreshOutcome(job: CachedJob, offline = false) {
    setHiredRate("--");
    setHiredMonth("--");
    setReviewsScore("--");
    setReviewsTone("neutral");
    setReviewsLine("Most recent: --");

    if (!offline) {
      try {
        const stats = await AstridApi.jobs.stats(job.jobId);
        const monthly = Number(stats?.monthly_hires ?? stats?.data?.monthly_hires ?? 0);
        const postings = Number(stats?.active_postings ?? stats?.data?.active_postings ?? 0);
        if (postings > 0) {
          const pct = Math.max(0, Math.min(100, Math.round((monthly / postings) * 100)));
          setHiredRate(`${pct}%`);
          setHiredMonth(String(monthly));
        }
      } catch {
        // ignore backend failures
      }

      try {
        const reviews = await AstridApi.companies.reviews({
          companyId: job.companyId,
          companyName: job.company,
        });
        const values = (reviews?.reviews || []).map((item: any) => Number(item.rating)).filter((n: number) => Number.isFinite(n));
        if (values.length) {
          const avg = Number((values.reduce((sum: number, n: number) => sum + n, 0) / values.length).toFixed(1));
          setReviewsScore(String(avg));
          if (avg >= 4) setReviewsTone("good");
          else if (avg >= 3) setReviewsTone("mid");
          else setReviewsTone("bad");
        }
        const snippet = reviews?.reviews?.[0]?.text || "No review snippet";
        setReviewsLine(`Most recent: ${snippet}`);
      } catch {
        // ignore backend failures
      }
    }

    const resume = await readResumeDraft();
    const jd = `${job.summary}\n${job.bullets.join("\n")}`;
    const score = matchScore(resume, jd);
    setResumeScore(`${score}%`);

    const resumeTokens = new Set(keywordList(resume));
    const jdTokens = Array.from(new Set(keywordList(jd)));
    setGaps(jdTokens.filter((token) => !resumeTokens.has(token)).slice(0, 10));
  }

  async function searchJobs(event: React.FormEvent) {
    event.preventDefault();
    if (!navigator.onLine) {
      const local = await db.jobs_cache
        .filter(
          (job) =>
            `${job.title} ${job.company}`.toLowerCase().includes(searchWhat.toLowerCase()) &&
            String(job.location || "").toLowerCase().includes(searchWhere.toLowerCase())
        )
        .toArray();
      if (local.length) {
        setJobs(local);
        setActiveJobId(local[0].jobId);
      }
      setOfflineNote("Offline mode: showing cached results.");
      return;
    }

    try {
      const remote = await AstridApi.jobs.list({ q: searchWhat, location: searchWhere });
      const normalized = (remote || []).map((item: any) => ({
        jobId: String(item.jobId || item.id || item.externalId || crypto.randomUUID()),
        companyId: String(item.companyId || item.company || "company").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        title: item.title || "Untitled role",
        company: item.company || item.companyName || "Unknown company",
        location: item.location || "Unknown location",
        pay: item.pay || item.salary || "Compensation not listed",
        summary: item.summary || item.descriptionSnippet || "No description provided.",
        bullets: Array.isArray(item.bullets)
          ? item.bullets
          : String(item.bullets || item.requirements || "Core responsibilities not listed")
              .split("|")
              .filter(Boolean),
        applyUrl: item.applyUrl || item.sourceUrl || "#",
        updatedAt: Date.now(),
      })) as CachedJob[];

      if (normalized.length) {
        setJobs(normalized);
        setActiveJobId(normalized[0].jobId);
        await cacheJobs(normalized);
      }
      setOfflineNote("");
    } catch {
      const fallback = await db.jobs_cache.toArray();
      if (fallback.length) {
        setJobs(fallback);
        setActiveJobId(fallback[0].jobId);
      }
      setOfflineNote("Network unavailable, loaded cached jobs.");
    }
  }

  async function toggleSave() {
    if (!activeJob) return;
    const exists = await db.saved_jobs.get(activeJob.jobId);
    if (exists) await db.saved_jobs.delete(activeJob.jobId);
    else {
      await db.saved_jobs.put({
        jobId: activeJob.jobId,
        title: activeJob.title,
        company: activeJob.company,
        location: activeJob.location,
        savedAt: Date.now(),
      });
    }
    await hydrateSaved();
  }

  async function runLocalOptimize() {
    if (!activeJob) return;
    setOptimizing(true);
    setOptimizeOutput("");
    try {
      if (!window.isSecureContext) throw new Error("Secure context required for WebGPU local model.");
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
      const modelCandidates = ["Llama-3.2-3B-Instruct", "Llama-3.2-3B-Instruct-q4f32_1-MLC"];
      let engine: any = null;
      for (const model of modelCandidates) {
        try {
          engine = await CreateMLCEngine(model);
          break;
        } catch {
          // try next candidate
        }
      }
      if (!engine) throw new Error("Failed to initialize Llama local model.");

      const resume = await readResumeDraft();
      const jd = `${activeJob.summary}\n${activeJob.bullets.join("\n")}`;
      const completion = await engine.chat.completions.create({
        temperature: 0.1,
        messages: [
          { role: "system", content: FACTUAL_STRAITJACKET_PROMPT },
          { role: "user", content: `SOURCE_RESUME:\n${resume}\n\nTARGET_JD:\n${jd}` },
        ],
      });
      setOptimizeOutput(completion.choices?.[0]?.message?.content || "No optimize output.");
    } catch (error) {
      setOptimizeOutput(`Local optimize failed: ${(error as Error).message}`);
    } finally {
      setOptimizing(false);
    }
  }

  useEffect(() => {
    hydrateInitialCache();
    hydrateSaved();
  }, []);

  useEffect(() => {
    if (activeJob) {
      refreshOutcome(activeJob, !navigator.onLine);
    }
  }, [activeJobId, jobs]);

  useEffect(() => {
    const onOffline = () => setOfflineNote("Offline mode: showing cached job details.");
    const onOnline = () => setOfflineNote("");
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (!activeJob) return null;

  const reviewToneClass =
    reviewsTone === "good" ? "ring-good" : reviewsTone === "mid" ? "ring-mid" : reviewsTone === "bad" ? "ring-bad" : "";

  return (
    <main className="shell">
      <header className="topbar">
        <div className="logo-mark">M</div>
        <strong className="brand-word">Mistro</strong>
        <nav className="topnav">
          <span className="topnav-item active">Find jobs</span>
          <span className="topnav-item">Notifications</span>
          <span className="topnav-item">Profile</span>
        </nav>
        <button className="ghost">Sign in</button>
      </header>

      <section className="search-card">
        <form className="search-grid" onSubmit={searchJobs}>
          <label>
            <span>What</span>
            <input value={searchWhat} onChange={(e) => setSearchWhat(e.target.value)} />
          </label>
          <label>
            <span>Where</span>
            <input value={searchWhere} onChange={(e) => setSearchWhere(e.target.value)} />
          </label>
          <button type="submit" className="primary">Find jobs</button>
        </form>
      </section>

      <section className="layout-grid">
        <aside className="jobs-column">
          <h2>Frontend engineer jobs in Dallas, TX</h2>
          {jobs.map((job) => (
            <button
              key={job.jobId}
              className={`job-card ${job.jobId === activeJob.jobId ? "active" : ""}`}
              onClick={() => setActiveJobId(job.jobId)}
            >
              <strong>{job.title}</strong>
              <span>{job.company}</span>
              <span>{job.location}</span>
              <small>{job.pay}</small>
              <p>{job.summary}</p>
            </button>
          ))}
        </aside>

        <article className="detail-column">
          <h1>{activeJob.title}</h1>
          <p>{activeJob.company}</p>
          <p>{activeJob.location}</p>
          <p>{activeJob.pay}</p>
          {offlineNote ? <p className="offline">{offlineNote}</p> : null}

          <div className="action-row">
            <button className="primary" onClick={() => window.location.assign(activeJob.applyUrl)}>
              Apply now
            </button>
            <button className="ghost" onClick={toggleSave}>
              {savedJobs.includes(activeJob.jobId) ? "Saved" : "Save"}
            </button>
          </div>

          <section className="outcome-grid">
            <div className="metric">
              <div className="ring ring-good">{hiredRate}</div>
              <span>Hired this month</span>
            </div>
            <div className="metric">
              <div className={`ring ${reviewToneClass}`}>{reviewsScore}</div>
              <span>Reviews</span>
            </div>
            <div className="metric">
              <div className="ring ring-good">{resumeScore}</div>
              <span>Optimize Resume</span>
            </div>
          </section>

          <section className="tabs-grid">
            <div className="panel">
              <h3>Hiring stats</h3>
              <p>Hiring chance: {hiredRate}</p>
              <p>Hired this month: {hiredMonth}</p>
            </div>
            <div className="panel">
              <h3>Reviews</h3>
              <p>Score: {reviewsScore}/5</p>
              <p>{reviewsLine}</p>
            </div>
            <div className="panel">
              <h3>Optimize</h3>
              <p>Match score: {resumeScore}</p>
              <button className="primary" onClick={runLocalOptimize} disabled={optimizing}>
                {optimizing ? "Optimizing locally..." : "Optimize Resume"}
              </button>
              <ul>
                {gaps.length ? gaps.map((gap) => <li key={gap}>{gap}</li>) : <li>No major skill gaps detected.</li>}
              </ul>
              {optimizeOutput ? <pre>{optimizeOutput}</pre> : null}
            </div>
          </section>

          <section className="job-body">
            <h3>Job details</h3>
            <p>{activeJob.summary}</p>
            <ul>
              {activeJob.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </section>
        </article>
      </section>
    </main>
  );
}
