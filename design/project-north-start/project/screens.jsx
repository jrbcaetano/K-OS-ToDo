// All screen components for North Star

// =================== TODAY ===================
const TodayScreen = ({ onOpenTask, onQuickAdd }) => {
  const t = NS.TASKS;
  return (
    <div className="content-inner">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>
            Thursday · 7 May 2026
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em" }}>
            Good morning, Joao.
          </h2>
          <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>
            3 focus tasks · 2 meetings · 4 follow-ups due
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn"><Icon name="filter" size={12} /> Filter</button>
          <button className="btn btn-primary" onClick={onQuickAdd}><Icon name="plus" size={12} /> Quick add <span className="kbd" style={{ marginLeft: 4, color: "rgba(245,243,238,0.7)", borderColor: "rgba(245,243,238,0.2)", background: "transparent" }}>⌘K</span></button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Focus</div><div className="kpi-value">3</div><div className="kpi-meta">pinned for today</div></div>
        <div className="kpi"><div className="kpi-label">Due today</div><div className="kpi-value">3</div><div className="kpi-meta">1 critical</div></div>
        <div className="kpi"><div className="kpi-label">Overdue</div><div className="kpi-value" style={{ color: "var(--pri-critical)" }}>2</div><div className="kpi-meta alert">needs triage</div></div>
        <div className="kpi"><div className="kpi-label">Follow-ups due</div><div className="kpi-value">4</div><div className="kpi-meta">2 stale</div></div>
      </div>

      <div className="section">
        <SectionHead title="Focus" count={t.focus.length} action="Unpin all" />
        {t.focus.map((x) => <TaskRow key={x.id} t={x} onOpen={onOpenTask} />)}
      </div>

      <div className="section">
        <SectionHead title="Overdue" count={t.overdue.length} alert="needs attention" />
        {t.overdue.map((x) => <TaskRow key={x.id} t={x} onOpen={onOpenTask} />)}
      </div>

      <div className="section">
        <SectionHead title="Due today" count={t.due.length} />
        {t.due.map((x) => <TaskRow key={x.id} t={x} onOpen={onOpenTask} />)}
      </div>

      <div className="section">
        <SectionHead title="Follow-ups due today" count={t.followups.length} />
        {t.followups.map((x) => <TaskRow key={x.id} t={x} onOpen={onOpenTask} showStatus />)}
      </div>

      <div className="section">
        <SectionHead title="Scheduled" count={t.scheduled.length} />
        {t.scheduled.map((x) => <TaskRow key={x.id} t={x} onOpen={onOpenTask} />)}
      </div>
    </div>);

};

// =================== INBOX ===================
const InboxScreen = ({ onOpenTask }) => {
  const [idx, setIdx] = React.useState(0);
  const items = NS.TASKS.inbox;
  const item = items[idx];
  const next = () => setIdx((i) => Math.min(items.length - 1, i + 1));

  return (
    <div className="content-inner" style={{ maxWidth: 880 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>Inbox</h2>
        <span className="hint">
          <span>Triage one at a time</span>
          <span className="kbd">J</span><span className="kbd">K</span> to navigate
        </span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 18 }}>
        {items.length} items waiting · processed 7 today
      </div>

      <div className="triage-card">
        <div className="triage-source">
          <span>{item.source}</span>
          <span style={{ color: "var(--ink-5)" }}>·</span>
          <span>{idx + 1} / {items.length}</span>
          <span style={{ marginLeft: "auto" }} className="ai-chip"><Icon name="sparkles" size={10} /> AI suggestions ready</span>
        </div>
        <div className="triage-title">{item.title}</div>
        <div className="triage-body">{item.body}</div>

        <div className="triage-suggestions">
          <span className="label">Suggested</span>
          <span className="qc-parse-chip"><span className="ai-dot" /> Status · Waiting</span>
          <span className="qc-parse-chip"><span className="ai-dot" /> Person · Andy</span>
          <span className="qc-parse-chip"><span className="ai-dot" /> Project · Appraisals 2026 H1</span>
          <span className="qc-parse-chip"><span className="ai-dot" /> Review · Fri 15 May</span>
          <span className="qc-parse-chip"><span className="ai-dot" /> Priority · Important</span>
          <button className="btn" style={{ marginLeft: "auto", height: 22, padding: "0 8px", fontSize: 11 }}>Edit</button>
        </div>

        <div className="triage-actions">
          <button className="action-btn action-btn-primary" onClick={next}>Accept & next <span className="kbd" style={{ borderColor: "rgba(245,243,238,0.25)", color: "rgba(245,243,238,0.85)", background: "transparent" }}>⏎</span></button>
          <button className="action-btn">Make Next <span className="kbd">N</span></button>
          <button className="action-btn">Schedule <span className="kbd">S</span></button>
          <button className="action-btn">Waiting <span className="kbd">W</span></button>
          <button className="action-btn">Delegate <span className="kbd">D</span></button>
          <button className="action-btn">Snooze <span className="kbd">Z</span></button>
          <button className="action-btn" style={{ color: "var(--pri-critical)" }}>Delete <span className="kbd">⌫</span></button>
        </div>
      </div>

      <SectionHead title="Up next" count={items.length - 1} />
      {items.slice(idx + 1).map((it, i) =>
      <div key={it.id} className="task" onClick={() => setIdx(idx + 1 + i)}>
          <span className="checkbox" />
          <div className="task-body">
            <div className="task-title">{it.title}</div>
            <div className="task-meta"><span className="mono">{it.source}</span></div>
          </div>
          <div className="task-right">
            <span className="ai-chip"><Icon name="sparkles" size={10} /> ready</span>
          </div>
        </div>
      )}
    </div>);

};

// =================== UPCOMING ===================
const UpcomingScreen = ({ onOpenTask }) => {
  const groups = [
  { title: "Tomorrow · Fri 8 May", count: 4, items: [
    { id: "u1", title: "1:1 with Pedro — staging deploy walkthrough", priority: "important", ctx: "praesto", project: "Future Life launch", person: "pedro", dateLabel: "09:30" },
    { id: "u2", title: "Confirm physio Tuesday slot", priority: "routine", ctx: "health", project: "—", person: null, dateLabel: "All day" },
    { id: "u3", title: "Review Andy's calibration notes", priority: "important", ctx: "boxfusion", project: "Appraisals 2026 H1", person: "andy", dateLabel: "Follow-up" },
    { id: "u4", title: "Casa — countertop sample arrives", priority: "routine", ctx: "home", project: "Casa renovation", person: "telma", dateLabel: "PM" }]
  },
  { title: "This week · 9–11 May", count: 6, items: [
    { id: "u5", title: "Demo Future Life pilot to Marco's team", priority: "critical", ctx: "praesto", project: "Future Life launch", person: "marco", dateLabel: "Fri 09:00" },
    { id: "u6", title: "Boxfusion all-hands prep", priority: "important", ctx: "boxfusion", project: "—", person: null, dateLabel: "Fri" },
    { id: "u7", title: "Catarina school trip permission slip due", priority: "routine", ctx: "family", project: "—", person: "catarina", dateLabel: "Wed" },
    { id: "u8", title: "Review Q2 hiring pipeline with Paola", priority: "important", ctx: "boxfusion", project: "Q2 senior hiring", person: "paola", dateLabel: "Thu 10:00" }]
  },
  { title: "Next week · 12–18 May", count: 7, items: [
    { id: "u9", title: "Mid-month roadmap review — Praesto", priority: "important", ctx: "praesto", project: "—", person: "marco", dateLabel: "Tue" },
    { id: "u10", title: "Rita — SOW signing follow-up", priority: "critical", ctx: "boxfusion", project: "—", person: "rita", dateLabel: "Mon" },
    { id: "u11", title: "Annual health check — book", priority: "important", ctx: "health", project: "—", person: null, dateLabel: "Tue" }]
  },
  { title: "Later", count: 12 }];

  return (
    <div className="content-inner" style={{ color: "rgb(137, 137, 137)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>Upcoming</h2>
        <div className="filterbar" style={{ padding: 0 }}>
          <span className="filter-chip active">All contexts</span>
          <span className="filter-chip">Boxfusion</span>
          <span className="filter-chip">Praesto</span>
          <span className="filter-chip">Personal</span>
          <span className="filter-chip"><Icon name="filter" size={11} /> More</span>
        </div>
      </div>

      {groups.map((g) =>
      <div className="section" key={g.title}>
          <SectionHead title={g.title} count={g.count} />
          {g.items ? g.items.map((t) => <TaskRow key={t.id} t={t} onOpen={onOpenTask} />) :
        <div className="empty"><div>{g.count} items further out · view list</div></div>
        }
        </div>
      )}
    </div>);

};

// =================== WAITING ===================
const WaitingScreen = ({ onOpenTask }) => {
  const w = NS.TASKS.waiting;
  const groupedByPerson = {};
  w.forEach((it) => {(groupedByPerson[it.waitingFor] = groupedByPerson[it.waitingFor] || []).push(it);});

  const WaitingRow = ({ t }) => {
    const p = NS.PEOPLE.find((x) => x.id === t.waitingFor);
    return (
      <div className="task" onClick={() => onOpenTask && onOpenTask(t)}>
        <span className={`checkbox`} />
        <div className="task-body">
          <div className="task-title">{t.title}</div>
          <div className="task-meta">
            <StatusChip status={t.status} />
            <span className="sep">·</span>
            <CtxBadge ctx={t.ctx} />
            <span className="sep">·</span>
            <span>waiting {t.since}</span>
            <span className="sep">·</span>
            <span>source: {t.source}</span>
          </div>
        </div>
        <div className="task-right">
          {p && <PersonChip id={p.id} />}
          {!p && <span className="person-chip">{t.waitingFor}</span>}
          <span className={`date-chip ${t.review === "stale" ? "overdue" : t.review === "today" ? "today" : ""}`}>
            {t.review === "stale" ? "Stale" : t.review === "today" ? "Review today" : `Review ${t.review}`}
          </span>
          <button className="btn" style={{ height: 22, padding: "0 8px", fontSize: 11 }}>Nudge</button>
        </div>
      </div>);

  };

  return (
    <div className="content-inner">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>Waiting · Follow-ups</h2>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4 }}>{w.length} open · 2 stale · 3 due review today</div>
        </div>
        <div className="filterbar" style={{ padding: 0 }}>
          <span className="filter-chip active">By urgency</span>
          <span className="filter-chip">By person</span>
          <span className="filter-chip">By context</span>
        </div>
      </div>

      <div className="section">
        <SectionHead title="Stale — waiting too long" count={w.filter((x) => x.review === "stale").length} alert="follow up now" />
        {w.filter((x) => x.review === "stale").map((t) => <WaitingRow key={t.title} t={t} />)}
      </div>
      <div className="section">
        <SectionHead title="Review due today" count={w.filter((x) => x.review === "today").length} />
        {w.filter((x) => x.review === "today").map((t) => <WaitingRow key={t.title} t={t} />)}
      </div>
      <div className="section">
        <SectionHead title="Upcoming follow-ups" count={w.filter((x) => !["stale", "today"].includes(x.review)).length} />
        {w.filter((x) => !["stale", "today"].includes(x.review)).map((t) => <WaitingRow key={t.title} t={t} />)}
      </div>
    </div>);

};

