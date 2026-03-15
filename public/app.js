/* ── mdbrowse client ── */

const fileTreeEl = document.getElementById('file-tree');
const contentInner = document.getElementById('content-inner');
const themeToggle = document.getElementById('theme-toggle');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');

let currentPath = null;
let treeData = null;

// ── Theme ──

function getTheme() {
  return localStorage.getItem('mdbrowse-theme') || 'auto';
}

function applyTheme(theme) {
  document.documentElement.classList.remove('dark', 'light');
  if (theme !== 'auto') {
    document.documentElement.classList.add(theme);
  }
  localStorage.setItem('mdbrowse-theme', theme);
}

themeToggle.addEventListener('click', () => {
  const current = getTheme();
  const isDark =
    current === 'dark' ||
    (current === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  applyTheme(isDark ? 'light' : 'dark');
});

applyTheme(getTheme());

// ── Sidebar Toggle (mobile) ──

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

// Close sidebar when clicking content on mobile
document.getElementById('content').addEventListener('click', () => {
  sidebar.classList.remove('open');
});

// ── File Tree ──

async function fetchTree() {
  const res = await fetch('/api/tree');
  treeData = await res.json();
  renderTree(treeData);
}

function fileIcon(name) {
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  const icons = {
    md: '📄', mdx: '📄',
    js: '📜', ts: '📜', mjs: '📜', cjs: '📜', jsx: '📜', tsx: '📜',
    py: '🐍', rb: '💎', go: '🔵', rs: '🦀',
    json: '{}', yaml: '⚙️', yml: '⚙️', toml: '⚙️',
    html: '🌐', css: '🎨', svg: '🖼️',
    sh: '⌨️', bash: '⌨️', zsh: '⌨️',
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', webp: '🖼️',
  };
  return icons[ext] || '📄';
}

function renderTree(nodes, container, depth = 0) {
  if (!container) {
    container = fileTreeEl;
    container.innerHTML = '';
  }

  for (const node of nodes) {
    if (node.type === 'directory') {
      const dirEl = document.createElement('div');
      dirEl.className = 'tree-dir-group';

      const item = document.createElement('div');
      item.className = 'tree-item tree-dir';
      item.style.setProperty('--depth', depth);
      item.innerHTML = `
        <span class="tree-icon tree-chevron">▾</span>
        <span class="tree-icon">📁</span>
        <span class="tree-name">${escapeHtml(node.name)}</span>
      `;

      const children = document.createElement('div');
      children.className = 'tree-children';

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        item.classList.toggle('collapsed');
        children.classList.toggle('hidden');
      });

      dirEl.appendChild(item);
      dirEl.appendChild(children);
      container.appendChild(dirEl);

      if (node.children && node.children.length > 0) {
        renderTree(node.children, children, depth + 1);
      }
    } else {
      const item = document.createElement('div');
      item.className = 'tree-item tree-file';
      item.style.setProperty('--depth', depth);
      item.dataset.path = node.path;
      item.innerHTML = `
        <span class="tree-icon">${fileIcon(node.name)}</span>
        <span class="tree-name">${escapeHtml(node.name)}</span>
      `;

      item.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(node.path);
        sidebar.classList.remove('open');
      });

      container.appendChild(item);
    }
  }
}

function highlightActive(filePath) {
  document.querySelectorAll('.tree-item.active').forEach(el => el.classList.remove('active'));
  if (!filePath) return;
  const el = document.querySelector(`.tree-file[data-path="${CSS.escape(filePath)}"]`);
  if (el) {
    el.classList.add('active');
    el.scrollIntoView({ block: 'nearest' });
  }
}

// ── Navigation ──

async function navigateTo(filePath, pushState = true) {
  if (pushState) {
    history.pushState({ path: filePath }, '', '/view/' + filePath);
  }
  currentPath = filePath;
  highlightActive(filePath);
  await loadFile(filePath);
}

