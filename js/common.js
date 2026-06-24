/* ===== Teal PMS v2 — Data Layer & Utilities ===== */
const TPMS_VERSION = '3';
const KEY = k => `tpms2-${k}`;
const store = {
  get: k => { try { return JSON.parse(localStorage.getItem(KEY(k))); } catch { return null; } },
  set: (k, v) => localStorage.setItem(KEY(k), JSON.stringify(v)),
  del: k => localStorage.removeItem(KEY(k))
};

/* ---- Projects ---- */
const getProjects = () => store.get('projects') || [];
const saveProjects = p => store.set('projects', p);
const getProject = id => getProjects().find(p => p.id === id) || null;
function createProject(data) {
  const p = { createdAt: new Date().toISOString(), ...data };
  saveProjects([...getProjects(), p]); return p;
}
function updateProject(id, patch) {
  saveProjects(getProjects().map(p => p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p));
}
function deleteProject(id) { saveProjects(getProjects().filter(p => p.id !== id)); }

/* ---- Active project ---- */
const getActiveProjectId = () => store.get('activeProject');
const setActiveProject = id => store.set('activeProject', id);
function getActiveProject() {
  const id = getActiveProjectId();
  return id ? getProject(id) : (getProjects()[0] || null);
}

/* ---- Tickets ---- */
const getTickets = () => store.get('tickets') || [];
const saveTickets = t => store.set('tickets', t);
const getTicket = id => getTickets().find(t => t.id === id) || null;
const getTicketsByProject = pid => getTickets().filter(t => t.projectId === pid);
function createTicket(data) {
  const proj = getProject(data.projectId);
  const all = getTickets();
  const projTickets = all.filter(t => t.projectId === data.projectId);
  const num = projTickets.length + 1;
  const t = {
    id: `TKT-${Date.now()}`,
    key: `${proj?.key || 'TKT'}-${num}`,
    comments: [], timeLog: [], labels: [],
    createdAt: new Date().toISOString(), updatedAt: null,
    ...data
  };
  saveTickets([...all, t]); return t;
}
function updateTicket(id, patch) {
  saveTickets(getTickets().map(t => t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t));
}
function deleteTicket(id) { saveTickets(getTickets().filter(t => t.id !== id)); }
function addComment(ticketId, text, author) {
  const t = getTicket(ticketId);
  if (!t) return;
  const comments = [...(t.comments || []), { id: `C-${Date.now()}`, author, text, createdAt: new Date().toISOString() }];
  updateTicket(ticketId, { comments });
}
function logTime(ticketId, hours, activity, comment, userId) {
  const t = getTicket(ticketId);
  if (!t) return;
  const entry = { id: `TL-${Date.now()}`, userId, hours, activity, comment, date: new Date().toISOString() };
  const timeLog = [...(t.timeLog || []), entry];
  const loggedHours = (t.loggedHours || 0) + hours;
  updateTicket(ticketId, { timeLog, loggedHours });
}

/* ---- Epics ---- */
const getEpics = () => store.get('epics') || [];
const saveEpics = e => store.set('epics', e);
const getEpic = id => getEpics().find(e => e.id === id) || null;
const getEpicsByProject = pid => getEpics().filter(e => e.projectId === pid);
function createEpic(data) {
  const e = { id: `EPIC-${Date.now()}`, createdAt: new Date().toISOString(), ...data };
  saveEpics([...getEpics(), e]); return e;
}
function updateEpic(id, patch) { saveEpics(getEpics().map(e => e.id === id ? { ...e, ...patch } : e)); }

/* ---- Sprints ---- */
const getSprints = () => store.get('sprints') || [];
const saveSprints = s => store.set('sprints', s);
const getSprint = id => getSprints().find(s => s.id === id) || null;
const getSprintsByProject = pid => getSprints().filter(s => s.projectId === pid);
function createSprint(data) {
  const s = { id: `SPR-${Date.now()}`, createdAt: new Date().toISOString(), ...data };
  saveSprints([...getSprints(), s]); return s;
}
function updateSprint(id, patch) { saveSprints(getSprints().map(s => s.id === id ? { ...s, ...patch } : s)); }

/* ---- Team ---- */
const getTeam = () => store.get('team') || [];
const saveTeam = t => store.set('team', t);

/* ---- Activity Log ---- */
const getActivities = () => store.get('activities') || [];
function logActivity(type, text, ticketKey, projectId) {
  const acts = getActivities();
  acts.unshift({ id: `ACT-${Date.now()}`, type, text, ticketKey, projectId, createdAt: new Date().toISOString() });
  store.set('activities', acts.slice(0, 200));
}

