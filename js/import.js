/* ===== TEAL PMS v2 — Import Parsers ===== */

const IMPORT_FORMATS = {
  zoho:   { name: 'Zoho Projects', icon: '🟠', ext: ['.csv'], desc: 'CSV export from Zoho Projects' },
  jira:   { name: 'Jira',          icon: '🔵', ext: ['.xml','.json'], desc: 'XML or JSON export from Jira' },
  trello: { name: 'Trello',        icon: '🟦', ext: ['.json'], desc: 'JSON board export from Trello' },
  asana:  { name: 'Asana',         icon: '🩷', ext: ['.csv'], desc: 'CSV export from Asana' },
  csv:    { name: 'Generic CSV',   icon: '📄', ext: ['.csv'], desc: 'Generic task CSV with column mapping' },
  backup: { name: 'TealPMS Backup',icon: '💾', ext: ['.json'], desc: 'Restore a TealPMS JSON backup' },
};

/* ---- Auto-detect format from file ---- */
function detectFormat(fileName, content) {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  if (ext === '.json') {
    try {
      const d = JSON.parse(content);
      if (d.version && d.projects) return 'backup';    // TealPMS backup
      if (d.lists && d.cards)        return 'trello';
      if (d.issues || d.total)       return 'jira';
    } catch {}
    return 'json';
  }
  if (ext === '.xml') return 'jira';
  if (ext === '.csv') {
    const firstLine = content.split('\n')[0].toLowerCase();
    if (firstLine.includes('task name') && (firstLine.includes('task owner') || firstLine.includes('percent'))) return 'zoho';
    if (firstLine.includes('assignee') && firstLine.includes('section')) return 'asana';
    return 'csv';
  }
  return null;
}