async function loadFile(filePath) {
  contentInner.innerHTML = '<div class="loading"></div>';

  try {
    const res = await fetch('/api/file?path=' + encodeURIComponent(filePath));
    if (!res.ok) {
      contentInner.innerHTML = `<div class="welcome"><h2>Error</h2><p>Could not load file: ${escapeHtml(filePath)}</p></div>`;
      return;
    }
    const data = await res.json();
    renderFile(filePath, data);
  } catch (err) {
    contentInner.innerHTML = `<div class="welcome"><h2>Error</h2><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function renderFile(filePath, data) {
  const pathHeader = `<div class="file-path-header">${escapeHtml(filePath)}</div>`;

  if (data.type === 'markdown') {
    document.title = `${data.title || filePath} — mdbrowse`;
    contentInner.innerHTML = pathHeader + `<div class="markdown-body">${data.html}</div>`;
  } else {
    document.title = `${filePath} — mdbrowse`;
    contentInner.innerHTML = pathHeader + `<div class="code-view">${data.html}</div>`;
  }

  // Initialize mermaid diagrams
  initMermaid();

  // Scroll to top
  document.getElementById('content').scrollTop = 0;
}

function initMermaid() {
  const blocks = contentInner.querySelectorAll(
    'code.language-mermaid, pre > code.language-mermaid'
  );

  if (blocks.length === 0) return;

  // Initialize mermaid with theme detection
  const isDark =
    document.documentElement.classList.contains('dark') ||
    (!document.documentElement.classList.contains('light') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
  });

  blocks.forEach((block, i) => {
    const pre = block.closest('pre') || block;
    const container = document.createElement('div');
    container.className = 'mermaid';
    container.textContent = block.textContent;
    pre.replaceWith(container);
  });

  mermaid.run();
}

// ── History API ──

window.addEventListener('popstate', (e) => {
  if (e.state && e.state.path) {
    navigateTo(e.state.path, false);
  } else {
    currentPath = null;
    highlightActive(null);
    showWelcome();
  }
});

function showWelcome() {
  document.title = 'mdbrowse';
  contentInner.innerHTML = `
    <div id="welcome">
      <h1>mdbrowse</h1>
      <p>Select a file from the sidebar to get started.</p>
    </div>
  `;
}

// ── WebSocket Live Reload ──

function connectWebSocket() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${location.host}/ws`);
  const statusEl = getOrCreateStatus();

  ws.addEventListener('open', () => {
    statusEl.textContent = 'Connected';
    statusEl.className = 'ws-status connected visible';
    setTimeout(() => statusEl.classList.remove('visible'), 1500);
  });

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === 'change' && currentPath === msg.path) {
      loadFile(msg.path);
    }

    if (msg.type === 'add' || msg.type === 'unlink') {
      fetchTree().then(() => {
        if (currentPath) highlightActive(currentPath);
      });
    }
  });

  ws.addEventListener('close', () => {
    statusEl.textContent = 'Reconnecting…';
    statusEl.className = 'ws-status visible';
    setTimeout(connectWebSocket, 2000);
  });

  ws.addEventListener('error', () => {
    ws.close();
  });
}

function getOrCreateStatus() {
  let el = document.querySelector('.ws-status');
  if (!el) {
    el = document.createElement('div');
    el.className = 'ws-status';
    document.body.appendChild(el);
  }
  return el;
}

// ── Helpers ──

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Init ──

async function init() {
  await fetchTree();

  // Check if URL has a /view/ path
  const viewMatch = location.pathname.match(/^\/view\/(.+)$/);
  if (viewMatch) {
    const filePath = decodeURIComponent(viewMatch[1]);
    await navigateTo(filePath, false);
    // Ensure parent directories are expanded
    expandToPath(filePath);
  } else {
    // Try to show README if it exists
    const readme = findReadme(treeData);
    if (readme) {
      await navigateTo(readme, true);
      expandToPath(readme);
    }
  }

  connectWebSocket();
}

function findReadme(nodes) {
  for (const node of nodes) {
    if (node.type === 'file' && /^readme\.md$/i.test(node.name)) {
      return node.path;
    }
  }
  return null;
}

function expandToPath(filePath) {
  // Expand each parent directory in the tree
  const parts = filePath.split('/');
  let pathSoFar = '';
  for (let i = 0; i < parts.length - 1; i++) {
    pathSoFar += (i > 0 ? '/' : '') + parts[i];
    // Find the directory item and make sure it's not collapsed
    const items = document.querySelectorAll('.tree-dir');
    for (const item of items) {
      const nameEl = item.querySelector('.tree-name');
      if (nameEl && item.classList.contains('collapsed')) {
        // Check if this is in the path by walking up
        const group = item.closest('.tree-dir-group');
        const children = group?.querySelector('.tree-children');
        if (children?.classList.contains('hidden')) {
          item.classList.remove('collapsed');
          children.classList.remove('hidden');
        }
      }
    }
  }
}

init();
