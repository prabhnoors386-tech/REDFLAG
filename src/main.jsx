import ShaderBackground from "./ShaderBackground";
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  FileDown,
  FileSearch,
  IndianRupee,
  MapPinned,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { loadProjects } from "./services/dataService.js";
import { calculateAll } from "./services/riskEngine.js";
import "./styles.css";

const NAV = [
  ["/", "Overview", Activity],
  ["/projects", "Projects", Database],
  ["/alerts", "Alerts", AlertTriangle],
  ["/map", "Risk Map", MapPinned],
  ["/analytics", "Analytics", BarChart3],
  ["/agencies", "Agencies", Building2],
  ["/compliance", "Compliance", ShieldCheck],
  ["/data-quality", "Data Quality", CheckCircle2],
  ["/methodology", "Methodology", FileSearch],
];

const numberFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const money = (value) => `₹${numberFormat.format(Number(value) || 0)}`;

function riskMeta(score) {
  if (score >= 70) return ["Critical Risk", "critical"];
  if (score >= 50) return ["High Risk", "high"];
  if (score >= 30) return ["Moderate Risk", "medium"];
  return ["Low Risk", "low"];
}

function getAlertStatus(alertState, workId) {
  return alertState[workId] || "New";
}

function navigateTo(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function App() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [alertState, setAlertState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("redflag-alerts") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadProjects()
      .then((raw) => {
        if (!alive) return;
        setProjects(calculateAll(raw));
        setError("");
      })
      .catch(() => {
        if (alive) setError("Unable to load the local monitoring dataset.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    localStorage.setItem("redflag-alerts", JSON.stringify(alertState));
  }, [alertState]);

  function setAlertStatus(workId, status) {
    setAlertState((current) => ({ ...current, [workId]: status }));
  }

  if (loading) {
    return (
      <div className="app loading">
        <div className="loader" />
        <span>Loading MPLADS monitoring dataset…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app loading">
        <AlertTriangle size={30} />
        <p>{error}</p>
        <button className="btn" onClick={() => setRefreshKey((v) => v + 1)}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className={sidebarOpen ? "sidebar" : "sidebar collapsed"}>
        <div className="brand">
          <div className="brand-mark">
  <img src="/logo.png" alt="REDFLAG" />
</div>
          {sidebarOpen && (
            <div>
              <div className="brand-name">REDFLAG</div>
              <div className="brand-sub">MPLADS Risk &amp; Anomaly Intelligence</div>
            </div>
          )}
        </div>
        <nav>
          {NAV.map(([to, label, Icon]) => (
            <NavItem key={to} to={to} label={label} Icon={Icon} collapsed={!sidebarOpen} />
          ))}
        </nav>
        {sidebarOpen && (
          <div className="side-note">
            <div className="dot live" />
            <span>Local intelligence mode</span>
            <small>Demonstration dataset</small>
          </div>
        )}
      </aside>

      <main className="main">
        <header className="topbar">
          <button
            className="icon-btn"
            aria-label="Toggle sidebar"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
          <GlobalSearch projects={projects} />
          <div className="top-actions">
            <span className="status">
              <span className="dot live" />
              System operational
            </span>
            <button
              className="icon-btn"
              aria-label="Refresh data"
              title="Refresh data"
              onClick={() => setRefreshKey((v) => v + 1)}
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </header>
        <div className="page">
          <PageRouter
            projects={projects}
            alertState={alertState}
            setAlertStatus={setAlertStatus}
          />
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, label, Icon, collapsed }) {
  const location = useLocation();
  const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
  return (
    <a
      className={`nav-item ${active ? "active" : ""}`}
      href={to}
      title={collapsed ? label : ""}
      onClick={(event) => {
        event.preventDefault();
        navigateTo(to);
      }}
    >
      <Icon size={18} />
      {!collapsed && <span>{label}</span>}
    </a>
  );
}

function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const handle = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handle);
    return () => window.removeEventListener("popstate", handle);
  }, []);
  return path;
}