// =================== PEOPLE ===================
const PeopleScreen = ({ onOpenPerson }) => {
  const [selected, setSelected] = React.useState("andy");
  const p = NS.PEOPLE.find((x) => x.id === selected);

  return (
    <div className="split">
      <div className="split-left">
        <div style={{ padding: "20px 24px 12px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>People</h2>
            <button className="btn"><Icon name="plus" size={12} /> Add person</button>
          </div>
          <div className="filterbar" style={{ padding: "8px 0 0" }}>
            <span className="filter-chip active">All</span>
            <span className="filter-chip">Boxfusion</span>
            <span className="filter-chip">Praesto</span>
            <span className="filter-chip">Family</span>
            <span className="filter-chip">Stale</span>
          </div>
        </div>
        <div style={{ padding: "0 16px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "32px minmax(0,1fr) 60px 60px 90px", gap: 14, padding: "6px 8px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-4)", fontFamily: "var(--font-mono)", borderBottom: "1px solid var(--line)" }}>
            <span></span><span>Name</span><span style={{ textAlign: "right" }}>Open</span><span style={{ textAlign: "right" }}>Wait</span><span style={{ textAlign: "right" }}>Next</span>
          </div>
          {NS.PEOPLE.map((x) =>
          <div key={x.id} className={`person-row ${selected === x.id ? "selected" : ""}`} onClick={() => setSelected(x.id)} style={{ gridTemplateColumns: "32px minmax(0,1fr) 60px 60px 90px" }}>
              <Avatar person={x} size={28} />
              <div style={{ minWidth: 0 }}>
                <div className="name">{x.name}</div>
                <div className="ctx-meta">{x.role}</div>
              </div>
              <div className="loop-badge"><div className="num">{x.openTasks}</div><div>open</div></div>
              <div className={`loop-badge ${x.waiting > 1 ? "warn" : ""}`}><div className="num">{x.waiting}</div><div>waiting</div></div>
              <div style={{ textAlign: "right", fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>{x.nextMeeting}</div>
            </div>
          )}
        </div>
      </div>
      <PersonDetail person={p} onOpenPerson={onOpenPerson} />
    </div>);

};

const PersonDetail = ({ person, onOpenPerson }) => {
  const owesYou = [
  { id: "py1", title: "Cahil — draft self-review", since: "8d", review: "today", status: "waiting" },
  { id: "py2", title: "Calibration notes for skip-level reviews", since: "5d", review: "tomorrow", status: "waiting" }];

  const youOwe = [
  { id: "yo1", title: "Send 1:1 notes from last Thursday", date: "today", priority: "routine" },
  { id: "yo2", title: "Confirm Cahil salary band — discuss with Paola", date: "today", priority: "important" }];

  const topics = [
  "Cahil's title / re-leveling thought",
  "Pilot 3 readiness — Marco update",
  "Capacity for Q3 hiring loop",
  "Skip-level pulse on Future Life team"];

  return (
    <div className="split-right" style={{ padding: 0 }}>
      <div style={{ padding: "22px 24px 0" }}>
        <div className="person-hero">
          <Avatar person={person} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>{person.name}</h2>
            <div className="meta">{person.role} · last spoke {person.lastSeen} · next {person.nextMeeting}</div>
          </div>
          <button className="btn"><Icon name="sparkles" size={12} /> Brief me</button>
        </div>

        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 16 }}>
          <div className="kpi"><div className="kpi-label">Open</div><div className="kpi-value">{person.openTasks}</div></div>
          <div className="kpi"><div className="kpi-label">Waiting</div><div className="kpi-value">{person.waiting}</div><div className="kpi-meta">on them</div></div>
          <div className="kpi"><div className="kpi-label">You owe</div><div className="kpi-value">{person.owesThem}</div></div>
          <div className="kpi"><div className="kpi-label">They owe</div><div className="kpi-value">{person.owesYou}</div></div>
        </div>

        <div className="subnav">
          <span className="subnav-item active">Open loops <span className="subnav-count">6</span></span>
          <span className="subnav-item">Topics <span className="subnav-count">{topics.length}</span></span>
          <span className="subnav-item">Timeline</span>
          <span className="subnav-item">Projects</span>
          <span className="subnav-item">Notes</span>
        </div>
      </div>

      <div style={{ padding: "0 24px 32px" }}>
        <div className="section">
          <SectionHead title="They owe you" count={owesYou.length} />
          {owesYou.map((t) =>
          <div className="task" key={t.id}>
              <span className="checkbox" />
              <div className="task-body">
                <div className="task-title">{t.title}</div>
                <div className="task-meta"><StatusChip status={t.status} /><span className="sep">·</span><span>waiting {t.since}</span></div>
              </div>
              <div className="task-right">
                <span className={`date-chip ${t.review === "today" ? "today" : ""}`}>Review {t.review}</span>
              </div>
            </div>
          )}
        </div>
        <div className="section">
          <SectionHead title="You owe them" count={youOwe.length} />
          {youOwe.map((t) =>
          <div className="task" key={t.id}>
              <span className={`checkbox priority-${t.priority}`} />
              <div className="task-body">
                <div className="task-title">{t.title}</div>
                <div className="task-meta"><span>Due today</span></div>
              </div>
              <div className="task-right"><PriorityDot pri={t.priority} /></div>
            </div>
          )}
        </div>
        <div className="section">
          <SectionHead title="Topics for next conversation" count={topics.length} action="+ Add" />
          {topics.map((t, i) =>
          <div key={i} style={{ display: "flex", gap: 10, padding: "8px 4px", borderBottom: "1px solid var(--line-soft)", fontSize: 12.5 }}>
              <span style={{ color: "var(--ink-4)", fontFamily: "var(--font-mono)", fontSize: 11, minWidth: 16 }}>{i + 1}.</span>
              <span style={{ flex: 1 }}>{t}</span>
              <button className="icon-btn" style={{ height: 18, minWidth: 18, fontSize: 10 }}><Icon name="check" size={10} /></button>
            </div>
          )}
        </div>
      </div>
    </div>);

};

// =================== PROJECTS ===================
const ProjectsScreen = ({ onOpenProject }) => {
  const [selected, setSelected] = React.useState(null);
  const [tab, setTab] = React.useState("active"); // active | archived
  const [confirmArchive, setConfirmArchive] = React.useState(null);

  if (selected) return <ProjectDetail project={selected} onBack={() => setSelected(null)} onArchive={() => { setConfirmArchive(selected); }} />;

  const renderActive = () => (
    <>
      <div className="filterbar">
        <span className="filter-chip active">All · {NS.PROJECTS.length}</span>
        <span className="filter-chip">Needs attention · 1</span>
        <span className="filter-chip">Idle · 1</span>
        <span className="filter-chip">All contexts</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {NS.PROJECTS.map((p) =>
          <div key={p.id} className="proj-card" onClick={() => setSelected(p)}>
            <div className="proj-card-head">
              <div className="name">{p.name}</div>
              <CtxBadge ctx={p.ctx} />
              <span style={{ marginLeft: "auto", fontSize: 11, color: p.status === "Needs attention" ? "var(--pri-critical)" : p.status === "Idle" ? "var(--ink-4)" : "var(--status-done)", fontFamily: "var(--font-mono)" }}>{p.status}</span>
              <button className="card-menu" onClick={(e) => { e.stopPropagation(); setConfirmArchive(p); }} title="Archive…"><Icon name="moreH" size={13} /></button>
            </div>
            <div className="outcome">{p.outcome}</div>
            <div className="bar"><i style={{ width: `${p.progress * 100}%` }} /></div>
            <div className="meta">
              <span><strong>{p.open}</strong> open</span>
              {p.overdue > 0 && <span style={{ color: "var(--pri-critical)" }}><strong style={{ color: "var(--pri-critical)" }}>{p.overdue}</strong> overdue</span>}
              <span>target <strong>{p.target}</strong></span>
              <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                {p.people.map((id) => <Avatar key={id} person={id} size={18} />)}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", paddingTop: 2 }}>
              <span style={{ color: "var(--ink-4)", fontFamily: "var(--font-mono)", fontSize: 10.5 }}>NEXT </span>
              {p.next}
            </div>
          </div>
        )}
      </div>
    </>
  );

  const renderArchived = () => (
    <>
      <div className="archive-banner">
        <div className="archive-banner-icon"><Icon name="moon" size={14} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Archived projects are out of sight, not gone.</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.5 }}>
            They disappear from Today, Upcoming, dashboards, and the project picker. Their tasks and notes stay searchable. Restore at any time to bring everything back.
          </div>
        </div>
      </div>
      <div className="filterbar">
        <span className="filter-chip active">All · {NS.ARCHIVED_PROJECTS.length}</span>
        <span className="filter-chip">Completed · 2</span>
        <span className="filter-chip">Dropped · 1</span>
        <span className="filter-chip">Paused · 1</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {NS.ARCHIVED_PROJECTS.map((p) =>
          <div key={p.id} className="proj-card archived">
            <div className="proj-card-head">
              <div className="name">{p.name}</div>
              <CtxBadge ctx={p.ctx} />
              <span className="archive-tag mono">{p.reason}</span>
            </div>
            <div className="outcome">{p.outcome}</div>
            {p.note && <div style={{ fontSize: 12, color: "var(--ink-3)", fontStyle: "italic", borderLeft: "2px solid var(--line)", paddingLeft: 10 }}>{p.note}</div>}
            <div className="meta">
              <span><strong>{p.completed}</strong> tasks completed</span>
              <span style={{ color: "var(--ink-4)" }}>archived {p.archivedAt} · by {p.archivedBy}</span>
              <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                {p.people.map((id) => <Avatar key={id} person={id} size={18} />)}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6, paddingTop: 4 }}>
              <button className="btn"><Icon name="arrowRight" size={12} /> Restore</button>
              <button className="btn">View</button>
              <button className="btn" style={{ marginLeft: "auto", color: "var(--ink-4)" }}>Delete forever</button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="content-inner content-wide" style={{ maxWidth: "none" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>Projects</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn"><Icon name="filter" size={12} /> Filter</button>
          <button className="btn btn-primary"><Icon name="plus" size={12} /> New project</button>
        </div>
      </div>

      <div className="subnav" style={{ marginBottom: 18 }}>
        <span className={`subnav-item ${tab === "active" ? "active" : ""}`} onClick={() => setTab("active")}>Active <span className="subnav-count">{NS.PROJECTS.length}</span></span>
        <span className={`subnav-item ${tab === "archived" ? "active" : ""}`} onClick={() => setTab("archived")}>Archived <span className="subnav-count">{NS.ARCHIVED_PROJECTS.length}</span></span>
      </div>

      {tab === "active" ? renderActive() : renderArchived()}

      {confirmArchive && <ArchiveConfirm kind="project" item={confirmArchive} onClose={() => setConfirmArchive(null)} />}
    </div>
  );
};

const ArchiveConfirm = ({ kind, item, onClose }) => {
  const [reason, setReason] = React.useState(kind === "project" ? "Completed" : "No longer my responsibility");
  const reasons = kind === "project"
    ? ["Completed", "Dropped — not worth it", "Paused indefinitely", "Replaced by another project"]
    : ["No longer my responsibility", "Replaced by another area", "Combined into another area", "Stepped down"];
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="qc-modal" style={{ width: 540 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 22px 8px" }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "var(--font-mono)", marginBottom: 6 }}>Archive {kind}</div>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>{item.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 8, lineHeight: 1.55 }}>
            {kind === "project" ? "Open tasks become read-only. The project leaves Today, Upcoming, and the project picker. Tasks and notes stay searchable." : "The area stops contributing to Review and standing dashboards. Recurring tasks pause until you restore."}
          </div>
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--line-soft)", background: "var(--paper-2)" }}>
          <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "var(--font-mono)", marginBottom: 8 }}>Reason</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {reasons.map(r => (
              <button key={r} className={`filter-chip ${reason === r ? "active" : ""}`} onClick={() => setReason(r)}>{r}</button>
            ))}
          </div>
          <textarea
            placeholder="Note for future you (optional)…"
            style={{ width: "100%", marginTop: 12, padding: 10, border: "1px solid var(--line)", borderRadius: 6, background: "var(--paper)", fontSize: 12.5, minHeight: 60, resize: "vertical", outline: "none" }}
          />
        </div>
        <div className="qc-foot">
          <span className="archive-impact">
            <span style={{ color: "var(--ink-2)" }}>Will hide from:</span>
            <span className="qc-parse-chip">Today</span>
            <span className="qc-parse-chip">Upcoming</span>
            <span className="qc-parse-chip">Project picker</span>
            <span className="qc-parse-chip">Dashboards</span>
          </span>
          <span className="right">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={onClose}><Icon name="moon" size={11} /> Archive</button>
          </span>
        </div>
      </div>
    </div>
  );
};

const ProjectDetail = ({ project, onBack, onArchive }) => {
  const tasks = [
  { id: "pt1", title: "Confirm pilot customer 3 — Marco call", priority: "critical", ctx: "praesto", person: "marco", dateLabel: "Today", status: "next" },
  { id: "pt2", title: "Pedro — staging deploy walkthrough", priority: "important", ctx: "praesto", person: "pedro", dateLabel: "Tomorrow", status: "delegated" },
  { id: "pt3", title: "Demo deck — pilot 1 metrics", priority: "important", ctx: "praesto", person: null, dateLabel: "Fri", status: "next" },
  { id: "pt4", title: "Pricing approval — wait on Marco's CFO", priority: "important", ctx: "praesto", person: "marco", dateLabel: "Stale 9d", status: "waiting" },
  { id: "pt5", title: "Onboarding playbook draft", priority: "routine", ctx: "praesto", person: null, dateLabel: "May 18", status: "scheduled" }];

  const milestones = [
  { name: "Pilot 1 live", date: "Apr 12", done: true },
  { name: "Pilot 2 live", date: "May 1", done: true },
  { name: "Pilot 3 confirmed", date: "May 12", done: false },
  { name: "Demo at customer board", date: "May 16", done: false },
  { name: "Public launch", date: "Jun 28", done: false }];

  return (
    <div className="content-inner content-wide" style={{ maxWidth: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>
        <span onClick={onBack} style={{ cursor: "pointer" }}>Projects</span>
        <Icon name="chevron" size={11} />
        <span style={{ color: "var(--ink)" }}>{project.name}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em" }}>{project.name}</h2>
        <CtxBadge ctx={project.ctx} />
        <span className="status status-next" style={{ color: project.status === "Needs attention" ? "var(--pri-critical)" : "var(--status-done)" }}>{project.status}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="btn" onClick={onArchive}><Icon name="moon" size={12} /> Archive</button>
          <button className="btn"><Icon name="moreH" size={13} /></button>
        </div>
      </div>
      <div style={{ fontSize: 13, color: "var(--ink-2)", maxWidth: 70 + "ch", marginBottom: 16 }}>{project.outcome}</div>

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Open tasks</div><div className="kpi-value">{project.open}</div></div>
        <div className="kpi"><div className="kpi-label">Overdue</div><div className="kpi-value" style={{ color: project.overdue ? "var(--pri-critical)" : undefined }}>{project.overdue}</div></div>
        <div className="kpi"><div className="kpi-label">Target</div><div className="kpi-value" style={{ fontSize: 16 }}>{project.target}</div><div className="kpi-meta">52 days</div></div>
        <div className="kpi"><div className="kpi-label">Progress</div><div className="kpi-value">{Math.round(project.progress * 100)}%</div><div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${project.progress * 100}%` }} /></div></div>
      </div>

      <div className="subnav" style={{ marginBottom: 18 }}>
        <span className="subnav-item active">Tasks <span className="subnav-count">{project.open}</span></span>
        <span className="subnav-item">Milestones <span className="subnav-count">{milestones.length}</span></span>
        <span className="subnav-item">Waiting <span className="subnav-count">2</span></span>
        <span className="subnav-item">People</span>
        <span className="subnav-item">Notes</span>
        <span className="subnav-item">Decisions</span>
        <span className="subnav-item">Activity</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32 }}>
        <div>
          <SectionHead title="Tasks" count={tasks.length} />
          {tasks.map((t) => <TaskRow key={t.id} t={t} showProject={false} showStatus />)}
        </div>
        <div>
          <SectionHead title="Milestones" count={milestones.length} />
          {milestones.map((m, i) =>
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", borderBottom: "1px solid var(--line-soft)" }}>
              <span className={`checkbox ${m.done ? "checked" : ""}`} />
              <span style={{ flex: 1, fontSize: 12.5, color: m.done ? "var(--ink-3)" : "var(--ink)", textDecoration: m.done ? "line-through" : "none" }}>{m.name}</span>
              <span className="date-chip">{m.date}</span>
            </div>
          )}

          <div style={{ marginTop: 22 }}>
            <SectionHead title="People" count={project.people.length} />
            {project.people.map((id) => {
              const p = NS.PEOPLE.find((x) => x.id === id);
              return (
                <div key={id} className="person-row" style={{ gridTemplateColumns: "28px 1fr 60px", padding: "10px 4px" }}>
                  <Avatar person={p} size={28} />
                  <div><div className="name">{p.name}</div><div className="ctx-meta">{p.role}</div></div>
                  <div className="loop-badge"><div className="num">{p.openTasks}</div><div>open</div></div>
                </div>);

            })}
          </div>
        </div>
      </div>
    </div>);

};

// =================== AREAS ===================
const AreasScreen = ({ onOpenArea }) => {
  const [tab, setTab] = React.useState("active");
  const [confirmArchive, setConfirmArchive] = React.useState(null);

  return (
    <div className="content-inner content-wide" style={{ maxWidth: "none" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>Areas</h2>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4 }}>Standing responsibilities · no end date · review on cadence</div>
        </div>
        <button className="btn"><Icon name="plus" size={12} /> New area</button>
      </div>

      <div className="subnav" style={{ marginBottom: 18 }}>
        <span className={`subnav-item ${tab === "active" ? "active" : ""}`} onClick={() => setTab("active")}>Active <span className="subnav-count">{NS.AREAS.length}</span></span>
        <span className={`subnav-item ${tab === "archived" ? "active" : ""}`} onClick={() => setTab("archived")}>Archived <span className="subnav-count">{NS.ARCHIVED_AREAS.length}</span></span>
      </div>

      {tab === "active" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {NS.AREAS.map((a) =>
            <div key={a.id} className="proj-card" onClick={() => onOpenArea && onOpenArea(a)}>
              <div className="proj-card-head">
                <div className="name">{a.name}</div>
                {a.stale > 0 && <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--pri-important)", fontFamily: "var(--font-mono)" }}>{a.stale} stale</span>}
                <button className="card-menu" style={a.stale > 0 ? {} : { marginLeft: "auto" }} onClick={(e) => { e.stopPropagation(); setConfirmArchive(a); }} title="Archive…"><Icon name="moreH" size={13} /></button>
              </div>
              <div className="outcome" style={{ fontStyle: "italic", color: "var(--ink-3)" }}>“{a.standard}”</div>
              <div className="meta">
                <span><strong>{a.open}</strong> open</span>
                <span><strong>{a.recurring}</strong> recurring</span>
                {a.people.length > 0 && <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                  {a.people.map((id) => <Avatar key={id} person={id} size={18} />)}
                </span>}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "archived" && (
        <>
          <div className="archive-banner">
            <div className="archive-banner-icon"><Icon name="moon" size={14} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Archived areas pause without disappearing.</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.5 }}>
                Recurring tasks stop firing. The area leaves Review and standing dashboards. Past notes, decisions, and completed tasks remain searchable. Restore to resume the cadence.
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
            {NS.ARCHIVED_AREAS.map((a) =>
              <div key={a.id} className="proj-card archived">
                <div className="proj-card-head">
                  <div className="name">{a.name}</div>
                  <span className="archive-tag mono">{a.reason}</span>
                </div>
                <div className="outcome" style={{ fontStyle: "italic", color: "var(--ink-3)" }}>“{a.standard}”</div>
                {a.note && <div style={{ fontSize: 12, color: "var(--ink-3)", borderLeft: "2px solid var(--line)", paddingLeft: 10 }}>{a.note}</div>}
                <div className="meta">
                  <span style={{ color: "var(--ink-4)" }}>archived {a.archivedAt} · by {a.archivedBy}</span>
                  {a.people.length > 0 && <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                    {a.people.map((id) => <Avatar key={id} person={id} size={18} />)}
                  </span>}
                </div>
                <div style={{ display: "flex", gap: 6, paddingTop: 4 }}>
                  <button className="btn"><Icon name="arrowRight" size={12} /> Restore</button>
                  <button className="btn">View</button>
                  <button className="btn" style={{ marginLeft: "auto", color: "var(--ink-4)" }}>Delete forever</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {confirmArchive && <ArchiveConfirm kind="area" item={confirmArchive} onClose={() => setConfirmArchive(null)} />}
    </div>
  );
};

// =================== AREA DETAIL ===================
const AreaDetailScreen = ({ area, onBack, onOpenTask }) => {
  const a = area || NS.AREAS[0];
  const people = a.people.map((id) => NS.PEOPLE.find((p) => p.id === id)).filter(Boolean);
  // Group tasks across the system that match this area's name
  const matchAll = Object.values(NS.TASKS).flat();
  const related = matchAll.filter((t) => t && (t.ctx === a.id.split("-")[0] || (t.project && a.name.toLowerCase().includes(t.ctx))));
  const next = related.filter((t) => t.status === "next").slice(0, 5);
  const waiting = related.filter((t) => t.status === "waiting" || t.status === "delegated").slice(0, 4);
  const recurring = [
    { id: "r1", title: "1:1s with directs", cadence: "Every 2 weeks", next: "Mon 11 May", person: "andy" },
    { id: "r2", title: "Skip-level lunch", cadence: "Monthly", next: "Thu 21 May", person: "cahil" },
    { id: "r3", title: "Pulse check (anonymous)", cadence: "Quarterly", next: "Jul 1", person: null },
  ];
  return (
    <div className="content-inner" style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>
        <span onClick={onBack} style={{ cursor: "pointer" }}>Areas</span>
        <Icon name="chevron" size={11} />
        <span style={{ color: "var(--ink)" }}>{a.name}</span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: "-0.015em" }}>{a.name}</h2>
          <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 8, fontStyle: "italic", maxWidth: "65ch", lineHeight: 1.55 }}>“{a.standard}”</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <span className="badge badge-soft">Standing</span>
            <span className="badge badge-soft">Reviewed weekly</span>
            {a.stale > 0 && <span className="badge badge-soft" style={{ color: "var(--pri-important)" }}>{a.stale} stale</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn"><Icon name="plus" size={12} /> New task</button>
          <button className="btn">Review now</button>
          <button className="btn">Archive…</button>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="kpi"><span className="kpi-label">Open loops</span><span className="kpi-value">{a.open}</span><span className="kpi-meta">{a.stale} stale</span></div>
        <div className="kpi"><span className="kpi-label">Recurring</span><span className="kpi-value">{a.recurring}</span><span className="kpi-meta">on cadence</span></div>
        <div className="kpi"><span className="kpi-label">Last reviewed</span><span className="kpi-value" style={{ fontSize: 16 }}>3d ago</span><span className="kpi-meta good">healthy</span></div>
        <div className="kpi"><span className="kpi-label">Next review</span><span className="kpi-value" style={{ fontSize: 16 }}>Sun</span><span className="kpi-meta">weekly</span></div>
      </div>

      <div className="detail-grid">
        <div>
          <SectionHead title="Open tasks" count={next.length} />
          {next.length === 0 && <div className="empty">No open loops here. Healthy.</div>}
          {next.map((t) => (
            <div key={t.id} className="task" onClick={() => onOpenTask && onOpenTask(t)}>
              <span className={`checkbox priority-${t.priority}`} />
              <div className="task-body">
                <div className="task-title">{t.title}</div>
                <div className="task-meta">
                  <CtxBadge ctx={t.ctx} />
                  {t.project && t.project !== "—" && <><span className="sep">·</span><span className="proj-chip">{t.project}</span></>}
                  {t.dateLabel && <><span className="sep">·</span><span className={`date-chip ${t.date === "today" ? "today" : t.date === "overdue" ? "overdue" : ""}`}>{t.dateLabel}</span></>}
                </div>
              </div>
              <div className="task-right">
                <StatusChip status={t.status} />
                {t.person && <PersonChip id={t.person} />}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 22 }}>
            <SectionHead title="Recurring" count={recurring.length} />
            {recurring.map((r) => (
              <div key={r.id} className="task">
                <span className="checkbox" style={{ borderStyle: "dashed" }} />
                <div className="task-body">
                  <div className="task-title">{r.title}</div>
                  <div className="task-meta"><span>{r.cadence}</span><span className="sep">·</span><span>next {r.next}</span></div>
                </div>
                <div className="task-right">
                  {r.person && <PersonChip id={r.person} />}
                  <span className="badge badge-soft">recurring</span>
                </div>
              </div>
            ))}
          </div>

          {waiting.length > 0 && <div style={{ marginTop: 22 }}>
            <SectionHead title="Waiting / delegated" count={waiting.length} />
            {waiting.map((t) => (
              <div key={t.id} className="task" onClick={() => onOpenTask && onOpenTask(t)}>
                <span className={`checkbox priority-${t.priority}`} />
                <div className="task-body">
                  <div className="task-title">{t.title}</div>
                  <div className="task-meta">{t.waitingFor && <span>waiting on {t.waitingFor}</span>}{t.since && <><span className="sep">·</span><span>{t.since}</span></>}</div>
                </div>
                <div className="task-right"><StatusChip status={t.status} />{t.person && <PersonChip id={t.person} />}</div>
              </div>
            ))}
          </div>}

          <div style={{ marginTop: 22 }}>
            <SectionHead title="Review log" count={4} />
            {[
              { body: <><strong>You</strong> · reviewed area · 3 items archived</>, time: "Sun 4 May" },
              { body: <><strong>You</strong> · added recurring "Skip-level lunch"</>, time: "Wed 30 Apr" },
              { dot: "accent", body: <><span className="ai-chip" style={{ height: 16, padding: "0 6px" }}><Icon name="sparkles" size={9} /> Agent</span> flagged 2 stale tasks for triage</>, time: "Mon 28 Apr" },
              { body: <><strong>You</strong> · updated standard text</>, time: "Apr 21" },
            ].map((e, i) => (
              <div key={i} className="activity-item">
                <span className={`activity-dot ${e.dot || ""}`} />
                <span>{e.body}</span>
                <span className="activity-time">{e.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="card">
            <div style={{ padding: "10px 14px" }}>
              <div className="field-row"><span className="label">Cadence</span><span className="value">Weekly · Sun</span></div>
              <div className="field-row"><span className="label">Owner</span><span className="value" style={{ display: "flex", alignItems: "center", gap: 5 }}><Avatar person="andy" size={16} />Joao</span></div>
              <div className="field-row"><span className="label">Context</span><span className="value"><CtxBadge ctx={a.id.includes("bx") ? "boxfusion" : a.id.includes("praesto") ? "praesto" : a.id === "health" ? "health" : "personal"} /></span></div>
              <div className="field-row"><span className="label">Status</span><span className="value"><span className="status status-next">Active</span></span></div>
              <div className="field-row"><span className="label">Created</span><span className="value mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Jan 12, 2024</span></div>
              <div className="field-row" style={{ borderBottom: 0 }}><span className="label">Tags</span><span className="value" style={{ display: "flex", gap: 4 }}><span className="badge badge-soft">standing</span></span></div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="people" size={12} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>People</span>
              <span className="badge badge-soft" style={{ marginLeft: "auto" }}>{people.length}</span>
            </div>
            <div style={{ padding: "8px 6px" }}>
              {people.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 4, cursor: "pointer" }}>
                  <Avatar person={p} size={22} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.role}</div>
                  </div>
                  <span className="loop-badge"><span className="num">{p.openTasks}</span><span style={{ fontSize: 10 }}>open</span></span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="sparkles" size={12} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Agent suggestions</span>
              <span className="badge badge-soft" style={{ marginLeft: "auto" }}>1</span>
            </div>
            <div style={{ padding: "10px 14px", fontSize: 12.5 }}>
              <div>2 stale tasks haven't moved in 14 days. Triage in Review?</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button className="btn" style={{ height: 24, fontSize: 11 }}>Open Review</button>
                <button className="btn" style={{ height: 24, fontSize: 11, color: "var(--ink-4)" }}>Dismiss</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =================== TASK DETAIL ===================
const TaskDetailScreen = ({ task, onBack }) => {
  const t = task || { title: "Review Cahil's draft self-review and send notes back", description: "Cahil sent his draft Monday. Need to read carefully, leave inline comments, and flag any leveling/title questions before our 1:1 on Thursday. Andy thinks he might be doing more architecture than the title reflects — keep an eye on that thread.", status: "next", priority: "important", ctx: "boxfusion", project: "Appraisals 2026 H1", person: "cahil", dateLabel: "Today", source: "Meeting note · 1:1 Andy" };
  const p = NS.PEOPLE.find((x) => x.id === t.person);

  // Editable state
  const [desc, setDesc] = React.useState(t.description);
  const [status, setStatus] = React.useState(t.status);
  const [priority, setPriority] = React.useState(t.priority);
  const [due, setDue] = React.useState({ y: 2026, m: 4, d: 7 });
  const [project, setProject] = React.useState(t.project);
  const [area, setArea] = React.useState("Boxfusion · People");
  const [ctx, setCtx] = React.useState(t.ctx);
  const [person, setPerson] = React.useState(t.person);
  const [owner, setOwner] = React.useState("andy");
  const [tags, setTags] = React.useState(["appraisal", "leveling"]);
  const [openPicker, setOpenPicker] = React.useState(null);

  // Synthesized longer activity list to demonstrate scroll behavior
  const ACT = [
    { dot: "accent", body: <><strong>You</strong> · created from Andy 1:1 note</>, time: "Mon 10:14" },
    { body: <><strong>You</strong> · set priority to Important</>, time: "Mon 10:14" },
    { body: <><strong>You</strong> · scheduled for Thursday 7 May</>, time: "Tue 09:02" },
    { dot: "accent", body: <><span className="ai-chip" style={{ height: 16, padding: "0 6px" }}><Icon name="sparkles" size={9} /> Agent</span> suggested linking to <em>Appraisals 2026 H1</em></>, time: "Tue 09:03" },
    { body: <><strong>You</strong> · accepted suggestion</>, time: "Tue 09:03" },
    { body: <><strong>You</strong> · added Cahil as related person</>, time: "Wed 16:41" },
    { body: <><strong>You</strong> · added tag <span className="badge badge-soft">leveling</span></>, time: "Wed 16:42" },
    { body: <><strong>You</strong> · changed status from Inbox to Next</>, time: "Wed 16:43" },
    { dot: "accent", body: <><span className="ai-chip" style={{ height: 16, padding: "0 6px" }}><Icon name="sparkles" size={9} /> Agent</span> linked email <em>"Cahil draft self-review"</em> as evidence</>, time: "Wed 17:02" },
    { body: <><strong>You</strong> · edited description</>, time: "Thu 08:11" },
    { body: <><strong>You</strong> · pinned to Today</>, time: "Thu 08:12" },
  ];

  const Trigger = ({ id, children, picker, w = 340 }) => (
    <div className={`field-row editable ${openPicker === id ? "open" : ""}`}
      onClick={() => setOpenPicker(openPicker === id ? null : id)}
      style={{ position: "relative" }}>
      {children}
      <span className="edit-affordance">click ▾</span>
      {openPicker === id && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 50, width: w }}>
          {picker}
        </div>
      )}
    </div>
  );

  const closeAfter = (fn) => (v) => { fn(v); setOpenPicker(null); };

  const fmtDate = (d) => d ? `${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(d.y, d.m, d.d).getDay()]} ${d.d} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.m]}` : "—";

  return (
    <div className="content-inner" style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>
        <span onClick={onBack} style={{ cursor: "pointer" }}>Today</span>
        <Icon name="chevron" size={11} />
        <span style={{ color: "var(--ink)" }}>Task</span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 6 }}>
        <span className={`checkbox priority-${priority}`} style={{ width: 18, height: 18, marginTop: 6 }} />
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 500, letterSpacing: "-0.015em", lineHeight: 1.3 }}>{t.title}</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <StatusChip status={status} />
            <CtxBadge ctx={ctx} />
            <span className="proj-chip">{project}</span>
            <span className="ai-chip"><Icon name="sparkles" size={10} /> 2 suggestions</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn">Mark waiting</button>
          <button className="btn btn-primary"><Icon name="check" size={12} /> Complete</button>
        </div>
      </div>

      <div className="detail-grid" style={{ marginTop: 22 }}>
        <div>
          {/* Inline editable description */}
          <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)", marginBottom: 6, fontWeight: 500 }}>Description</div>
          <Pickers.InlineDescription value={desc} onChange={setDesc} />

          <SectionHead title="Activity" count={ACT.length + " · scroll for more"} />
          <div className="activity-scroll">
            {ACT.map((a, i) =>
              <div key={i} className="activity-item">
                <span className={`activity-dot ${a.dot || ""}`} />
                <span>{a.body}</span>
                <span className="activity-time">{a.time}</span>
              </div>
            )}
          </div>
          <div className="activity-scroll-foot">
            <span>{ACT.length} of 47 events</span>
            <span style={{ color: "var(--ink-5)" }}>·</span>
            <span style={{ cursor: "pointer", color: "var(--ink-3)" }}>View all</span>
          </div>

          <div style={{ marginTop: 18 }}>
            <SectionHead title="Comments" count={2} />
            <div style={{ background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 4 }}>
                <strong style={{ fontSize: 12.5 }}>Joao</strong>
                <span style={{ color: "var(--ink-4)", fontSize: 11, fontFamily: "var(--font-mono)" }}>Tue 09:05</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Andy mentioned title question — flag before 1:1.</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 10, border: "1px dashed var(--line)", borderRadius: 8, color: "var(--ink-3)", fontSize: 12.5 }}>
              <span>Add a comment or paste a link…</span>
              <span className="kbd" style={{ marginLeft: "auto" }}>⌘⏎</span>
            </div>
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <div className="card">
            <div style={{ padding: "10px 14px" }}>
              <Trigger id="status" picker={<div className="popover" style={{ position: "static", width: "100%" }}><Pickers.StatusPicker value={status} onPick={closeAfter((s) => setStatus(s.id))} /></div>}>
                <span className="label">Status</span>
                <span className="value"><StatusChip status={status} /></span>
              </Trigger>
              <Trigger id="priority" picker={<div className="popover" style={{ position: "static", width: "100%" }}><Pickers.PriorityPicker value={priority} onPick={closeAfter((p) => setPriority(p.id))} /></div>}>
                <span className="label">Priority</span>
                <span className="value"><PriorityDot pri={priority} /> {PRI_LABEL[priority]}</span>
              </Trigger>
              <Trigger id="due" picker={<div className="popover" style={{ position: "static", width: "100%" }}><Pickers.DatePicker label="Due" value={due} onPick={closeAfter(setDue)} /></div>}>
                <span className="label">Due</span>
                <span className="value"><span className="date-chip today">{fmtDate(due)}</span></span>
              </Trigger>
              <Trigger id="scheduled" picker={<div className="popover" style={{ position: "static", width: "100%" }}><Pickers.DatePicker label="Scheduled" value={due} onPick={closeAfter(() => {})} /></div>}>
                <span className="label">Scheduled</span>
                <span className="value"><span className="date-chip">Thu 7 May · AM</span></span>
              </Trigger>
              <Trigger id="review" picker={<div className="popover" style={{ position: "static", width: "100%" }}><Pickers.DatePicker label="Review" value={null} onPick={closeAfter(() => {})} /></div>}>
                <span className="label">Review</span>
                <span className="value"><span className="date-chip">—</span></span>
              </Trigger>
              <Trigger id="project" picker={<div className="popover" style={{ position: "static", width: "100%" }}><Pickers.ProjectPicker value={project} onPick={closeAfter((p) => setProject(p.name))} /></div>}>
                <span className="label">Project</span>
                <span className="value"><span className="proj-chip">{project}</span></span>
              </Trigger>
              <Trigger id="area" picker={<div className="popover" style={{ position: "static", width: "100%" }}><Pickers.AreaPicker value={area} onPick={closeAfter((a) => setArea(a.name))} /></div>}>
                <span className="label">Area</span>
                <span className="value" style={{ fontSize: 12 }}>{area}</span>
              </Trigger>
              <Trigger id="ctx" picker={<div className="popover" style={{ position: "static", width: "100%" }}><Pickers.ContextPicker value={ctx} onPick={closeAfter((c) => setCtx(c.id))} /></div>}>
                <span className="label">Context</span>
                <span className="value"><CtxBadge ctx={ctx} /></span>
              </Trigger>
              <Trigger id="person" picker={<div className="popover" style={{ position: "static", width: "100%" }}><Pickers.PersonPicker value={person} onPick={closeAfter((p) => setPerson(p.id))} /></div>}>
                <span className="label">Person</span>
                <span className="value">{person && <PersonChip id={person} />}</span>
              </Trigger>
              <Trigger id="owner" picker={<div className="popover" style={{ position: "static", width: "100%" }}><Pickers.PersonPicker value={owner} onPick={closeAfter((p) => setOwner(p.id))} /></div>}>
                <span className="label">Owner</span>
                <span className="value" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {owner ? <><Avatar person={owner} size={16} />{(NS.PEOPLE.find((x) => x.id === owner) || {}).name || "Joao"}</> : <span style={{ color: "var(--ink-4)", fontSize: 11.5 }}>Unassigned</span>}
                </span>
              </Trigger>
              <div className="field-row">
                <span className="label">Source</span>
                <span className="value" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{t.source}</span>
              </div>
              <Trigger id="tags" picker={<div className="popover" style={{ position: "static", width: "100%" }}><Pickers.TagsPicker value={tags} onPick={setTags} /></div>}>
                <span className="label">Tags</span>
                <span className="value" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {tags.length === 0 && <span style={{ color: "var(--ink-4)", fontSize: 11.5 }}>none</span>}
                  {tags.map((t) => <span key={t} className="badge badge-soft">{t}</span>)}
                </span>
              </Trigger>
            </div>
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--line-soft)" }}>
              <Icon name="sparkles" size={12} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Agent suggestions</span>
              <span className="badge badge-soft" style={{ marginLeft: "auto" }}>2</span>
            </div>
            <div style={{ padding: "10px 14px", fontSize: 12.5, borderBottom: "1px solid var(--line-soft)" }}>
              <div>Set review date to Thu 14 May (next 1:1)?</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button className="btn" style={{ height: 24, fontSize: 11 }}>Accept</button>
                <button className="btn" style={{ height: 24, fontSize: 11 }}>Edit</button>
                <button className="btn" style={{ height: 24, fontSize: 11, color: "var(--ink-4)" }}>Dismiss</button>
              </div>
            </div>
            <div style={{ padding: "10px 14px", fontSize: 12.5 }}>
              <div>Tag with <span className="badge badge-soft">leveling</span>? 2 related tasks.</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button className="btn" style={{ height: 24, fontSize: 11 }}>Accept</button>
                <button className="btn" style={{ height: 24, fontSize: 11, color: "var(--ink-4)" }}>Dismiss</button>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--line-soft)" }}>
              <Icon name="link" size={12} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Evidence</span>
            </div>
            <div style={{ padding: "10px 14px", fontSize: 12, color: "var(--ink-2)" }}>
              <div style={{ marginBottom: 4 }}>📎 Obsidian / 1-1s / Andy / 2026-05-05.md</div>
              <div>📎 Email · Cahil draft · 5 May</div>
            </div>
          </div>
        </div>
      </div>
    </div>);

};

// =================== REVIEW ===================
const ReviewScreen = () => {
  return (
    <div className="content-inner" style={{ maxWidth: 920 }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>Review</h2>
        <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4 }}>Keep the system trustworthy. Calm, not punitive.</div>
      </div>

      <div className="filterbar">
        <span className="filter-chip active">Daily · today</span>
        <span className="filter-chip">Weekly · due Sun</span>
        <span className="filter-chip">Custom range</span>
      </div>

      <div className="review-card">
        <div className="review-title"><Icon name="clock" size={14} /> Stale waiting items</div>
        <div className="review-sub">2 items haven't moved in over a week. Decide: nudge, drop, or own it.</div>
        {NS.TASKS.waiting.filter((w) => w.review === "stale").map((w) =>
        <div className="task" key={w.title}>
            <span className="checkbox" />
            <div className="task-body">
              <div className="task-title">{w.title}</div>
              <div className="task-meta"><span>waiting on {w.waitingFor}</span><span className="sep">·</span><span>{w.since}</span><span className="sep">·</span><span>source: {w.source}</span></div>
            </div>
            <div className="task-right">
              <button className="btn" style={{ height: 22, padding: "0 8px", fontSize: 11 }}>Nudge</button>
              <button className="btn" style={{ height: 22, padding: "0 8px", fontSize: 11 }}>Take over</button>
              <button className="btn" style={{ height: 22, padding: "0 8px", fontSize: 11, color: "var(--ink-4)" }}>Drop</button>
            </div>
          </div>
        )}
      </div>

      <div className="review-card">
        <div className="review-title"><Icon name="projects" size={14} /> Projects without a next action</div>
        <div className="review-sub">A project with no next action is a project on pause. Add one or archive it.</div>
        {[NS.PROJECTS[4]].map((p) =>
        <div className="task" key={p.id}>
            <span className="checkbox" />
            <div className="task-body">
              <div className="task-title">{p.name}</div>
              <div className="task-meta"><CtxBadge ctx={p.ctx} /><span className="sep">·</span><span>idle 14d</span><span className="sep">·</span><span>{p.overdue} overdue</span></div>
            </div>
            <div className="task-right">
              <button className="btn" style={{ height: 22, padding: "0 8px", fontSize: 11 }}>Add next action</button>
              <button className="btn" style={{ height: 22, padding: "0 8px", fontSize: 11, color: "var(--ink-4)" }}>Pause</button>
            </div>
          </div>
        )}
      </div>

      <div className="review-card">
        <div className="review-title"><Icon name="people" size={14} /> People with open loops</div>
        <div className="review-sub">3 people have things that need a next move from you.</div>
        {NS.PEOPLE.slice(0, 3).map((p) =>
        <div className="person-row" key={p.id} style={{ gridTemplateColumns: "28px 1fr auto auto", borderBottom: "1px solid var(--line-soft)" }}>
            <Avatar person={p} size={28} />
            <div><div className="name">{p.name}</div><div className="ctx-meta">{p.openTasks} open · {p.waiting} waiting · last spoke {p.lastSeen}</div></div>
            <span className="date-chip">Next {p.nextMeeting}</span>
            <button className="btn" style={{ height: 24, fontSize: 11 }}>Open</button>
          </div>
        )}
      </div>

      <div className="review-card">
        <div className="review-title"><Icon name="areas" size={14} /> Areas needing review</div>
        <div className="review-sub">Standing responsibilities you haven't checked in on.</div>
        {NS.AREAS.filter((a) => a.stale > 0).map((a) =>
        <div className="task" key={a.id}>
            <span className="checkbox" />
            <div className="task-body">
              <div className="task-title">{a.name}</div>
              <div className="task-meta"><span>{a.stale} stale</span><span className="sep">·</span><span>{a.open} open loops</span></div>
            </div>
            <div className="task-right">
              <button className="btn" style={{ height: 22, padding: "0 8px", fontSize: 11 }}>Review now</button>
            </div>
          </div>
        )}
      </div>
    </div>);

};

// =================== QUICK CAPTURE ===================
const TIMELINE_OPTS = [
{ id: "today", label: "Today", hint: "Thu 7 May" },
{ id: "tomorrow", label: "Tomorrow", hint: "Fri 8 May" },
{ id: "thisweek", label: "This week", hint: "by Sun 10 May" },
{ id: "nextweek", label: "Next week", hint: "Mon 11 May" },
{ id: "twoweeks", label: "In 2 weeks", hint: "Thu 21 May" },
{ id: "nextmonth", label: "Next month", hint: "Jun" },
{ id: "someday", label: "Someday", hint: "no date" }];


const SLASH_KINDS = [
{ id: "person", label: "Person", hint: "Tag a person", color: "#b8714a" },
{ id: "area", label: "Area", hint: "Standing responsibility", color: "#5a7a4a" },
{ id: "project", label: "Project", hint: "Active outcome", color: "#4a6b8a" },
{ id: "timeline", label: "Timeline", hint: "When to do this", color: "#a8843a" }];


const QuickCapture = ({ onClose }) => {
  const [text, setText] = React.useState("");
  const [chips, setChips] = React.useState([]); // {kind, id, label}
  const [menu, setMenu] = React.useState(null); // null | {stage:'kind'|'value', kind, query, slashAt}
  const [activeIdx, setActiveIdx] = React.useState(0);
  const inputRef = React.useRef();

  React.useEffect(() => {inputRef.current && inputRef.current.focus();}, []);

  // Compute current options based on menu state
  const options = React.useMemo(() => {
    if (!menu) return [];
    const q = (menu.query || "").toLowerCase();
    if (menu.stage === "kind") {
      const kinds = SLASH_KINDS.filter((k) => !q || k.label.toLowerCase().includes(q) || k.id.startsWith(q))
        .map((k) => ({ ...k, _row: "kind" }));
      if (!q) return kinds;
      // Cross-record search: also match people/projects/areas/timelines by name
      const people = NS.PEOPLE.filter((p) => p.name.toLowerCase().includes(q))
        .map((p) => ({ _row: "record", kind: "person", id: p.id, label: p.name, sub: p.role, color: p.color, initials: p.initials }));
      const projects = NS.PROJECTS.filter((p) => p.name.toLowerCase().includes(q))
        .map((p) => ({ _row: "record", kind: "project", id: p.id, label: p.name, sub: p.outcome, ctx: p.ctx }));
      const areas = NS.AREAS.filter((a) => a.name.toLowerCase().includes(q))
        .map((a) => ({ _row: "record", kind: "area", id: a.id, label: a.name, sub: a.standard }));
      const timelines = TIMELINE_OPTS.filter((t) => t.label.toLowerCase().includes(q) || t.id.startsWith(q))
        .map((t) => ({ _row: "record", kind: "timeline", id: t.id, label: t.label, sub: t.hint }));
      return [...kinds, ...people, ...projects, ...areas, ...timelines];
    }
    if (menu.kind === "person") return NS.PEOPLE.filter((p) => !q || p.name.toLowerCase().includes(q)).map((p) => ({ id: p.id, label: p.name, sub: p.role, color: p.color, initials: p.initials }));
    if (menu.kind === "area") return NS.AREAS.filter((a) => !q || a.name.toLowerCase().includes(q)).map((a) => ({ id: a.id, label: a.name, sub: a.standard }));
    if (menu.kind === "project") return NS.PROJECTS.filter((p) => !q || p.name.toLowerCase().includes(q)).map((p) => ({ id: p.id, label: p.name, sub: p.outcome, ctx: p.ctx }));
    if (menu.kind === "timeline") return TIMELINE_OPTS.filter((t) => !q || t.label.toLowerCase().includes(q) || t.id.startsWith(q));
    return [];
  }, [menu]);

  React.useEffect(() => {setActiveIdx(0);}, [menu && menu.stage, menu && menu.kind, menu && menu.query]);

  const onChange = (e) => {
    const value = e.target.value;
    const caret = e.target.selectionStart;
    setText(value);

    // Find the most recent "/" before caret with no space after
    const upToCaret = value.slice(0, caret);
    const slashAt = upToCaret.lastIndexOf("/");
    if (slashAt >= 0) {
      const after = upToCaret.slice(slashAt + 1);
      // only open if no whitespace after slash (still typing the token)
      if (!/\s/.test(after)) {
        // Are we typing a kind, or is there already a known kind followed by a colon?
        const kindMatch = after.match(/^(person|area|project|timeline):(.*)$/i);
        if (kindMatch) {
          setMenu({ stage: "value", kind: kindMatch[1].toLowerCase(), query: kindMatch[2], slashAt });
        } else {
          setMenu({ stage: "kind", query: after, slashAt });
        }
        return;
      }
    }
    setMenu(null);
  };

  const replaceTokenWith = (replacement) => {
    if (!menu) return;
    const before = text.slice(0, menu.slashAt);
    // find end of token (next whitespace or end of string)
    const rest = text.slice(menu.slashAt);
    const tokenEnd = rest.search(/\s/);
    const after = tokenEnd === -1 ? "" : rest.slice(tokenEnd);
    const newText = (before + (replacement || "") + after).replace(/\s{2,}/g, " ");
    setText(newText);
    // restore caret roughly at end of replacement
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const pos = (before + (replacement || "")).length;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(pos, pos);
      }
    });
    setMenu(null);
  };

  const pickOption = (opt) => {
    if (!menu || !opt) return;
    if (menu.stage === "kind" && opt._row !== "record") {
      // Move into value stage by rewriting token to `/<kind>:<query>`
      const before = text.slice(0, menu.slashAt);
      const rest = text.slice(menu.slashAt);
      const tokenEnd = rest.search(/\s/);
      const after = tokenEnd === -1 ? "" : rest.slice(tokenEnd);
      const newText = before + "/" + opt.id + ":" + after;
      setText(newText);
      requestAnimationFrame(() => {
        if (inputRef.current) {
          const pos = (before + "/" + opt.id + ":").length;
          inputRef.current.focus();
          inputRef.current.setSelectionRange(pos, pos);
        }
      });
      setMenu({ stage: "value", kind: opt.id, query: "", slashAt: menu.slashAt });
      return;
    }
    // value stage OR direct record pick from merged kind menu: add chip + remove the slash token
    const kind = opt._row === "record" ? opt.kind : menu.kind;
    setChips((cs) => {
      const filtered = cs.filter((c) => c.kind !== kind);
      return [...filtered, { kind, id: opt.id, label: opt.label, color: opt.color, initials: opt.initials, ctx: opt.ctx, hint: opt.hint || opt.sub }];
    });
    replaceTokenWith("");
  };

  const removeChip = (kind) => setChips((cs) => cs.filter((c) => c.kind !== kind));

  const onKeyDown = (e) => {
    if (menu && options.length) {
      if (e.key === "ArrowDown") {e.preventDefault();setActiveIdx((i) => (i + 1) % options.length);return;}
      if (e.key === "ArrowUp") {e.preventDefault();setActiveIdx((i) => (i - 1 + options.length) % options.length);return;}
      if (e.key === "Tab" || e.key === "Enter") {e.preventDefault();pickOption(options[activeIdx]);return;}
      if (e.key === "Escape") {e.preventDefault();setMenu(null);return;}
    } else {
      if (e.key === "Escape") {e.preventDefault();onClose && onClose();return;}
      if (e.key === "Enter") {e.preventDefault();onClose && onClose();return;} // save → inbox
    }
  };

  const chipFor = (c) => {
    const KIND_META = {
      person: { dot: "#b8714a", prefix: "@" },
      area: { dot: "#5a7a4a", prefix: "#" },
      project: { dot: "#4a6b8a", prefix: "▸" },
      timeline: { dot: "#a8843a", prefix: "⏱" }
    };
    const meta = KIND_META[c.kind];
    return (
      <span key={c.kind} className="qc-chip">
        {c.kind === "person" && c.initials ?
        <span className="qc-chip-avatar" style={{ background: c.color }}>{c.initials}</span> :

        <span className="qc-chip-dot" style={{ background: meta.dot }} />
        }
        <span className="qc-chip-prefix">{meta.prefix}</span>
        <span>{c.label}</span>
        {c.hint && <span className="qc-chip-hint">{c.hint}</span>}
        <button className="qc-chip-x" onClick={() => removeChip(c.kind)} title="Remove">×</button>
      </span>);

  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="qc-modal" onClick={(e) => e.stopPropagation()}>
        {chips.length > 0 &&
        <div className="qc-chip-row">
            {chips.map(chipFor)}
          </div>
        }
        <input
          ref={inputRef}
          className="qc-input"
          value={text}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Capture anything. Type / to attach a person, area, project or timeline." />
        

        {menu &&
        <div className="qc-menu">
            <div className="qc-menu-head">
              {menu.stage === "kind" ? "Attach…" : <>
                <span style={{ color: "var(--ink)" }}>{SLASH_KINDS.find((k) => k.id === menu.kind)?.label}</span>
                <span style={{ color: "var(--ink-4)" }}> · pick one</span>
              </>}
              <span className="qc-menu-hint mono">↑↓ navigate · ⏎ select · esc cancel</span>
            </div>
            <div className="qc-menu-list">
              {options.length === 0 && <div className="qc-menu-empty">No matches</div>}
              {options.map((opt, i) =>
            <div
              key={(opt._row === "record" ? opt.kind + ":" : "") + opt.id}
              className={`qc-menu-item ${menu.stage === "kind" && opt._row !== "record" ? "kind" : ""} ${opt._row === "record" ? "record" : ""} ${opt._row === "record" && opt.kind === "timeline" ? "timeline" : ""} ${i === activeIdx ? "active" : ""}`}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => {e.preventDefault();pickOption(opt);}}>
              
                  {menu.stage === "kind" && opt._row !== "record" ?
              <>
                      <span className="qc-menu-glyph mono">/{opt.id}</span>
                      <span className="qc-menu-label">{opt.label}</span>
                      <span className="qc-menu-sub">{opt.hint}</span>
                    </> :
              (opt._row === "record" ? opt.kind : menu.kind) === "person" ?
              <>
                      {opt._row === "record" && <span className="qc-menu-glyph mono">/person</span>}
                      <span className="qc-menu-avatar" style={{ background: opt.color }}>{opt.initials}</span>
                      <span className="qc-menu-label">{opt.label}</span>
                      <span className="qc-menu-sub">{opt.sub}</span>
                    </> :
              (opt._row === "record" ? opt.kind : menu.kind) === "timeline" ?
              <>
                      {opt._row === "record" && <span className="qc-menu-glyph mono">/timeline</span>}
                      <span className="qc-menu-label">{opt.label}</span>
                      <span className="qc-menu-sub mono">{opt.sub || opt.hint}</span>
                    </> :

              <>
                      {opt._row === "record" && <span className="qc-menu-glyph mono">/{opt.kind}</span>}
                      <span className={`qc-menu-bullet ${opt.ctx ? `ctx-${opt.ctx}` : ""}`} />
                      <span className="qc-menu-label">{opt.label}</span>
                      <span className="qc-menu-sub">{opt.sub}</span>
                    </>
              }
                </div>
            )}
            </div>
          </div>
        }

        <div className="qc-foot">
          <span><span className="kbd">/</span> attach</span>
          <span><span className="kbd">⏎</span> save to inbox</span>
          <span><span className="kbd">esc</span> cancel</span>
          <span className="right">
            <span className="qc-foot-summary">
              {chips.length === 0 ? "Will land in Inbox" : `${chips.length} attachment${chips.length > 1 ? "s" : ""} · saving to Inbox`}
            </span>
            <button className="btn btn-primary" style={{ height: 26 }} onClick={onClose}>Save</button>
          </span>
        </div>
      </div>
    </div>);

};

Object.assign(window, { TodayScreen, InboxScreen, UpcomingScreen, WaitingScreen, PeopleScreen, ProjectsScreen, AreasScreen, AreaDetailScreen, TaskDetailScreen, ReviewScreen, QuickCapture });