/* ---- Milestones ---- */
const getMilestones = () => store.get('milestones') || [];
const saveMilestones = m => store.set('milestones', m);
const getMilestonesByProject = pid => getMilestones().filter(m => m.projectId === pid);
function createMilestone(data) {
  const m = { id: `MS-${Date.now()}`, ...data };
  saveMilestones([...getMilestones(), m]); return m;
}
function updateMilestone(id, patch) { saveMilestones(getMilestones().map(m => m.id === id ? { ...m, ...patch } : m)); }

/* ---- Seed & Migration ---- */
function seedDemoData() {
  if (localStorage.getItem(KEY('version')) === TPMS_VERSION && getProjects().length > 0) return;
  ['projects','tickets','epics','sprints','team','milestones','activeProject']
    .forEach(k => store.del(k));
  localStorage.setItem(KEY('version'), TPMS_VERSION);

  if (typeof SEED !== 'undefined') {
    saveProjects(SEED.projects || []);
    saveTickets(SEED.tickets || []);
    saveEpics(SEED.epics || []);
    saveSprints(SEED.sprints || []);
    saveTeam(SEED.team || []);
    saveMilestones(SEED.milestones || []);
    if (SEED.projects?.[0]) setActiveProject(SEED.projects[0].id);
    store.set('activities', [
      { id:'ACT-1', type:'created',  text:'Project ALPHA initialized with 25 tickets',        ticketKey:'',         projectId:'PRJ-001', createdAt: new Date(Date.now()-86400000*2).toISOString() },
      { id:'ACT-2', type:'updated',  text:'ALPHA-12: Status changed to In Progress',          ticketKey:'ALPHA-12', projectId:'PRJ-001', createdAt: new Date(Date.now()-3600000*8).toISOString() },
      { id:'ACT-3', type:'comment',  text:'ALPHA-11: New comment added by User4',             ticketKey:'ALPHA-11', projectId:'PRJ-001', createdAt: new Date(Date.now()-3600000*5).toISOString() },
      { id:'ACT-4', type:'done',     text:'BETA-11: CDN fix marked as Done',                  ticketKey:'BETA-11',  projectId:'PRJ-002', createdAt: new Date(Date.now()-3600000*3).toISOString() },
      { id:'ACT-5', type:'updated',  text:'GAMMA-1: CI/CD pipeline 50% complete',             ticketKey:'GAMMA-1',  projectId:'PRJ-003', createdAt: new Date(Date.now()-3600000*2).toISOString() },
      { id:'ACT-6', type:'created',  text:'ALPHA-25: Bug reported — login fails on Safari 16',ticketKey:'ALPHA-25', projectId:'PRJ-001', createdAt: new Date(Date.now()-1800000).toISOString() },
      { id:'ACT-7', type:'comment',  text:'BETA-12: Lighthouse score now at 87',              ticketKey:'BETA-12',  projectId:'PRJ-002', createdAt: new Date(Date.now()-900000).toISOString() },
    ]);
  }
}

/* ---- Theme ---- */
function initTheme() {
  const saved = localStorage.getItem(KEY('theme')) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', cur);
  localStorage.setItem(KEY('theme'), cur);
}
initTheme();

/* ---- Nav builder ---- */
const NAV = [
  { key:'dashboard',  href:'index.html',     icon:'dashboard', label:'Dashboard' },
  { key:'projects',   href:'projects.html',   icon:'folder',    label:'Projects' },
  { key:'tickets',    href:'tickets.html',    icon:'ticket',    label:'Tickets' },
  { key:'board',      href:'board.html',      icon:'board',     label:'Board' },
  { key:'scrum',      href:'scrum.html',      icon:'sprint',    label:'Sprints' },
  { key:'gantt',      href:'gantt.html',      icon:'gantt',     label:'Gantt' },
  { key:'roadmap',    href:'roadmap.html',    icon:'roadmap',   label:'Roadmap' },
  { key:'team',       href:'team.html',       icon:'team',      label:'Team' },
  { key:'reports',    href:'reports.html',    icon:'chart',     label:'Reports' },
  { key:'import',     href:'import.html',     icon:'import',    label:'Import' },
  { key:'guide',      href:'guide.html',      icon:'guide',     label:'Guide' },
];

