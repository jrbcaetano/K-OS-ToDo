// Primitives: badges, chips, icons, task row

const Icon = ({ name, size = 14 }) => {
  const paths = {
    inbox: "M3 13h4l1 2h8l1-2h4M3 13l3-8h12l3 8M3 13v6h18v-6",
    today: "M3 5h18v16H3zM3 9h18M8 3v4M16 3v4",
    upcoming: "M3 5h18v16H3zM3 9h18M8 3v4M16 3v4M9 13l2 2 4-4",
    waiting: "M12 6v6l4 2M12 22a10 10 0 100-20 10 10 0 000 20z",
    projects: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
    areas: "M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1zM4 9h16",
    people: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM3 21a9 9 0 0118 0",
    review: "M9 11l3 3 8-8M21 12a9 9 0 11-9-9c1 0 2 .2 3 .5",
    search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
    plus: "M12 5v14M5 12h14",
    settings: "M12 8a4 4 0 100 8 4 4 0 000-8zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
    bell: "M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9zM10 21a2 2 0 004 0",
    chevron: "M9 6l6 6-6 6",
    chevronDown: "M6 9l6 6 6-6",
    sparkles: "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM19 16l.7 2 2 .7-2 .7L19 22l-.7-2.6-2-.7 2-.7z",
    arrowRight: "M5 12h14M13 6l6 6-6 6",
    moreH: "M5 12h.01M12 12h.01M19 12h.01",
    flag: "M4 21V4M4 4h13l-2 4 2 4H4",
    clock: "M12 6v6l4 2M12 22a10 10 0 100-20 10 10 0 000 20z",
    link: "M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1",
    filter: "M3 5h18M6 12h12M10 19h4",
    command: "M9 9h6v6H9zM6 6a3 3 0 100 6h3V9a3 3 0 00-3-3zM18 6a3 3 0 110 6h-3V9a3 3 0 013-3zM6 18a3 3 0 110-6h3v3a3 3 0 01-3 3zM18 18a3 3 0 100-6h-3v3a3 3 0 003 3z",
    snooze: "M4 6h6L4 14h6M14 4h6l-6 8h6",
    check: "M5 12l5 5L20 7",
    x: "M6 6l12 12M6 18L18 6",
    sun: "M12 4v2M12 18v2M4 12H2M22 12h-2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z",
    moon: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z",
    inboxAlt: "M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6L5.5 5z",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name] || paths.inbox} />
    </svg>
  );
};

const PRI_LABEL = { critical: "Critical", important: "Important", routine: "Routine", low: "Low" };
const STATUS_LABEL = { next: "Next", waiting: "Waiting", delegated: "Delegated", blocked: "Blocked", scheduled: "Scheduled", someday: "Someday", done: "Done" };
const CTX_LABEL = { boxfusion: "Boxfusion", praesto: "Praesto", personal: "Personal", family: "Family", health: "Health", home: "Casa" };

const CtxBadge = ({ ctx }) => (
  <span className={`badge ctx ctx-${ctx}`}>{CTX_LABEL[ctx] || ctx}</span>
);

const StatusChip = ({ status }) => (
  <span className={`status status-${status}`}>{STATUS_LABEL[status]}</span>
);

const PriorityDot = ({ pri }) => <span className={`pri-dot pri-${pri}`} title={PRI_LABEL[pri]} />;

const Avatar = ({ person, size = 22 }) => {
  const p = typeof person === "string" ? NS.PEOPLE.find(x => x.id === person) : person;
  if (!p) return null;
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42, background: p.color }}>
      {p.initials}
    </span>
  );
};

const PersonChip = ({ id }) => {
  if (!id) return null;
  const p = NS.PEOPLE.find(x => x.id === id);
  if (!p) return null;
  return (
    <span className="person-chip">
      <Avatar person={p} size={16} />
      {p.name.split(" ")[0]}
    </span>
  );
};

const DateChip = ({ date, label }) => {
  const cls = date === "overdue" ? "overdue" : (date === "today" ? "today" : "");
  return <span className={`date-chip ${cls}`}>{label}</span>;
};

const TaskRow = ({ t, onOpen, onComplete, showProject = true, showStatus = false }) => {
  return (
    <div className="task" onClick={() => onOpen && onOpen(t)}>
      <span
        className={`checkbox priority-${t.priority} ${t.done ? "checked" : ""}`}
        onClick={(e) => { e.stopPropagation(); onComplete && onComplete(t); }}
      />
      <div className="task-body">
        <div className="task-title">{t.title}</div>
        <div className="task-meta">
          {showStatus && t.status && <><StatusChip status={t.status} /><span className="sep">·</span></>}
          {t.ctx && <CtxBadge ctx={t.ctx} />}
          {showProject && t.project && t.project !== "—" && (
            <><span className="sep">·</span><span className="proj-chip">{t.project}</span></>
          )}
          {t.waitingFor && t.since && (
            <><span className="sep">·</span><span>waiting {t.since}</span></>
          )}
        </div>
      </div>
      <div className="task-right">
        {t.person && <PersonChip id={t.person} />}
        {t.dateLabel && <DateChip date={t.date} label={t.dateLabel} />}
        <PriorityDot pri={t.priority} />
        <span className="task-actions">
          <button className="icon-btn" title="Reschedule"><Icon name="clock" size={12} /></button>
          <button className="icon-btn" title="More"><Icon name="moreH" size={12} /></button>
        </span>
      </div>
    </div>
  );
};

const SectionHead = ({ title, count, action, alert }) => (
  <div className="section-head">
    <span className="section-title">{title}</span>
    {count != null && <span className="section-count">{count}</span>}
    {alert && <span className="section-count" style={{ color: "var(--pri-critical)" }}>{alert}</span>}
    {action && <span className="section-action">{action}</span>}
  </div>
);

Object.assign(window, { Icon, Avatar, CtxBadge, StatusChip, PriorityDot, PersonChip, DateChip, TaskRow, SectionHead, PRI_LABEL, STATUS_LABEL, CTX_LABEL });
