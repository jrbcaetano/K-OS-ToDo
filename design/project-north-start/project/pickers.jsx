// North Star — pickers & inline edit components

const Popover = ({ open, onClose, children, width = 260 }) => {
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!e.target.closest(".popover") && !e.target.closest(".field-row")) onClose && onClose();
    };
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="popover" style={{ width }} onMouseDown={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
};

const PopHead = ({ children, hint }) => (
  <div className="pop-head">
    <span>{children}</span>
    {hint && <span className="pop-hint mono">{hint}</span>}
  </div>
);

const PopRow = ({ active, onClick, children, sub, glyph, kbd }) => (
  <div className={`pop-row ${active ? "active" : ""}`} onClick={onClick}>
    {glyph && <span className="pop-glyph">{glyph}</span>}
    <span className="pop-stack">
      <span className="pop-label">{children}</span>
      {sub && <span className="pop-sub">{sub}</span>}
    </span>
    {kbd && <span className="kbd">{kbd}</span>}
  </div>
);

const PopSearch = ({ value, onChange, placeholder }) => (
  <div className="pop-search">
    <input autoFocus value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

// --- Status ---
const STATUSES = [
  { id: "next", label: "Next", hint: "Actionable now" },
  { id: "scheduled", label: "Scheduled", hint: "Has a date" },
  { id: "waiting", label: "Waiting", hint: "Blocked by someone" },
  { id: "delegated", label: "Delegated", hint: "Owned by someone else" },
  { id: "blocked", label: "Blocked", hint: "Stuck on a thing" },
  { id: "someday", label: "Someday", hint: "Maybe / later" },
  { id: "done", label: "Done" },
];

const StatusPicker = ({ value, onPick }) => (
  <>
    <PopHead hint="↑↓ ⏎">Status</PopHead>
    <div className="pop-list">
      {STATUSES.map((s) => (
        <PopRow key={s.id} active={s.id === value} onClick={() => onPick(s)}
          glyph={<span className={`status-square status-${s.id}`} />} sub={s.hint}>
          {s.label}
        </PopRow>
      ))}
    </div>
  </>
);

// --- Priority ---
const PRIORITIES = [
  { id: "critical", label: "Critical", hint: "Today, no negotiation" },
  { id: "important", label: "Important", hint: "This week" },
  { id: "routine", label: "Routine", hint: "Default" },
  { id: "low", label: "Low", hint: "Whenever" },
];

const PriorityPicker = ({ value, onPick }) => (
  <>
    <PopHead hint="1–4">Priority</PopHead>
    <div className="pop-list">
      {PRIORITIES.map((p, i) => (
        <PopRow key={p.id} active={p.id === value} onClick={() => onPick(p)}
          glyph={<span className={`pri-dot pri-${p.id}`} style={{ width: 4, height: 14, background: p.id === "critical" ? "var(--pri-critical)" : p.id === "important" ? "var(--pri-important)" : p.id === "routine" ? "var(--ink-4)" : "var(--ink-5)" }} />}
          sub={p.hint} kbd={String(i + 1)}>
          {p.label}
        </PopRow>
      ))}
    </div>
  </>
);

// --- Context ---
const CONTEXTS = [
  { id: "boxfusion", label: "Boxfusion", hint: "Day job · CIO" },
  { id: "praesto", label: "Praesto", hint: "Side venture" },
  { id: "personal", label: "Personal", hint: "You" },
  { id: "family", label: "Family", hint: "Telma · Catarina" },
  { id: "health", label: "Health", hint: "Body & mind" },
  { id: "home", label: "Home / Casa", hint: "House logistics" },
];

const ContextPicker = ({ value, onPick }) => (
  <>
    <PopHead hint="filter">Context</PopHead>
    <div className="pop-list">
      {CONTEXTS.map((c) => (
        <PopRow key={c.id} active={c.id === value} onClick={() => onPick(c)}
          glyph={<span className={`ctx-dot ctx-${c.id}`} />} sub={c.hint}>
          {c.label}
        </PopRow>
      ))}
    </div>
  </>
);

// --- Project ---
const ProjectPicker = ({ value, onPick }) => {
  const [q, setQ] = React.useState("");
  const items = NS.PROJECTS.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PopHead hint="search">Project</PopHead>
      <PopSearch value={q} onChange={setQ} placeholder="Search projects…" />
      <div className="pop-list">
        <PopRow onClick={() => onPick({ id: null, name: "—" })} sub="Unset" glyph={<span className="pop-x">×</span>}>None</PopRow>
        {items.map((p) => (
          <PopRow key={p.id} active={p.name === value} onClick={() => onPick(p)}
            glyph={<span className={`ctx-dot ctx-${p.ctx}`} />} sub={p.outcome}>
            {p.name}
          </PopRow>
        ))}
        <div className="pop-foot"><span>+ New project</span><span className="kbd">⌘N</span></div>
      </div>
    </>
  );
};

// --- Area ---
const AreaPicker = ({ value, onPick }) => {
  const [q, setQ] = React.useState("");
  const items = NS.AREAS.filter((a) => !q || a.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PopHead hint="search">Area</PopHead>
      <PopSearch value={q} onChange={setQ} placeholder="Search areas…" />
      <div className="pop-list">
        <PopRow onClick={() => onPick({ id: null, name: "—" })} sub="Unset" glyph={<span className="pop-x">×</span>}>None</PopRow>
        {items.map((a) => (
          <PopRow key={a.id} active={a.name === value} onClick={() => onPick(a)}
            glyph={<span className="pop-glyph-area">▤</span>} sub={a.standard}>
            {a.name}
          </PopRow>
        ))}
      </div>
    </>
  );
};

