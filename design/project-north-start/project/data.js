// North Star — sample data

const PEOPLE = [
  { id: "andy", name: "Andy Mendes", initials: "AM", ctx: "boxfusion", role: "Direct report · Delivery Lead", color: "#b8714a", openTasks: 4, waiting: 2, owesYou: 1, owesThem: 2, lastSeen: "2d ago", nextMeeting: "Tomorrow 14:00" },
  { id: "paola", name: "Paola Ribeiro", initials: "PR", ctx: "boxfusion", role: "People Operations", color: "#8a6a4a", openTasks: 2, waiting: 1, owesYou: 1, owesThem: 0, lastSeen: "today", nextMeeting: "Thu 10:00" },
  { id: "pedro", name: "Pedro Costa", initials: "PC", ctx: "praesto", role: "Praesto · Senior Engineer", color: "#7a8a5a", openTasks: 6, waiting: 3, owesYou: 2, owesThem: 1, lastSeen: "5h ago", nextMeeting: "Fri 09:30" },
  { id: "cahil", name: "Cahil Patel", initials: "CP", ctx: "boxfusion", role: "Direct report · Engineer", color: "#5a7a8a", openTasks: 1, waiting: 0, owesYou: 0, owesThem: 1, lastSeen: "1w ago", nextMeeting: "Next Mon" },
  { id: "telma", name: "Telma", initials: "TL", ctx: "family", role: "Family", color: "#b8588a", openTasks: 3, waiting: 1, owesYou: 0, owesThem: 1, lastSeen: "today", nextMeeting: "—" },
  { id: "catarina", name: "Catarina", initials: "CT", ctx: "family", role: "Family · Daughter", color: "#a85a8a", openTasks: 2, waiting: 0, owesYou: 0, owesThem: 0, lastSeen: "today", nextMeeting: "—" },
  { id: "marco", name: "Marco Vieira", initials: "MV", ctx: "praesto", role: "Praesto · Customer Lead", color: "#6a8a5a", openTasks: 3, waiting: 2, owesYou: 0, owesThem: 2, lastSeen: "3d ago", nextMeeting: "Wed 16:00" },
  { id: "rita", name: "Rita Almeida", initials: "RA", ctx: "boxfusion", role: "Stakeholder · Acme", color: "#8a5a8a", openTasks: 2, waiting: 2, owesYou: 0, owesThem: 0, lastSeen: "1w ago", nextMeeting: "Review due" },
];

const PROJECTS = [
  { id: "fl-launch", name: "Future Life launch", outcome: "Ship Praesto Future Life pilot to 3 customers by end Q2.", ctx: "praesto", status: "On track", target: "Jun 28", open: 12, overdue: 1, next: "Confirm pilot 3 with Marco", people: ["pedro","marco"], progress: 0.55 },
  { id: "appraisals", name: "Boxfusion appraisals 2026 H1", outcome: "Run mid-year cycle for 14 directs and skip-levels.", ctx: "boxfusion", status: "Needs attention", target: "Jun 14", open: 18, overdue: 3, next: "Send Cahil draft self-review", people: ["andy","cahil","paola"], progress: 0.30 },
  { id: "casa-reno", name: "Casa renovation", outcome: "Finish kitchen + bathroom rework.", ctx: "home", status: "On track", target: "Aug 15", open: 7, overdue: 0, next: "Decide on countertop sample", people: ["telma"], progress: 0.70 },
  { id: "hiring", name: "Q2 senior hiring", outcome: "Two senior engineers signed by July.", ctx: "boxfusion", status: "On track", target: "Jul 30", open: 9, overdue: 0, next: "Schedule loop for candidate B", people: ["paola"], progress: 0.40 },
  { id: "fitness", name: "Get back to running", outcome: "10km in 50 min by August.", ctx: "health", status: "Idle", target: "Aug 31", open: 4, overdue: 2, next: "Book physio re: knee", people: [], progress: 0.15 },
];

