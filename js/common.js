/* ===== TEAL PMS v2 — Data Layer & Utilities ===== */
const TPMS_VERSION = '1';
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
  // Wipe old data
  ['projects','tickets','epics','sprints','team','milestones','activeProject']
    .forEach(k => store.del(k));
  localStorage.setItem(KEY('version'), TPMS_VERSION);

  // Load from SEED if available
  if (typeof SEED !== 'undefined') {
    saveProjects(SEED.projects || []);
    saveTickets(SEED.tickets || []);
    saveEpics(SEED.epics || []);
    saveSprints(SEED.sprints || []);
    saveTeam(SEED.team || []);
    saveMilestones(SEED.milestones || []);
    if (SEED.projects?.[0]) setActiveProject(SEED.projects[0].id);
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
  { key:'dashboard',  href:'index.html',     icon:'📊', label:'Dashboard' },
  { key:'projects',   href:'projects.html',   icon:'📁', label:'Projects' },
  { key:'tickets',    href:'tickets.html',    icon:'🎫', label:'Tickets' },
  { key:'board',      href:'board.html',      icon:'📋', label:'Board' },
  { key:'scrum',      href:'scrum.html',      icon:'🔄', label:'Sprints' },
  { key:'roadmap',    href:'roadmap.html',    icon:'🗺️', label:'Roadmap' },
  { key:'team',       href:'team.html',       icon:'👥', label:'Team' },
  { key:'reports',    href:'reports.html',    icon:'📈', label:'Reports' },
  { key:'import',     href:'import.html',     icon:'📥', label:'Import' },
  { key:'guide',      href:'guide.html',      icon:'📖', label:'Guide' },
];

function buildNav(activeKey) {
  const proj = getActiveProject();
  const tickets = proj ? getTicketsByProject(proj.id) : [];
  const overdue = tickets.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done').length;
  const pageName = NAV.find(n => n.key === activeKey)?.label || '';

  const navHtml = NAV.map(n => {
    const badge = n.key === 'tickets' && overdue > 0 ? `<span class="nav-badge warn">${overdue}</span>` : '';
    return `<a href="${n.href}" class="nav-item ${activeKey === n.key ? 'active' : ''}">
      <span class="nav-icon">${n.icon}</span>${n.label}${badge}
    </a>`;
  }).join('');

  document.body.insertAdjacentHTML('afterbegin', `
    <div class="demo-banner">
      🚧 <strong>DEMO</strong> &nbsp;·&nbsp; Teal PMS v2 — Sample data only &nbsp;·&nbsp; <a href="guide.html">Read the Guide</a>
    </div>
    <nav class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <rect x="3" y="4" width="18" height="4" rx="1.5" fill="white" stroke="none"/>
            <rect x="3" y="10" width="12" height="3" rx="1.5" fill="rgba(255,255,255,.7)" stroke="none"/>
            <rect x="3" y="15" width="15" height="3" rx="1.5" fill="rgba(255,255,255,.85)" stroke="none"/>
          </svg>
        </div>
        <div>
          <div class="logo-text">Teal PMS</div>
          <div class="logo-sub">Project Management</div>
        </div>
      </div>
      ${proj ? `
      <div class="sidebar-project" onclick="window.location='projects.html'">
        <div class="proj-label">Active Project</div>
        <div class="proj-name">${proj.name}</div>
        <div class="proj-key">${proj.key} · ${proj.category || ''}</div>
      </div>` : ''}
      <div class="nav-section">
        <div class="nav-label">Navigation</div>
        ${navHtml}
      </div>
      <div class="sidebar-bottom">
        <a class="nav-item" onclick="toggleTheme();return false;" href="#">
          <span class="nav-icon">🌓</span>Toggle Theme
        </a>
      </div>
    </nav>
    <div class="topbar">
      <div class="breadcrumb">
        <span>Teal PMS</span>
        <span class="sep">/</span>
        <strong>${pageName}</strong>
      </div>
      <div class="topbar-right">
        <div class="search-box">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" placeholder="Search tickets…" id="global-search" onkeyup="if(this.value.length>1)window.location='tickets.html?q='+encodeURIComponent(this.value)" />
        </div>
        <button class="btn-icon" title="Toggle theme" onclick="toggleTheme()">🌓</button>
      </div>
    </div>
  `);
  document.getElementById('toast-container') || document.body.insertAdjacentHTML('beforeend', '<div id="toast-container"></div>');
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
  const colors = ['#0A9696','#3fb950','#58a6ff','#bc8cff','#e3b341','#f85149','#0DC8C8','#ff9500','#06b6d4','#8b5cf6'];
  let h = 0; for (let c of String(name)) h = (h * 31 + c.charCodeAt(0)) & 0xFFFFFF;
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
  const m = { 'Backlog':'badge-backlog','Todo':'badge-todo','In Progress':'badge-progress','Review':'badge-review','Done':'badge-done','Blocked':'badge-blocked' };
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
  const m = { 'Critical':'🔴','High':'🟠','Medium':'🟡','Low':'🔵' };
  return m[p] || '⚪';
}
function progressBar(pct, cls = '') {
  const p = Math.min(100, Math.max(0, pct || 0));
  const barCls = p >= 100 ? 'done' : p < 30 ? 'fail' : '';
  return `<div class="progress"><div class="progress-bar ${barCls} ${cls}" style="width:${p}%"></div></div>`;
}
function toast(msg, type = 'pass') {
  const c = document.getElementById('toast-container'); if (!c) return;
  const el = document.createElement('div'); el.className = `toast ${type}`;
  const icon = type === 'pass' ? '✅' : type === 'fail' ? '❌' : '⚠️';
  el.innerHTML = `${icon} ${msg}`;
  c.appendChild(el); setTimeout(() => el.remove(), 3200);
}

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
  a.click(); toast('Backup exported ✓');
}
function importData(file) {
  const r = new FileReader();
  r.onload = e => {
    try {
      const d = JSON.parse(e.target.result);
      if (d.projects) saveProjects(d.projects);
      if (d.tickets) saveTickets(d.tickets);
      if (d.epics) saveEpics(d.epics);
      if (d.sprints) saveSprints(d.sprints);
      if (d.team) saveTeam(d.team);
      if (d.milestones) saveMilestones(d.milestones);
      toast('Data restored ✓'); setTimeout(() => location.reload(), 800);
    } catch { toast('Invalid backup file', 'fail'); }
  };
  r.readAsText(file);
}

/* ---- Stats helper ---- */
function calcProjectStats(pid) {
  const tickets = getTicketsByProject(pid).filter(t => t.type !== 'Epic');
  const done = tickets.filter(t => t.status === 'Done').length;
  const inProg = tickets.filter(t => t.status === 'In Progress').length;
  const overdue = tickets.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done').length;
  return { total: tickets.length, done, inProg, overdue, open: tickets.length - done - inProg, pct: tickets.length ? Math.round(done / tickets.length * 100) : 0 };
}