/* ---- CSV parser ---- */
function parseCSV(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    const vals = []; let cur = ''; let inQ = false;
    for (const ch of line + ',') {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}

/* ---- Status mappers ---- */
function mapStatus(raw) {
  const s = (raw || '').toLowerCase().trim();
  if (['done','completed','closed','resolved','finished','complete'].some(x => s.includes(x))) return 'Done';
  if (['in progress','in-progress','active','working','started','wip','ongoing'].some(x => s.includes(x))) return 'In Progress';
  if (['review','in review','code review','testing','qa','uat'].some(x => s.includes(x))) return 'Review';
  if (['blocked','on hold','waiting','impediment'].some(x => s.includes(x))) return 'Blocked';
  if (['todo','to do','to-do','open','new','not started'].some(x => s.includes(x))) return 'Todo';
  return 'Backlog';
}
function mapPriority(raw) {
  const p = (raw || '').toLowerCase().trim();
  if (['critical','blocker','urgent','p0','highest'].some(x => p.includes(x))) return 'Critical';
  if (['high','p1'].some(x => p.includes(x))) return 'High';
  if (['low','minor','p3','p4','lowest'].some(x => p.includes(x))) return 'Low';
  return 'Medium';
}
function mapType(raw) {
  const t = (raw || '').toLowerCase().trim();
  if (t.includes('bug') || t.includes('defect') || t.includes('error')) return 'Bug';
  if (t.includes('epic')) return 'Epic';
  if (t.includes('story')) return 'Story';
  if (t.includes('feature') || t.includes('new feature')) return 'Feature';
  if (t.includes('improve') || t.includes('enhancement')) return 'Improvement';
  return 'Task';
}

/* ---- Zoho Projects CSV parser ---- */
function parseZoho(content, projectId, projectKey) {
  const rows = parseCSV(content);
  const num = getTickets().filter(t => t.projectId === projectId).length;
  return rows.filter(r => r['Task Name'] || r['task name'] || r['Name']).map((r, i) => {
    const name = r['Task Name'] || r['task name'] || r['Name'] || '';
    const assignees = (r['Task Owner'] || r['Assignee'] || r['task owner'] || '').split(/[,;]/).map(a => a.trim()).filter(Boolean);
    const pct = parseInt(r['Percent Complete'] || r['% Complete'] || r['Completion (%)'] || '0') || 0;
    return {
      id: `TKT-IMP-${Date.now()}-${i}`,
      key: `${projectKey}-${num + i + 1}`,
      projectId, epicId: null, sprintId: null,
      title: name,
      description: r['Description'] || r['Notes'] || '',
      type: mapType(r['Type'] || r['Task Type'] || ''),
      status: mapStatus(r['Status'] || (pct === 100 ? 'Done' : pct > 0 ? 'In Progress' : 'Backlog')),
      priority: mapPriority(r['Priority'] || ''),
      assignees, reporter: assignees[0] || '',
      labels: [r['Task List'] || r['Section'] || r['Module'] || ''].filter(Boolean),
      startDate: parseDate(r['Start Date'] || r['StartDate'] || ''),
      dueDate:   parseDate(r['End Date'] || r['Due Date'] || r['DueDate'] || ''),
      estimatedHours: parseFloat(r['Estimated Hours'] || r['Estimate'] || '0') || 0,
      loggedHours: parseFloat(r['Actual Hours'] || r['Logged Hours'] || '0') || 0,
      pctComplete: pct,
      comments: [], timeLog: [],
      createdAt: new Date().toISOString(),
    };
  });
}

/* ---- Jira XML parser ---- */
function parseJiraXML(content, projectId, projectKey) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');
  const items = doc.querySelectorAll('item');
  const num = getTickets().filter(t => t.projectId === projectId).length;
  return Array.from(items).map((item, i) => {
    const get = tag => item.querySelector(tag)?.textContent?.trim() || '';
    return {
      id: `TKT-IMP-${Date.now()}-${i}`,
      key: get('key') || `${projectKey}-${num + i + 1}`,
      projectId, epicId: null, sprintId: null,
      title: get('summary') || get('title') || '',
      description: get('description') || '',
      type: mapType(get('type') || get('issuetype') || ''),
      status: mapStatus(get('status') || ''),
      priority: mapPriority(get('priority') || ''),
      assignees: [get('assignee')].filter(Boolean),
      reporter: get('reporter') || '',
      labels: get('labels') ? get('labels').split(',').map(l => l.trim()) : [],
      startDate: parseDate(get('created')),
      dueDate:   parseDate(get('due') || get('duedate') || ''),
      estimatedHours: 0, loggedHours: 0, pctComplete: 0,
      comments: [], timeLog: [],
      createdAt: new Date().toISOString(),
    };
  });
}

/* ---- Jira JSON parser ---- */
function parseJiraJSON(content, projectId, projectKey) {
  const data = JSON.parse(content);
  const issues = data.issues || data || [];
  const num = getTickets().filter(t => t.projectId === projectId).length;
  return issues.map((issue, i) => {
    const f = issue.fields || {};
    return {
      id: `TKT-IMP-${Date.now()}-${i}`,
      key: issue.key || `${projectKey}-${num + i + 1}`,
      projectId, epicId: null, sprintId: null,
      title: f.summary || issue.title || '',
      description: f.description?.content?.[0]?.content?.[0]?.text || f.description || '',
      type: mapType(f.issuetype?.name || ''),
      status: mapStatus(f.status?.name || ''),
      priority: mapPriority(f.priority?.name || ''),
      assignees: f.assignee ? [f.assignee.displayName || f.assignee.name] : [],
      reporter: f.reporter?.displayName || '',
      labels: f.labels || [],
      startDate: parseDate(f.created || ''),
      dueDate: parseDate(f.duedate || ''),
      estimatedHours: (f.timeoriginalestimate || 0) / 3600,
      loggedHours: (f.timespent || 0) / 3600,
      pctComplete: 0,
      comments: [], timeLog: [],
      createdAt: new Date().toISOString(),
    };
  });
}