function GlobalSearch({ projects }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (value.length < 2) return [];
    return projects
      .filter((project) =>
        [
          project.work_id,
          project.work_name,
          project.state,
          project.district,
          project.constituency,
          project.mp_name,
          project.agency,
        ].some((field) => String(field || "").toLowerCase().includes(value)),
      )
      .slice(0, 5);
  }, [projects, query]);

  const openProject = (workId) => {
    navigateTo(`/projects/${encodeURIComponent(workId)}`);
    setQuery("");
  };

  return (
    <div className="global-search">
      <Search size={17} />
      <input
        aria-label="Global search"
        placeholder="Search work ID, project, district, MP or agency…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && results[0]) openProject(results[0].work_id);
        }}
      />
      {query && results.length > 0 && (
        <div className="search-pop">
          {results.map((project) => (
            <button key={project.work_id} onClick={() => openProject(project.work_id)}>
              <strong>{project.work_id}</strong>
              <span>{project.work_name}</span>
              <em>{project.district}</em>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PageRouter({ projects, alertState, setAlertStatus }) {
  const path = usePath();

  if (path.startsWith("/projects/")) {
    const id = decodeURIComponent(path.split("/")[2] || "");
    return (
      <ProjectPage
        project={projects.find((project) => project.work_id === id)}
        projects={projects}
        alertState={alertState}
        setAlertStatus={setAlertStatus}
      />
    );
  }
  if (path === "/projects") return <ProjectsPage projects={projects} />;
  if (path === "/alerts") {
    return (
      <AlertsPage
        projects={projects}
        alertState={alertState}
        setAlertStatus={setAlertStatus}
      />
    );
  }
  if (path === "/map") return <MapPage projects={projects} />;
  if (path === "/analytics") return <AnalyticsPage projects={projects} />;
  if (path === "/agencies") return <AgenciesPage projects={projects} />;
  if (path === "/compliance") return <CompliancePage projects={projects} />;
  if (path === "/data-quality") return <DataQualityPage projects={projects} />;
  if (path === "/methodology") return <MethodologyPage />;
  return <Overview projects={projects} alertState={alertState} />;
}

function LayoutTitle({ eyebrow, title, desc, actions }) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {desc && <p>{desc}</p>}
      </div>
      {actions && <div className="head-actions">{actions}</div>}
    </div>
  );
}

function Metric({ label, value, meta, icon: Icon }) {
  return (
    <section className="metric">
      <div className="metric-icon">
        <Icon size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {meta && <small>{meta}</small>}
      </div>
    </section>
  );
}

function RiskBadge({ score }) {
  const [label, className] = riskMeta(score);
  return (
    <span className={`risk-badge ${className}`}>
      <span className="risk-pip" />
      {label}
    </span>
  );
}

function StatusBadge({ status }) {
  const className = String(status).toLowerCase().replace(/\s+/g, "-");
  return <span className={`status-badge ${className}`}>{status}</span>;
}

function Empty({ label = "No matching records" }) {
  return (
    <div className="empty">
      <FileSearch />
      <strong>{label}</strong>
      <span>Try adjusting the filters or search terms.</span>
    </div>
  );
}

function Overview({ projects, alertState }) {
  const totalSanction = projects.reduce((sum, project) => sum + project.sanction_amount, 0);
  const totalExpenditure = projects.reduce((sum, project) => sum + project.expenditure_amount, 0);
  const high = projects.filter((project) => project.score >= 50);
  const critical = projects.filter((project) => project.score >= 70);
  const averageQuality = projects.length
    ? Math.round(projects.reduce((sum, project) => sum + project.dataQuality, 0) / projects.length)
    : 0;

  const priorityAlerts = [...projects]
    .filter((project) => project.signals.length > 0)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6);

  const stateRows = Object.entries(
    projects.reduce((accumulator, project) => {
      accumulator[project.state] = accumulator[project.state] || { total: 0, score: 0 };
      accumulator[project.state].total += 1;
      accumulator[project.state].score += project.score;
      return accumulator;
    }, {}),
  )
    .map(([state, value]) => ({ state, score: Math.round(value.score / value.total) }))
    .sort((a, b) => b.score - a.score);

  return (
    <>
      <LayoutTitle
        eyebrow="Command Center"
        title="National monitoring overview"
        desc="Risk signals, priority works and evidence-led investigation queues."
        actions={
          <span className="dataset-chip">
            <Database size={15} /> Synthetic / Demonstration
          </span>
        }
      />

      <div className="metrics">
        <Metric label="Total Works" value={projects.length} icon={Database} />
        <Metric label="Sanctioned Value" value={money(totalSanction)} icon={IndianRupee} />
        <Metric label="Total Expenditure" value={money(totalExpenditure)} icon={IndianRupee} />
        <Metric
          label="High-Risk Priority"
          value={high.length}
          meta={`${critical.length} critical`}
          icon={AlertTriangle}
        />
        <Metric label="Data Quality" value={`${averageQuality}%`} meta="validated fields" icon={CheckCircle2} />
      </div>

      <div className="grid-two">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Risk distribution</h2>
              <span>Prioritisation across loaded works</span>
            </div>
          </div>
          <div className="risk-bars">
            <RiskBar label="Low Risk" count={projects.filter((p) => p.score < 30).length} total={projects.length} cls="low" />
            <RiskBar label="Moderate Risk" count={projects.filter((p) => p.score >= 30 && p.score < 50).length} total={projects.length} cls="medium" />
            <RiskBar label="High Risk" count={projects.filter((p) => p.score >= 50 && p.score < 70).length} total={projects.length} cls="high" />
            <RiskBar label="Critical Risk" count={critical.length} total={projects.length} cls="critical" />
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>State risk concentration</h2>
              <span>Average analytical score by state</span>
            </div>
            <a className="link" href="/analytics" onClick={(e) => { e.preventDefault(); navigateTo("/analytics"); }}>
              View analytics <ChevronRight size={15} />
            </a>
          </div>
          <div className="mini-list">
            {stateRows.slice(0, 6).map((row) => (
              <div key={row.state}>
                <strong>{row.state}</strong>
                <div className="mini-track"><i style={{ width: `${row.score}%` }} /></div>
                <b>{row.score}</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Priority alerts</h2>
            <span>Ranked by risk, financial impact and evidence confidence</span>
          </div>
          <a className="link" href="/alerts" onClick={(e) => { e.preventDefault(); navigateTo("/alerts"); }}>
            Open alert center <ChevronRight size={15} />
          </a>
        </div>
        <AlertTable projects={priorityAlerts} alertState={alertState} />
      </section>
    </>
  );
}

function RiskBar({ label, count, total, cls }) {
  const width = total ? (count / total) * 100 : 0;
  return (
    <div className="risk-bar">
      <div><span>{label}</span><b>{count}</b></div>
      <div className="track"><i className={cls} style={{ width: `${width}%` }} /></div>
    </div>
  );
}

function AlertTable({ projects, alertState }) {
  if (!projects.length) return <Empty label="No active alerts" />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Work</th>
            <th>Risk</th>
            <th>Amount</th>
            <th>Main signals</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {projects.map((project, index) => (
            <tr key={project.work_id}>
              <td className="muted">#{index + 1}</td>
              <td>
                <a className="table-link" href={`/projects/${project.work_id}`}>{project.work_id}</a>
                <div className="cell-sub">{project.work_name}</div>
              </td>
              <td>
                <strong>{project.score}</strong>
                <div><RiskBadge score={project.score} /></div>
              </td>
              <td>{money(project.sanction_amount)}</td>
              <td>
                <div className="signal-inline">
                  {project.signals.slice(0, 2).map((signal) => (
                    <span key={`${project.work_id}-${signal.type}`}>{signal.label}</span>
                  ))}
                </div>
              </td>
              <td><StatusBadge status={getAlertStatus(alertState, project.work_id)} /></td>
              <td>
                <a className="icon-link" href={`/projects/${project.work_id}`} aria-label={`Open ${project.work_id}`}>
                  <ChevronRight size={17} />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Select({ label, value, setValue, options, labels = {} }) {
  return (
    <label className="select">
      <span>{label}</span>
      <select value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="All">All</option>
        {options.map((option) => (
          <option key={option} value={option}>{labels[option] || option}</option>
        ))}
      </select>
    </label>
  );
}

function Pagination({ page, pages, setPage }) {
  return (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>Previous</button>
      <span>Page {page} of {pages}</span>
      <button disabled={page >= pages} onClick={() => setPage((v) => v + 1)}>Next</button>
    </div>
  );
}

function ProjectsPage({ projects }) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState("All");
  const [risk, setRisk] = useState("All");
  const [agency, setAgency] = useState("All");
  const [sort, setSort] = useState("score-desc");
  const [page, setPage] = useState(1);

  const states = useMemo(() => [...new Set(projects.map((p) => p.state))].sort(), [projects]);
  const agencies = useMemo(() => [...new Set(projects.map((p) => p.agency))].sort(), [projects]);

  const filtered = useMemo(() => {
    const term = query.toLowerCase().trim();
    return projects.filter((project) => {
      const matchesState = state === "All" || project.state === state;
      const matchesRisk = risk === "All" || riskMeta(project.score)[0] === risk;
      const matchesAgency = agency === "All" || project.agency === agency;
      const haystack = [project.work_id, project.work_name, project.district, project.constituency, project.mp_name, project.agency]
        .join(" ")
        .toLowerCase();
      return matchesState && matchesRisk && matchesAgency && haystack.includes(term);
    });
  }, [agency, projects, query, risk, state]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      if (sort === "score-desc") return b.score - a.score;
      if (sort === "score-asc") return a.score - b.score;
      if (sort === "amount-desc") return b.sanction_amount - a.sanction_amount;
      return a.work_id.localeCompare(b.work_id);
    });
    return copy;
  }, [filtered, sort]);

  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => setPage(1), [agency, query, risk, state]);

  const clear = () => {
    setQuery("");
    setState("All");
    setRisk("All");
    setAgency("All");
    setSort("score-desc");
    setPage(1);
  };

  return (
    <>
      <LayoutTitle
        eyebrow="Monitoring register"
        title="Projects"
        desc={`${filtered.length} works match the current view.`}
        actions={<button className="btn ghost" onClick={clear}><X size={15} /> Clear Filters</button>}
      />

      <section className="panel filters">
        <div className="filter-search">
          <Search size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects…" />
        </div>
        <Select label="State" value={state} setValue={setState} options={states} />
        <Select label="Risk" value={risk} setValue={setRisk} options={["Low Risk", "Moderate Risk", "High Risk", "Critical Risk"]} />
        <Select label="Agency" value={agency} setValue={setAgency} options={agencies} />
        <Select
          label="Sort"
          value={sort}
          setValue={setSort}
          options={["score-desc", "score-asc", "amount-desc", "id"]}
          labels={{
            "score-desc": "Risk: high to low",
            "score-asc": "Risk: low to high",
            "amount-desc": "Sanctioned value",
            id: "Work ID",
          }}
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>All works</h2>
            <span>Every score and signal is derived from loaded project fields.</span>
          </div>
          <span className="dataset-chip"><Database size={14} /> {sorted.length} filtered</span>
        </div>

        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Work ID</th><th>Project</th><th>Location</th><th>Sector</th>
                  <th>Sanctioned</th><th>Expenditure</th><th>Status</th><th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((project) => (
                  <tr key={project.work_id}>
                    <td><a className="table-link" href={`/projects/${project.work_id}`}>{project.work_id}</a></td>
                    <td><strong>{project.work_name}</strong><div className="cell-sub">{project.mp_name}</div></td>
                    <td>{project.district}<div className="cell-sub">{project.state}</div></td>
                    <td>{project.category}</td>
                    <td>{money(project.sanction_amount)}</td>
                    <td>{money(project.expenditure_amount)}<div className="cell-sub">{project.costDeviation >= 0 ? "+" : ""}{project.costDeviation.toFixed(1)}%</div></td>
                    <td><StatusBadge status={project.status} /></td>
                    <td><strong>{project.score}</strong><div><RiskBadge score={project.score} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty />}

        <Pagination page={safePage} pages={pageCount} setPage={setPage} />
      </section>
    </>
  );
}

function ProjectPage({ project, projects, alertState, setAlertStatus }) {
  const [note, setNote] = useState("");

  if (!project) {
    return (
      <>
        <LayoutTitle eyebrow="Project investigation" title="Work not found" desc="The requested project is not in the loaded dataset." />
        <Empty label="Unknown work ID" />
      </>
    );
  }

  const status = getAlertStatus(alertState, project.work_id);
  const similar = project.similar
    .map((item) => ({ match: item, project: projects.find((p) => p.work_id === item.id) }))
    .filter((item) => item.project);

  const exportCase = () => {
    const lines = [
      "REDFLAG — PROJECT RISK REVIEW",
      "",
      `Project ID: ${project.work_id}`,
      `Project: ${project.work_name}`,
      `District: ${project.district}`,
      `State: ${project.state}`,
      `Agency: ${project.agency}`,
      `Risk score: ${project.score}/100`,
      `Risk tier: ${riskMeta(project.score)[0]}`,
      `Confidence: ${project.confidence}`,
      "",
      "Signals:",
      ...project.signals.map((signal) => `- ${signal.label}: ${signal.explanation}`),
      "",
      `Recommended review: ${project.recommendedAction}`,
      note ? `Officer note: ${note}` : "",
      "",
      `Timestamp: ${new Date().toLocaleString("en-IN")}`,
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `REDFLAG-${project.work_id}-review.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <LayoutTitle
        eyebrow="Project investigation"
        title={project.work_name}
        desc={`${project.work_id} · ${project.district}, ${project.state} · ${project.agency}`}
        actions={
          <>
            <button className="btn" onClick={exportCase}><FileDown size={16} /> Export Case</button>
            <button
              className="btn ghost"
              onClick={() => setAlertStatus(project.work_id, status === "Under Review" ? "New" : "Under Review")}
            >
              {status === "Under Review" ? "Reset to New" : "Mark Under Review"}
            </button>
          </>
        }
      />

      <div className="hero-risk">
        <div>
          <span className="eyebrow">Analytical priority</span>
          <div className="risk-score">{project.score}<small>/100</small></div>
          <RiskBadge score={project.score} />
        </div>
        <div className="hero-copy">
          <strong>Why this project is surfaced</strong>
          <p>{project.signals.length ? project.signals.map((s) => s.label).join(" · ") : "No material anomaly signal detected in the current dataset."}</p>
          <span>Confidence: {project.confidence}</span>
        </div>
        <div className="hero-action">
          <span>Case status</span>
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-head">
            <div><h2>Risk Factors</h2><span>Weighted components from the evidence engine</span></div>
          </div>
          <RiskBreakdown project={project} />
        </section>

        <section className="panel">
          <div className="panel-head">
            <div><h2>Project metadata</h2><span>Source fields used by the analysis</span></div>
          </div>
          <div className="meta-grid">
            {[
              ["Work ID", project.work_id], ["MP", project.mp_name], ["House", project.house],
              ["Constituency", project.constituency], ["District", project.district], ["State", project.state],
              ["Sector", project.category], ["Agency", project.agency], ["Sanction amount", money(project.sanction_amount)],
              ["Expenditure", money(project.expenditure_amount)], ["Recommendation", project.recommendation_date],
              ["Sanction", project.sanction_date], ["Completion", project.completion_date || "Not completed"],
              ["Status", project.status],
            ].map(([label, value]) => (
              <div key={label}><span>{label}</span><strong>{value}</strong></div>
            ))}
          </div>
        </section>
      </div>

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Financial Analysis</h2><span>Peer-aware expenditure anomaly</span></div></div>
          <div className="analysis-value">
            <strong>{money(project.expenditure_amount)}</strong>
            <span>vs {money(project.sanction_amount)} sanctioned</span>
            <b className={project.costDeviation > 15 ? "danger" : ""}>{project.costDeviation >= 0 ? "+" : ""}{project.costDeviation.toFixed(1)}%</b>
          </div>
          <div className="explain">
            <strong>{project.costReason}</strong>
            <span>Peer percentile: {Math.round(project.peerPercentile)}th</span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>Timeline Analysis</h2><span>Recommendation → sanction → completion</span></div></div>
          <div className="timeline">
            <div><span>Recommendation</span><b>{project.recommendation_date}</b></div>
            <i />
            <div><span>Sanction</span><b>{project.sanction_date}</b></div>
            <i />
            <div><span>Completion</span><b>{project.completion_date || "Open"}</b></div>
          </div>
          <div className="explain">
            <strong>{project.timelineReason}</strong>
            <span>Sanction lag: {project.sanctionDelay} days · Completion duration: {project.completionDuration ? `${project.completionDuration} days` : "ongoing"}</span>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div><h2>WHY THIS PROJECT WAS FLAGGED</h2><span>Evidence-first explanations generated from calculated values.</span></div>
        </div>
        {project.signals.length ? (
          <div className="signal-grid">
            {project.signals.map((signal, index) => (
              <article className="signal-card" key={`${signal.type}-${index}`}>
                <div className="signal-top">
                  <span className={`signal-icon ${signal.severity.toLowerCase()}`}><AlertTriangle size={16} /></span>
                  <div>
                    <strong>{signal.label}</strong>
                    <small>{signal.severity} severity · {signal.confidence} confidence</small>
                  </div>
                </div>
                <p>{signal.explanation}</p>
                <div className="evidence">
                  <span>Data used</span>
                  <b>{signal.evidence}</b>
                </div>
              </article>
            ))}
          </div>
        ) : <Empty label="No material signals" />}
      </section>

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Similar Projects</h2><span>Prototype similarity heuristic; not a determination of duplication.</span></div></div>
          {similar.length ? (
            <div className="similar-list">
              {similar.slice(0, 5).map(({ match, project: similarProject }) => (
                <a key={similarProject.work_id} href={`/projects/${similarProject.work_id}`} className="similar-row">
                  <div><strong>{similarProject.work_id}</strong><span>{similarProject.work_name}</span></div>
                  <b>{match.score}%</b>
                  <ChevronRight size={16} />
                </a>
              ))}
            </div>
          ) : <Empty label="No sufficiently similar works" />}
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>Recommended Action</h2><span>Generated from risk severity and available evidence.</span></div></div>
          <div className="recommend">
            <CheckCircle2 size={20} />
            <strong>{project.recommendedAction}</strong>
            <p>Suggested review: {project.reviewChecklist.join(" · ")}.</p>
          </div>
          <div className="field-group">
            <label htmlFor="case-note">Case note</label>
            <textarea id="case-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional officer note for this session…" rows={3} />
          </div>
        </section>
      </div>
    </>
  );``
}

function RiskBreakdown({ project }) {
  return (
    <div className="breakdown">
      {Object.entries(project.components).map(([label, value]) => {
        const ratio = value.max ? value.score / value.max : 0;
        return (
          <div key={label}>
            <div><span>{label}</span><b>{value.score}/{value.max}</b></div>
            <div className="component-track"><i style={{ width: `${ratio * 100}%` }} className={ratio > 0.7 ? "high" : ""} /></div>
            <small>{value.reason}</small>
          </div>
        );
      })}
    </div>
  );
}

function AlertsPage({ projects, alertState, setAlertStatus }) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [severity, setSeverity] = useState("All");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const term = query.toLowerCase().trim();
    return projects
      .filter((project) => project.signals.length > 0)
      .filter((project) => {
        const status = getAlertStatus(alertState, project.work_id);
        const matchesStatus = statusFilter === "All" || status === statusFilter;
        const matchesSeverity = severity === "All" || riskMeta(project.score)[0] === severity;
        const haystack = [project.work_id, project.work_name, project.state, project.district, project.agency, ...project.signals.map((s) => s.label)]
          .join(" ")
          .toLowerCase();
        return matchesStatus && matchesSeverity && haystack.includes(term);
      })
      .sort((a, b) => b.priority - a.priority);
  }, [alertState, projects, query, severity, statusFilter]);

  return (
    <>
      <LayoutTitle eyebrow="Alert Center" title="Priority alert queue" desc="Ranked signals linked to project evidence and explanations." actions={<span className="dataset-chip"><AlertTriangle size={14} /> {rows.length} active</span>} />
      <section className="panel filters">
        <div className="filter-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search alerts…" /></div>
        <Select label="Severity" value={severity} setValue={setSeverity} options={["Low Risk", "Moderate Risk", "High Risk", "Critical Risk"]} />
        <Select label="Status" value={statusFilter} setValue={setStatusFilter} options={["New", "Under Review", "Resolved"]} />
      </section>
      <section className="panel">
        <AlertTable projects={rows} alertState={alertState} />
        <div className="alert-actions">
          {rows.map((project) => {
            const status = getAlertStatus(alertState, project.work_id);
            return (
              <div key={project.work_id}>
                <span>{project.work_id}</span>
                <button className="btn ghost" onClick={() => setAlertStatus(project.work_id, status === "New" ? "Under Review" : "New")}>
                  {status === "Under Review" ? "Reset to New" : "Review Alert"}
                </button>
                <button className="btn ghost" onClick={() => setAlertStatus(project.work_id, "Resolved")}>Resolve</button>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function MapPage({ projects }) {
  const rows = Object.entries(
    projects.reduce((accumulator, project) => {
      accumulator[project.state] = accumulator[project.state] || [];
      accumulator[project.state].push(project);
      return accumulator;
    }, {}),
  )
    .map(([state, group]) => ({
      state,
      count: group.length,
      score: Math.round(group.reduce((sum, project) => sum + project.score, 0) / group.length),
      high: group.filter((project) => project.score >= 50).length,
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <>
      <LayoutTitle eyebrow="Geographic risk view" title="Risk Map" desc="State and district concentration view. Precise coordinates are intentionally not assumed by the MVP data model." />
      <section className="notice"><MapPinned size={18} /><div><strong>Geographic scope</strong><span>State, district and constituency are supported. GPS clustering is not enabled because reliable coordinates are not established in the source blueprint.</span></div></section>
      <section className="panel">
        <div className="panel-head"><div><h2>State risk ranking</h2><span>Average analytical risk and priority-work counts</span></div></div>
        <div className="state-grid">
          {rows.map((row) => (
            <article key={row.state}>
              <div><strong>{row.state}</strong><RiskBadge score={row.score} /></div>
              <div><span>{row.count} works</span><b>{row.score}</b></div>
              <div className="mini-track"><i style={{ width: `${row.score}%` }} /></div>
              <a className="link" href="/projects" onClick={(e) => { e.preventDefault(); navigateTo("/projects"); }}>Inspect works <ChevronRight size={14} /></a>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function AnalyticsPage({ projects }) {
  const byCategory = Object.entries(
    projects.reduce((accumulator, project) => {
      accumulator[project.category] = accumulator[project.category] || [];
      accumulator[project.category].push(project.score);
      return accumulator;
    }, {}),
  )
    .map(([category, scores]) => ({ category, score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), count: scores.length }))
    .sort((a, b) => b.score - a.score);

  const sanctioned = projects.reduce((sum, project) => sum + project.sanction_amount, 0);
  const expenditure = projects.reduce((sum, project) => sum + project.expenditure_amount, 0);
  const utilization = sanctioned ? (expenditure / sanctioned) * 100 : 0;

  return (
    <>
      <LayoutTitle eyebrow="Analytics" title="Monitoring analytics" desc="Comparisons that answer concrete monitoring questions." />
      <div className="grid-two">
        <section className="panel"><div className="panel-head"><div><h2>Average risk by sector</h2><span>Higher values indicate greater analytical priority.</span></div></div><div className="h-bars">
          {byCategory.map((row) => <div key={row.category}><div><span>{row.category}</span><b>{row.score}</b></div><div className="track"><i style={{ width: `${row.score}%` }} /></div></div>)}
        </div></section>
        <section className="panel"><div className="panel-head"><div><h2>Expenditure vs sanction</h2><span>Portfolio-level financial position</span></div></div><div className="big-stat"><strong>{money(expenditure)}</strong><span>Total expenditure</span><b>{utilization.toFixed(1)}% of sanctioned value</b></div></section>
      </div>
      <section className="panel"><div className="panel-head"><div><h2>Top risk works</h2><span>Largest current analytical scores</span></div></div><AlertTable projects={[...projects].sort((a, b) => b.score - a.score).slice(0, 10)} alertState={{}} /></section>
    </>
  );
}

function AgenciesPage({ projects }) {
  const groups = Object.entries(
    projects.reduce((accumulator, project) => {
      accumulator[project.agency] = accumulator[project.agency] || [];
      accumulator[project.agency].push(project);
      return accumulator;
    }, {}),
  )
    .map(([name, group]) => ({
      name,
      count: group.length,
      averageRisk: Math.round(group.reduce((sum, project) => sum + project.score, 0) / group.length),
      delayRate: Math.round((group.filter((project) => project.timelineRisk > 0).length / group.length) * 100),
      costRate: Math.round((group.filter((project) => project.costDeviation > 15).length / group.length) * 100),
      highRisk: group.filter((project) => project.score >= 50).length,
    }))
    .sort((a, b) => b.averageRisk - a.averageRisk);

  return (
    <>
      <LayoutTitle eyebrow="Portfolio intelligence" title="Agencies" desc="Comparative monitoring of implementing-agency portfolios; not a corruption assessment." />
      <section className="panel"><div className="table-wrap"><table><thead><tr><th>Agency</th><th>Works</th><th>Portfolio risk</th><th>Delay rate</th><th>Cost anomaly rate</th><th>High-risk</th><th>Monitoring note</th></tr></thead><tbody>
        {groups.map((group) => <tr key={group.name}><td><strong>{group.name}</strong></td><td>{group.count}</td><td><strong>{group.averageRisk}</strong><div><RiskBadge score={group.averageRisk} /></div></td><td>{group.delayRate}%</td><td>{group.costRate}%</td><td>{group.highRisk}</td><td>{group.averageRisk >= 50 ? <span className="text-danger">Elevated risk concentration</span> : <span className="muted">Within current peer range</span>}</td></tr>)}
      </tbody></table></div></section>
    </>
  );
}

function CompliancePage({ projects }) {
  const checks = projects.flatMap((project) => project.compliance.map((check) => ({ ...check, work: project })));
  const rules = Object.values(
    checks.reduce((accumulator, check) => {
      if (!accumulator[check.rule]) accumulator[check.rule] = { rule: check.rule, passed: 0, review: 0, affected: [] };
      if (check.status === "Passed") accumulator[check.rule].passed += 1;
      else {
        accumulator[check.rule].review += 1;
        accumulator[check.rule].affected.push(check.work.work_id);
      }
      return accumulator;
    }, {}),
  );

  return (
    <>
      <LayoutTitle eyebrow="Compliance intelligence" title="Compliance Center" desc="Deterministic checks supported by the available project fields." />
      <div className="metrics">
        <Metric label="Total Checks" value={checks.length} icon={ShieldCheck} />
        <Metric label="Passed" value={checks.filter((c) => c.status === "Passed").length} icon={CheckCircle2} />
        <Metric label="Requires Review" value={checks.filter((c) => c.status === "Requires Review").length} icon={AlertTriangle} />
        <Metric label="High Priority" value={checks.filter((c) => c.severity === "High").length} icon={Clock3} />
      </div>
      <section className="panel"><div className="rule-list">
        {rules.map((rule) => (
          <details key={rule.rule}>
            <summary><div><strong>{rule.rule}</strong><span>{rule.passed} passed · {rule.review} require review</span></div><ChevronRight size={17} /></summary>
            <div className="rule-detail"><p>Only machine-checkable fields are evaluated; exceptions still require human review.</p><div className="chip-row">{rule.affected.map((id) => <a className="chip" href={`/projects/${id}`} key={id}>{id}</a>)}</div></div>
          </details>
        ))}
      </div></section>
    </>
  );
}

function DataQualityPage({ projects }) {
  const fields = [
    ["Recommendation date", (p) => p.recommendation_date],
    ["Sanction date", (p) => p.sanction_date],
    ["Positive sanction amount", (p) => p.sanction_amount > 0],
    ["Agency", (p) => p.agency],
    ["Description", (p) => p.description],
    ["Valid date order", (p) => p.sanctionDelay >= 0],
  ];
  const rows = fields.map(([name, check]) => {
    const bad = projects.filter((project) => !check(project)).length;
    return { name, bad, rate: projects.length ? (bad / projects.length) * 100 : 0 };
  });
  const score = projects.length ? Math.round(projects.reduce((sum, p) => sum + p.dataQuality, 0) / projects.length) : 0;

  return (
    <>
      <LayoutTitle eyebrow="Trust layer" title="Data Quality" desc="Validation that protects analytics from incomplete or inconsistent source records." actions={<span className="dataset-chip"><CheckCircle2 size={14} /> Score {score}%</span>} />
      <section className="panel">
        <div className="quality-hero"><div className="quality-score">{score}%</div><div><strong>Dataset quality score</strong><p>Calculated from core field completeness and date validity across the loaded records.</p></div></div>
        <div className="quality-list">{rows.map((row) => <div key={row.name}><div><span>{row.name}</span><b>{row.bad} missing / invalid</b></div><div className="track"><i style={{ width: `${100 - row.rate}%` }} /></div></div>)}</div>
      </section>
    </>
  );
}

function MethodologyPage() {
  return (
    <>
      <LayoutTitle eyebrow="Trust Center" title="Methodology" desc="How REDFLAG turns project records into transparent prioritisation signals." />
      <section className="panel method">
        <div className="method-grid">{[
          "Validate data", "Apply regulatory rules", "Compare with peers", "Detect text similarity",
          "Aggregate agency behaviour", "Calculate risk", "Generate explanations", "Route for human review",
        ].map((item, index) => <article key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong></article>)}</div>
        <div className="notice"><ShieldCheck size={18} /><div><strong>Responsible use</strong><span>Risk score is an analytical prioritization aid, not a legal finding of fraud or wrongdoing. Synthetic / Demonstration records are disclosed in this MVP.</span></div></div>
        <div className="prose">
          <h2>What is deliberately not claimed</h2>
          <p>The MVP does not train a supervised fraud classifier, infer GPS hotspots, build vendor networks, or depend on an external government API that has not been verified. These are future or conditional capabilities.</p>
          <h2>Risk model</h2>
          <p>Financial 25 · Timeline 20 · Compliance 25 · Duplicate 15 · Agency 15. Product tiers: 0–29 Low, 30–49 Moderate, 50–69 High, 70–100 Critical.</p>
        </div>
      </section>
    </>
  );
}

function AppWithRouter() {
  return <BrowserRouter><App /></BrowserRouter>;
}
createRoot(document.getElementById("root")).render(
  <>
    <ShaderBackground />
    <AppWithRouter />
  </>
);