/* Icon SVGs — avoids emoji encoding issues */
function navIcon(type) {
  const icons = {
    dashboard: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>',
    folder:    '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 3a1 1 0 011-1h4l2 2h6a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V3z"/></svg>',
    ticket:    '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v2.586a1 1 0 01-.293.707L12 8l1.707 1.707A1 1 0 0114 10.414V13a1 1 0 01-1 1H3a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707L4 8 2.293 6.293A1 1 0 012 5.586V3z"/></svg>',
    board:     '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="4" height="14" rx="1"/><rect x="6" y="1" width="4" height="10" rx="1"/><rect x="11" y="1" width="4" height="12" rx="1"/></svg>',
    sprint:    '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2a5 5 0 110 10A5 5 0 018 3zm0 2v3.586l2.207 2.207-1.414 1.414L6.5 10.5V5h1.5z"/></svg>',
    gantt:     '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="8" height="3" rx="1"/><rect x="4" y="7" width="9" height="3" rx="1"/><rect x="2" y="12" width="7" height="2" rx="1"/></svg>',
    roadmap:   '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2h14v2H1V2zm2 4h10v2H3V6zm3 4h7v2H6v-2z"/></svg>',
    team:      '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="5" cy="5" r="3"/><circle cx="11" cy="5" r="2.5"/><path d="M0 13c0-2.761 2.239-5 5-5s5 2.239 5 5H0zm9.5 0c0-1.5-.5-2.866-1.352-3.948C8.72 8.384 9.843 8 11 8c2.485 0 4.5 2.015 4.5 4.5v.5H9.5z"/></svg>',
    chart:     '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="9" width="3" height="6" rx="1"/><rect x="6" y="5" width="3" height="10" rx="1"/><rect x="11" y="1" width="3" height="14" rx="1"/></svg>',
    import:    '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1v8m0 0L5 6m3 3l3-3M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2"/></svg>',
    guide:     '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 1h10a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1zm1 3v1h8V4H4zm0 3v1h8V7H4zm0 3v1h5v-1H4z"/></svg>',
    moon:      '<svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor"><path d="M2.9 0.5C1.8 2.2 1.2 4.1 1.2 6c0 3.7 2.3 6.9 5.6 8.2.4.2.8-.2.7-.7C6.8 12.1 6.5 10.5 6.5 9c0-4.1 3-7.5 7-7.9.5 0 .7-.6.4-1C12.4.5 11.2 0 10 0 6.7 0 4 1.8 2.9.5z"/></svg>',
  };
  return icons[type] || '';
}

function buildNav(activeKey) {
  const proj = getActiveProject();
  const tickets = proj ? getTicketsByProject(proj.id) : [];
  const overdue = tickets.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done').length;
  const pageName = NAV.find(n => n.key === activeKey)?.label || '';

  const navHtml = NAV.map(n => {
    const badge = n.key === 'tickets' && overdue > 0 ? `<span class="nav-badge warn">${overdue}</span>` : '';
    return `<a href="${n.href}" class="nav-item ${activeKey === n.key ? 'active' : ''}">
      <span class="nav-icon">${navIcon(n.icon)}</span>${n.label}${badge}
    </a>`;
  }).join('');

  document.body.insertAdjacentHTML('afterbegin', `
    <nav class="sidebar">
      <div class="sidebar-logo">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#0DC8C8"/>
          <rect x="5" y="7" width="22" height="4" rx="2" fill="#0a0a0a"/>
          <rect x="5" y="14" width="15" height="3.5" rx="1.75" fill="#0a0a0a" opacity=".8"/>
          <rect x="5" y="21" width="19" height="3.5" rx="1.75" fill="#0a0a0a" opacity=".9"/>
        </svg>
        <div class="sidebar-logo-text"><span>Teal</span>PMS</div>
      </div>
      ${proj ? `
      <div class="sidebar-project" onclick="window.location='projects.html'">
        <div class="sidebar-project-label">Active Project</div>
        <div class="sidebar-project-name">${proj.name}</div>
      </div>` : ''}
      <div class="sidebar-section">Navigation</div>
      ${navHtml}
      <div class="sidebar-bottom">
        <div class="sidebar-credit">Demo App built by Suji Kumar C</div>
        <a class="nav-item" onclick="toggleTheme();return false;" href="#">
          <span class="nav-icon">${navIcon('moon')}</span>Toggle Theme
        </a>
      </div>
    </nav>
    <div class="topbar">
      <div class="topbar-left">
        <div class="topbar-breadcrumb">Teal PMS &nbsp;/&nbsp; <strong>${pageName}</strong></div>
      </div>
      <div class="topbar-actions">
        ${proj ? `<span style="font-size:11px;color:var(--teal,#0DC8C8);background:rgba(13,200,200,.1);padding:3px 10px;border:1px solid rgba(13,200,200,.25);border-radius:20px;font-weight:700;letter-spacing:.5px">${proj.key}</span>` : ''}
        <button class="theme-toggle" onclick="toggleTheme()" title="Toggle theme">${navIcon('moon')}</button>
      </div>
    </div>
    <div class="demo-banner">
      Demo mode &mdash; sample data only &nbsp;&bull;&nbsp;
      <a href="import.html">Import your data</a> &nbsp;&bull;&nbsp;
      <a href="guide.html">Guide</a>
    </div>
  `);
  document.getElementById('toast-container') ||
    document.body.insertAdjacentHTML('beforeend', '<div id="toast-container"></div>');
}