const AREAS = [
  { id: "bx-people", name: "Boxfusion · People", standard: "Every direct gets 1:1 every 2 weeks; appraisal cadence on time.", open: 11, stale: 2, recurring: 4, people: ["andy","cahil","paola"] },
  { id: "bx-delivery", name: "Boxfusion · Delivery", standard: "Customer trust signals tracked weekly; no surprise escalations.", open: 9, stale: 1, recurring: 3, people: ["andy","rita"] },
  { id: "praesto-ops", name: "Praesto · Operations", standard: "Roadmap reviewed monthly; pipeline coverage 3x.", open: 6, stale: 0, recurring: 2, people: ["pedro","marco"] },
  { id: "health", name: "Health", standard: "Move 4x/week; sleep 7h+; check-ups on schedule.", open: 4, stale: 1, recurring: 3, people: [] },
  { id: "casa", name: "Casa", standard: "House runs without fires; bills, repairs, supplies handled.", open: 5, stale: 0, recurring: 5, people: ["telma"] },
  { id: "telma", name: "Telma", standard: "Connection over logistics. Plan one slow evening per week.", open: 2, stale: 0, recurring: 1, people: ["telma"] },
  { id: "catarina", name: "Catarina", standard: "Be present. School things on time. Saturdays protected.", open: 3, stale: 0, recurring: 2, people: ["catarina"] },
];

const ARCHIVED_PROJECTS = [
  { id: "ax-rebrand", name: "Boxfusion rebrand", outcome: "New visual identity rolled out across all touchpoints.", ctx: "boxfusion", target: "Mar 31", open: 0, completed: 24, archivedAt: "Apr 4, 2026", archivedBy: "Joao", reason: "Completed", note: "Shipped on time. Keep deck for case study.", people: ["paola"], progress: 1 },
  { id: "ax-pilot0", name: "Future Life pilot 0", outcome: "Validate concept with one design partner.", ctx: "praesto", target: "Feb 14", open: 0, completed: 18, archivedAt: "Feb 20, 2026", archivedBy: "Joao", reason: "Completed", note: "Learnings folded into Future Life launch.", people: ["pedro","marco"], progress: 1 },
  { id: "ax-confkeynote", name: "Web Summit keynote", outcome: "Keynote slot accepted and prepped.", ctx: "praesto", target: "Nov 15", open: 0, completed: 9, archivedAt: "Mar 2, 2026", archivedBy: "Joao", reason: "Dropped — not worth it", note: "Decided not to apply for 2026. Revisit Q4.", people: [], progress: 0.4 },
  { id: "ax-coach", name: "Find an exec coach", outcome: "Engage a coach for biweekly sessions.", ctx: "personal", target: "—", open: 0, completed: 3, archivedAt: "Jan 22, 2026", archivedBy: "Joao", reason: "Paused indefinitely", note: "Two intro calls, no fit. Will pick up if budget frees in H2.", people: [], progress: 0.2 },
];

const ARCHIVED_AREAS = [
  { id: "ax-board", name: "Board · Acme advisory", standard: "Quarterly board pack on time; quiet between.", archivedAt: "Apr 14, 2026", archivedBy: "Joao", reason: "Stepped down", note: "Term ended. Handover doc with Rita.", people: ["rita"] },
  { id: "ax-pt-praesto", name: "Praesto · Part-time mode", standard: "2 days/week, founder coverage clear.", archivedAt: "Jan 8, 2026", archivedBy: "Joao", reason: "Replaced", note: "Folded into Praesto · Operations after going full-time.", people: ["pedro"] },
];

