/* ── mdbrowse client ── */

const fileTreeEl = document.getElementById('file-tree');
const contentInner = document.getElementById('content-inner');
const themeToggle = document.getElementById('theme-toggle');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');

let currentPath = null;
let treeData = null;
let isReadOnly = true;
let editMode = false;
let dirty = false;

const editBtn = document.getElementById('edit-btn');
const saveBtn = document.getElementById('save-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp']);

function isImageFile(name) {
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  return IMAGE_EXTENSIONS.has(ext);
}

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
  editMode = false;
  hideAllToolbarButtons();
  currentPath = filePath;
  highlightActive(filePath);
  await loadFile(filePath);
}

async function loadFile(filePath) {
  contentInner.innerHTML = '<div class="loading"></div>';

  if (isImageFile(filePath)) {
    const src = '/raw/' + filePath.split('/').map(encodeURIComponent).join('/');
    renderFile(filePath, { type: 'image', src });
    return;
  }

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

  if (data.type === 'image') {
    document.title = `${filePath} — mdbrowse`;
    const name = filePath.split('/').pop();
    contentInner.innerHTML = pathHeader + `<div class="image-preview"><img src="${data.src}" alt="${escapeHtml(name)}"></div>`;
  } else if (data.type === 'notice') {
    document.title = `${filePath} — mdbrowse`;
    contentInner.innerHTML = pathHeader + `<div class="file-notice">${escapeHtml(data.message)}</div>`;
  } else if (data.type === 'markdown') {
    document.title = `${data.title || filePath} — mdbrowse`;
    contentInner.innerHTML = pathHeader + `<div class="markdown-body">${data.html}</div>`;
  } else {
    document.title = `${filePath} — mdbrowse`;
    contentInner.innerHTML = pathHeader + `<div class="code-view">${data.html}</div>`;
  }

  // Initialize mermaid diagrams
  initMermaid();

  // Show edit button if applicable
  showEditButton();

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
  hideAllToolbarButtons();
  editMode = false;
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

// ── Edit Mode ──

function isEditableFile(filePath) {
  if (!filePath) return false;
  if (isImageFile(filePath)) return false;
  const ext = filePath.includes('.') ? filePath.split('.').pop().toLowerCase() : '';
  const binaryExts = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'tiff', 'tif',
    'mp3', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'wav', 'ogg',
    'zip', 'tar', 'gz', 'bz2', '7z', 'rar', 'xz',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'woff', 'woff2', 'ttf', 'otf', 'eot',
    'exe', 'dll', 'so', 'dylib', 'o', 'a',
    'class', 'pyc', 'pyo', 'sqlite', 'db',
  ]);
  return !binaryExts.has(ext);
}

function showEditButton() {
  if (!isReadOnly && currentPath && isEditableFile(currentPath) && !editMode) {
    editBtn.style.display = '';
  } else {
    editBtn.style.display = 'none';
  }
}

function hideAllToolbarButtons() {
  editBtn.style.display = 'none';
  saveBtn.style.display = 'none';
  cancelEditBtn.style.display = 'none';
}

async function enterEditMode() {
  if (!currentPath) return;
  editMode = true;
  editBtn.style.display = 'none';
  saveBtn.style.display = '';
  cancelEditBtn.style.display = '';

  try {
    const res = await fetch('/api/raw-content?path=' + encodeURIComponent(currentPath));
    if (!res.ok) {
      exitEditMode();
      return;
    }
    const rawText = await res.text();
    const pathHeader = `<div class="file-path-header">${escapeHtml(currentPath)}</div>`;
    contentInner.innerHTML = pathHeader + '<textarea id="editor"></textarea>';
    const editor = document.getElementById('editor');
    editor.value = rawText;
    dirty = false;
    saveBtn.classList.remove('unsaved');
    autoResizeTextarea(editor);
    editor.addEventListener('input', () => {
      dirty = true;
      saveBtn.classList.add('unsaved');
      autoResizeTextarea(editor);
    });
    editor.addEventListener('keydown', handleTabKey);
  } catch {
    exitEditMode();
  }
}

function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

function handleTabKey(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + 2;
    textarea.dispatchEvent(new Event('input'));
  }
}

async function saveFile() {
  const editor = document.getElementById('editor');
  if (!editor || !currentPath) return;

  saveBtn.disabled = true;
  saveBtn.textContent = '⏳ Saving…';

  try {
    const res = await fetch('/api/file?path=' + encodeURIComponent(currentPath), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: editor.value,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert('Save failed: ' + (data.error || res.statusText));
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Save';
      return;
    }

    dirty = false;
    saveBtn.classList.remove('unsaved');
    editMode = false;
    hideAllToolbarButtons();
    await loadFile(currentPath);
    showEditButton();

    // Brief success indicator
    const status = getOrCreateStatus();
    status.textContent = 'Saved';
    status.className = 'ws-status connected visible';
    setTimeout(() => status.classList.remove('visible'), 1500);
  } catch (err) {
    alert('Save failed: ' + err.message);
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Save';
  }
}

async function exitEditMode() {
  dirty = false;
  saveBtn.classList.remove('unsaved');
  editMode = false;
  hideAllToolbarButtons();
  if (currentPath) {
    await loadFile(currentPath);
    showEditButton();
  }
}

editBtn.addEventListener('click', enterEditMode);
saveBtn.addEventListener('click', saveFile);
cancelEditBtn.addEventListener('click', exitEditMode);

// Ctrl+S / Cmd+S to save
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (editMode) saveFile();
  }
});

// Unsaved changes warning
window.addEventListener('beforeunload', (e) => {
  if (dirty) e.preventDefault();
});

// ── Init ──

async function init() {
  // Fetch config to determine read-only status
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    isReadOnly = config.readOnly;
  } catch {
    isReadOnly = true;
  }

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