/* ---- Utilities ---- */
function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return iso; }
}
function daysFrom(iso) {
  if (!iso) return null;
  return Math.round((new Date(iso + 'T00:00:00') - new Date()) / 86400000);
}
function avatarColor(name) {
  const colors = ['#f59e0b','#f97316','#ef4444','#10b981','#38bdf8','#a78bfa','#f472b6','#22c55e','#fbbf24','#06b6d4'];
  let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) & 0xFFFFFF;
  return colors[Math.abs(h) % colors.length];
}
function initials(name) { return String(name).split(/[\s_]+/).slice(0,2).map(w => w[0]?.toUpperCase() || '').join(''); }
function renderAvatars(assignees, max = 3) {
  if (!assignees?.length) return '<span style="color:var(--text-muted);font-size:11px">—</span>';
  return '<div class="avatar-stack">' +
    assignees.slice(0, max).map(a =>
      `<div class="avatar" style="background:${avatarColor(a)}" title="${a}">${initials(a)}</div>`
    ).join('') +
    (assignees.length > max ? `<div class="avatar" style="background:var(--text-muted)">+${assignees.length - max}</div>` : '') +
    '</div>';
}
function statusBadge(s) {
  const m = { 'Backlog':'badge-backlog','Todo':'badge-todo','In Progress':'badge-inprogress','Review':'badge-review','Done':'badge-done','Blocked':'badge-blocked' };
  return `<span class="badge ${m[s]||'badge-backlog'}">${s||'Backlog'}</span>`;
}
function priorityBadge(p) {
  const m = { 'Critical':'badge-critical','High':'badge-high','Medium':'badge-medium','Low':'badge-low' };
  return `<span class="badge ${m[p]||'badge-medium'}">${p||'Medium'}</span>`;
}
function typeBadge(t) {
  const m = { 'Task':'badge-task','Bug':'badge-bug','Feature':'badge-feature','Story':'badge-story','Epic':'badge-epic','Improvement':'badge-improve' };
  return `<span class="badge ${m[t]||'badge-task'}">${t||'Task'}</span>`;
}
function prioIcon(p) {
  const m = { 'Critical':'!', 'High':'H', 'Medium':'M', 'Low':'L' };
  return m[p] || '?';
}
function progressBar(pct) {
  const p = Math.min(100, Math.max(0, pct || 0));
  return `<div class="progress-bar"><div class="progress-fill" style="width:${p}%"></div></div>`;
}
function toast(msg, type = 'pass') {
  const c = document.getElementById('toast-container'); if (!c) return;
  const el = document.createElement('div'); el.className = `toast ${type}`;
  const icon = type === 'pass' ? '&#10003;' : type === 'fail' ? '&#10007;' : '&#9888;';
  el.innerHTML = `${icon} ${msg}`;
  c.appendChild(el); setTimeout(() => el.remove(), 3200);
}
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

/* ---- Export / Import ---- */
function exportData() {
  const data = {
    version: TPMS_VERSION, exportedAt: new Date().toISOString(),
    projects: getProjects(), tickets: getTickets(), epics: getEpics(),
    sprints: getSprints(), team: getTeam(), milestones: getMilestones()
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = `TealPMS_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  toast('Backup exported successfully!');
}

function importData(json) {
  try {
    const d = typeof json === 'string' ? JSON.parse(json) : json;
    if (d.projects)   saveProjects(d.projects);
    if (d.tickets)    saveTickets(d.tickets);
    if (d.epics)      saveEpics(d.epics);
    if (d.sprints)    saveSprints(d.sprints);
    if (d.team)       saveTeam(d.team);
    if (d.milestones) saveMilestones(d.milestones);
    if (d.projects?.[0]) setActiveProject(d.projects[0].id);
    localStorage.setItem(KEY('version'), TPMS_VERSION);
    toast('Data imported successfully!');
    return true;
  } catch(e) {
     toast('Import failed: ' + e.message, 'fail');
    return false;
  }
}