const TASKS = {
  // Today — focus
  focus: [
    { id: "t1", title: "Review Cahil's draft self-review and send notes back", status: "next", priority: "important", ctx: "boxfusion", project: "Appraisals 2026 H1", person: "cahil", date: "today", dateLabel: "Today" },
    { id: "t2", title: "Decide pilot customer 3 for Future Life — call Marco", status: "next", priority: "critical", ctx: "praesto", project: "Future Life launch", person: "marco", date: "today", dateLabel: "Today" },
    { id: "t3", title: "Write loop summary for senior eng candidate B", status: "next", priority: "important", ctx: "boxfusion", project: "Q2 senior hiring", person: "paola", date: "today", dateLabel: "Today" },
  ],
  due: [
    { id: "t4", title: "Approve invoice for Acme statement of work", status: "next", priority: "critical", ctx: "boxfusion", project: "—", person: null, date: "today", dateLabel: "Due today" },
    { id: "t5", title: "Send Catarina's school form back", status: "next", priority: "routine", ctx: "family", project: "—", person: "catarina", date: "today", dateLabel: "Due today" },
    { id: "t6", title: "Pick up dry cleaning before 18:00", status: "next", priority: "low", ctx: "home", project: "—", person: null, date: "today", dateLabel: "Due 18:00" },
  ],
  overdue: [
    { id: "t7", title: "Book physio appointment for left knee", status: "next", priority: "important", ctx: "health", project: "Get back to running", person: null, date: "overdue", dateLabel: "3d overdue" },
    { id: "t8", title: "Reply to Rita on revised SOW scope", status: "next", priority: "critical", ctx: "boxfusion", project: "—", person: "rita", date: "overdue", dateLabel: "1d overdue" },
  ],
  followups: [
    { id: "t9", title: "Andy — salary review for Cahil", status: "waiting", priority: "important", ctx: "boxfusion", project: "Appraisals 2026 H1", person: "andy", date: "today", dateLabel: "Follow up today", waitingFor: "Andy", since: "5d" },
    { id: "t10", title: "Pedro — staging deploy for Future Life pilot", status: "delegated", priority: "important", ctx: "praesto", project: "Future Life launch", person: "pedro", date: "today", dateLabel: "Review today", waitingFor: "Pedro", since: "2d" },
  ],
  scheduled: [
    { id: "t11", title: "1:1 with Andy — appraisal calibration", status: "scheduled", priority: "routine", ctx: "boxfusion", project: "—", person: "andy", date: "today", dateLabel: "14:00" },
    { id: "t12", title: "Casa — countertop sample review with Telma", status: "scheduled", priority: "routine", ctx: "home", project: "Casa renovation", person: "telma", date: "today", dateLabel: "19:30" },
  ],
  inbox: [
    { id: "i1", title: "Andy mentioned: Cahil might want a different title — explore", source: "Meeting note · 1:1 Andy", body: "Came up at the end of our 1:1. Andy thinks Cahil's been doing more architecture work than his title reflects, and a re-leveling could come up at the appraisal. Worth thinking about before next month." },
    { id: "i2", title: "Rita asked where the recruitment forms are stored", source: "Email · Rita Almeida", body: "Rita needs the candidate paperwork template before Friday. Paola probably knows. Quick ping then move on." },
    { id: "i3", title: "Catarina school trip permission slip — sign and return", source: "Mobile capture", body: "Snapped the form at school pickup. Due back next Wednesday." },
    { id: "i4", title: "Investigate slow login on Future Life staging", source: "Slack · Pedro", body: "Pedro flagged 4-second auth on the pilot env. Could be cold-start, could be the new auth provider. Triage before Marco's demo Friday." },
    { id: "i5", title: "Book annual health check — overdue by 6 weeks", source: "Calendar reminder", body: "Reminder fired again this morning. Need to actually call." },
  ],
  waiting: [
    { id: "w1", title: "Cahil — draft self-review", waitingFor: "cahil", since: "8d", review: "today", source: "Calendar", status: "waiting", ctx: "boxfusion" },
    { id: "w2", title: "Pedro — Future Life staging deploy", waitingFor: "pedro", since: "2d", review: "today", source: "Slack", status: "delegated", ctx: "praesto" },
    { id: "w3", title: "Andy — calibration notes for skip-levels", waitingFor: "andy", since: "5d", review: "tomorrow", source: "Meeting", status: "waiting", ctx: "boxfusion" },
    { id: "w4", title: "Rita — revised SOW redlines", waitingFor: "rita", since: "12d", review: "stale", source: "Email", status: "waiting", ctx: "boxfusion" },
    { id: "w5", title: "Marco — pilot customer 3 confirmation", waitingFor: "marco", since: "4d", review: "tomorrow", source: "Email", status: "waiting", ctx: "praesto" },
    { id: "w6", title: "Paola — recruitment form template link", waitingFor: "paola", since: "1d", review: "Wed", source: "Slack", status: "waiting", ctx: "boxfusion" },
    { id: "w7", title: "Physio — confirm Tuesday slot", waitingFor: "(physio clinic)", since: "3d", review: "tomorrow", source: "Phone", status: "waiting", ctx: "health" },
    { id: "w8", title: "Marco — pricing approval from his CFO", waitingFor: "marco", since: "9d", review: "stale", source: "Meeting", status: "waiting", ctx: "praesto" },
  ],
};

window.NS = { PEOPLE, PROJECTS, AREAS, ARCHIVED_PROJECTS, ARCHIVED_AREAS, TASKS };