/* ---- Trello JSON parser ---- */
function parseTrello(content, projectId, projectKey) {
  const board = JSON.parse(content);
  const listMap = {};
  (board.lists || []).forEach(l => { listMap[l.id] = l.name; });
  const memberMap = {};
  (board.members || []).forEach(m => { memberMap[m.id] = m.fullName || m.username; });
  const num = getTickets().filter(t => t.projectId === projectId).length;
  return (board.cards || []).filter(c => !c.closed).map((card, i) => {
    const assignees = (card.idMembers || []).map(id => memberMap[id] || id);
    const listName = listMap[card.idList] || 'Backlog';
    return {
      id: `TKT-IMP-${Date.now()}-${i}`,
      key: `${projectKey}-${num + i + 1}`,
      projectId, epicId: null, sprintId: null,
      title: card.name || '',
      description: card.desc || '',
      type: 'Task',
      status: mapStatus(listName),
      priority: mapPriority((card.labels || []).map(l => l.name).join(' ')),
      assignees, reporter: assignees[0] || '',
      labels: (card.labels || []).map(l => l.name).filter(Boolean),
      startDate: null,
      dueDate: parseDate(card.due || ''),
      estimatedHours: 0, loggedHours: 0, pctComplete: card.dueComplete ? 100 : 0,
      comments: [], timeLog: [],
      createdAt: card.dateLastActivity || new Date().toISOString(),
    };
  });
}

/* ---- Asana CSV parser ---- */
function parseAsana(content, projectId, projectKey) {
  const rows = parseCSV(content);
  const num = getTickets().filter(t => t.projectId === projectId).length;
  return rows.filter(r => r['Name'] || r['Task Name']).map((r, i) => {
    const assignees = (r['Assignee'] || '').split(/[,;]/).map(a => a.trim()).filter(Boolean);
    return {
      id: `TKT-IMP-${Date.now()}-${i}`,
      key: `${projectKey}-${num + i + 1}`,
      projectId, epicId: null, sprintId: null,
      title: r['Name'] || r['Task Name'] || '',
      description: r['Notes'] || r['Description'] || '',
      type: mapType(r['Type'] || ''),
      status: mapStatus(r['Completion Status'] || r['Status'] || ''),
      priority: mapPriority(r['Priority'] || ''),
      assignees, reporter: assignees[0] || '',
      labels: [r['Section/Column'] || r['Project Section'] || r['Tags'] || ''].filter(Boolean),
      startDate: parseDate(r['Start Date'] || ''),
      dueDate:   parseDate(r['Due Date'] || ''),
      estimatedHours: 0, loggedHours: 0, pctComplete: (r['Completion Status'] || '').toLowerCase().includes('complete') ? 100 : 0,
      comments: [], timeLog: [],
      createdAt: new Date().toISOString(),
    };
  });
}

/* ---- Date normaliser ---- */
function parseDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);
  // Try DD/MM/YYYY or MM/DD/YYYY
  const parts = raw.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const d2 = new Date(`${c.length === 4 ? c : '20' + c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`);
    if (!isNaN(d2)) return d2.toISOString().slice(0, 10);
  }
  return null;
}

/* ---- Main entry point ---- */
function runImport(format, content, fileName, projectId, onPreview, onError) {
  const proj = getProject(projectId);
  if (!proj) { onError('No project selected'); return; }
  const key = proj.key;
  try {
    let tickets = [];
    if (format === 'backup') {
      importData(new File([content], fileName, { type: 'application/json' }));
      return;
    } else if (format === 'zoho') {
      tickets = parseZoho(content, projectId, key);
    } else if (format === 'jira') {
      if (fileName.endsWith('.xml')) tickets = parseJiraXML(content, projectId, key);
      else tickets = parseJiraJSON(content, projectId, key);
    } else if (format === 'trello') {
      tickets = parseTrello(content, projectId, key);
    } else if (format === 'asana') {
      tickets = parseAsana(content, projectId, key);
    } else {
      onError('Unsupported format'); return;
    }
    onPreview(tickets);
  } catch (e) {
    onError('Parse error: ' + e.message);
  }
}

function commitImport(tickets) {
  const all = getTickets();
  saveTickets([...all, ...tickets]);
  toast(`Imported ${tickets.length} tickets ✓`);
}