// --- Person ---
const PersonPicker = ({ value, onPick }) => {
  const [q, setQ] = React.useState("");
  const items = NS.PEOPLE.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PopHead hint="search">Person</PopHead>
      <PopSearch value={q} onChange={setQ} placeholder="Search people…" />
      <div className="pop-list">
        <PopRow onClick={() => onPick({ id: null, name: "—" })} sub="Unset" glyph={<span className="pop-x">×</span>}>None</PopRow>
        {items.map((p) => (
          <PopRow key={p.id} active={p.id === value} onClick={() => onPick(p)}
            glyph={<span className="pop-avatar" style={{ background: p.color }}>{p.initials}</span>}
            sub={p.role}>
            {p.name}
          </PopRow>
        ))}
        <div className="pop-foot"><span>+ Add person</span><span className="kbd">⌘N</span></div>
      </div>
    </>
  );
};

// --- Date ---
const DatePicker = ({ value, onPick, label = "Due" }) => {
  const [view, setView] = React.useState({ y: 2026, m: 4 }); // May 2026 (0-indexed)
  const today = { y: 2026, m: 4, d: 7 };
  const monthName = new Date(view.y, view.m, 1).toLocaleString("en-US", { month: "long" });
  const firstDay = new Date(view.y, view.m, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  const isToday = (d) => view.y === today.y && view.m === today.m && d === today.d;
  const isSelected = (d) => value && value.y === view.y && value.m === view.m && d === value.d;
  return (
    <>
      <PopHead hint="↹ presets">{label}</PopHead>
      <div className="pop-quicks">
        {[
          ["Today", { y: 2026, m: 4, d: 7 }],
          ["Tomorrow", { y: 2026, m: 4, d: 8 }],
          ["This Sun", { y: 2026, m: 4, d: 10 }],
          ["Next week", { y: 2026, m: 4, d: 11 }],
          ["In 2 weeks", { y: 2026, m: 4, d: 21 }],
          ["No date", null],
        ].map(([k, v]) => (
          <button key={k} className="pop-quick" onClick={() => onPick(v)}>{k}</button>
        ))}
      </div>
      <div className="pop-cal">
        <div className="pop-cal-head">
          <button className="pop-cal-nav" onClick={() => setView((v) => ({ y: v.m === 0 ? v.y - 1 : v.y, m: (v.m + 11) % 12 }))}>‹</button>
          <span className="mono">{monthName} {view.y}</span>
          <button className="pop-cal-nav" onClick={() => setView((v) => ({ y: v.m === 11 ? v.y + 1 : v.y, m: (v.m + 1) % 12 }))}>›</button>
        </div>
        <div className="pop-cal-grid pop-cal-dow">
          {["S","M","T","W","T","F","S"].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="pop-cal-grid">
          {cells.map((d, i) => (
            d === null
              ? <span key={i} />
              : <button key={i}
                  className={`pop-cal-day ${isToday(d) ? "today" : ""} ${isSelected(d) ? "selected" : ""}`}
                  onClick={() => onPick({ y: view.y, m: view.m, d })}>
                  {d}
                </button>
          ))}
        </div>
      </div>
      <div className="pop-foot"><span>Add time</span><span style={{ marginLeft: "auto", color: "var(--ink-3)" }}>or type "next tue 3pm"</span></div>
    </>
  );
};

// --- Tags ---
const EXISTING_TAGS = ["appraisal", "leveling", "1on1", "review", "deep-work", "decision", "blocker", "client"];
const TagsPicker = ({ value = [], onPick }) => {
  const [q, setQ] = React.useState("");
  const items = EXISTING_TAGS.filter((t) => !q || t.toLowerCase().includes(q.toLowerCase()));
  const toggle = (t) => onPick(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  return (
    <>
      <PopHead hint="multi · ⏎ to add">Tags</PopHead>
      <PopSearch value={q} onChange={setQ} placeholder="Find or create tag…" />
      <div className="pop-list">
        {items.map((t) => (
          <div key={t} className={`pop-row ${value.includes(t) ? "checked" : ""}`} onClick={() => toggle(t)}>
            <span className={`pop-check ${value.includes(t) ? "on" : ""}`} />
            <span className="pop-label"><span className="badge badge-soft">{t}</span></span>
          </div>
        ))}
        {q && !EXISTING_TAGS.includes(q) &&
          <div className="pop-row" onClick={() => { onPick([...value, q]); setQ(""); }}>
            <span className="pop-glyph">+</span>
            <span className="pop-label">Create "<strong>{q}</strong>"</span>
          </div>
        }
      </div>
    </>
  );
};

// --- Inline editable description ---
const InlineDescription = ({ value, onChange }) => {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const ref = React.useRef();
  React.useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.setSelectionRange(draft.length, draft.length); } }, [editing]);
  if (editing) {
    return (
      <div className="desc-edit">
        <textarea
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { onChange && onChange(draft); setEditing(false); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setDraft(value); setEditing(false); }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { onChange && onChange(draft); setEditing(false); }
          }}
          placeholder="Add a description, paste a link, dump context…"
        />
        <div className="desc-edit-foot">
          <span className="hint"><span className="kbd">⌘⏎</span> save · <span className="kbd">esc</span> cancel · markdown supported</span>
        </div>
      </div>
    );
  }
  return (
    <div className={`desc-display ${!value ? "empty" : ""}`} onClick={() => setEditing(true)}>
      {value || <span className="desc-placeholder">Add a description, paste a link, dump context…</span>}
      <span className="desc-edit-affordance mono">click to edit</span>
    </div>
  );
};

window.Pickers = { Popover, StatusPicker, PriorityPicker, ContextPicker, ProjectPicker, AreaPicker, PersonPicker, DatePicker, TagsPicker, InlineDescription, STATUSES, PRIORITIES, CONTEXTS };
