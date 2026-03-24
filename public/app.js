/* ── mdbrowse-cli client ── */

// ── Token handling (before anything else) ──

(function handleTokenFromUrl() {
  const params = new URLSearchParams(location.search);
  const urlToken = params.get('token');
  if (urlToken) {
    localStorage.setItem('mdbrowse-token', urlToken);
    // Clean URL: remove token param, keep others
    params.delete('token');
    const clean = params.toString();
    const newUrl = location.pathname + (clean ? '?' + clean : '') + location.hash;
    history.replaceState(null, '', newUrl);
  }
})();

function authHeaders() {
  const token = localStorage.getItem('mdbrowse-token');
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

function authFetch(url, options = {}) {
  const headers = { ...authHeaders(), ...(options.headers || {}) };
  return fetch(url, { ...options, headers }).then(res => {
    if (res.status === 401) {
      localStorage.removeItem('mdbrowse-token');
      window.location.href = '/login';
    }
    return res;
  });
}

const fileTreeEl = document.getElementById('file-tree');
const contentInner = document.getElementById('content-inner');
const themeToggle = document.getElementById('theme-toggle');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');

const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');

let currentPath = null;
let treeData = null;
let isReadOnly = true;
let isAuthEnabled = false;
let editMode = false;
let dirty = false;
let searchDebounceTimer = null;
let searchResultsEl = null;

const editBtn = document.getElementById('edit-btn');
const saveBtn = document.getElementById('save-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const logoutBtn = document.getElementById('logout-btn');

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp']);

function isImageFile(name) {
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  return IMAGE_EXTENSIONS.has(ext);
}

// ── Theme ──

function getTheme() {
  return localStorage.getItem('mdbrowse-cli-theme') || 'auto';
}

function applyTheme(theme) {
  document.documentElement.classList.remove('dark', 'light');
  if (theme !== 'auto') {
    document.documentElement.classList.add(theme);
  }
  localStorage.setItem('mdbrowse-cli-theme', theme);
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

const sidebarBackdrop = document.createElement('div');
sidebarBackdrop.className = 'sidebar-backdrop';
document.body.appendChild(sidebarBackdrop);

function toggleSidebar(open) {
  const isOpen = open !== undefined ? open : !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', isOpen);
  sidebarBackdrop.classList.toggle('visible', isOpen);
}

sidebarToggle.addEventListener('click', () => toggleSidebar());
sidebarBackdrop.addEventListener('click', () => toggleSidebar(false));

// Close sidebar when clicking content on mobile
document.getElementById('content').addEventListener('click', () => toggleSidebar(false));

// ── Sidebar Collapse (desktop) ──

const sidebarCollapseBtn = document.getElementById('sidebar-collapse-btn');
const appEl = document.getElementById('app');

function setSidebarCollapsed(collapsed) {
  appEl.classList.toggle('sidebar-collapsed', collapsed);
  localStorage.setItem('mdbrowse-sidebar', collapsed ? 'collapsed' : 'expanded');
}

// Restore sidebar state from localStorage
if (localStorage.getItem('mdbrowse-sidebar') === 'collapsed') {
  appEl.classList.add('sidebar-collapsed');
}

sidebarCollapseBtn.addEventListener('click', () => {
  setSidebarCollapsed(!appEl.classList.contains('sidebar-collapsed'));
});

// Ctrl+B: toggle sidebar collapse
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
    e.preventDefault();
    setSidebarCollapsed(!appEl.classList.contains('sidebar-collapsed'));
  }
});

// ── File Tree ──

async function fetchTree() {
  const res = await authFetch('/api/tree');
  if (!res.ok) return;
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
        toggleSidebar(false);
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
  contentInner.innerHTML = '<div class="loading-skeleton">' +
    '<div class="skeleton-line"></div>'.repeat(6) + '</div>';

  if (isImageFile(filePath)) {
    const src = '/raw/' + filePath.split('/').map(encodeURIComponent).join('/');
    renderFile(filePath, { type: 'image', src });
    return;
  }

  try {
    const res = await authFetch('/api/file?path=' + encodeURIComponent(filePath));
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
    document.title = `${filePath} — mdbrowse-cli`;
    const name = filePath.split('/').pop();
    contentInner.innerHTML = pathHeader + `<div class="image-preview"><img src="${data.src}" alt="${escapeHtml(name)}"></div>`;
  } else if (data.type === 'notice') {
    document.title = `${filePath} — mdbrowse-cli`;
    contentInner.innerHTML = pathHeader + `<div class="file-notice">${escapeHtml(data.message)}</div>`;
  } else if (data.type === 'markdown') {
    document.title = `${data.title || filePath} — mdbrowse-cli`;
    contentInner.innerHTML = pathHeader + `<div class="markdown-body">${data.html}</div>`;
  } else {
    document.title = `${filePath} — mdbrowse-cli`;
    contentInner.innerHTML = pathHeader + `<div class="code-view">${data.html}</div>`;
  }

  // Initialize mermaid diagrams
  initMermaid();

  // Add copy buttons to code blocks
  initCodeCopyButtons();

  // Build Table of Contents for markdown content
  initTableOfContents();

  // Set up heading anchor click handling
  initHeadingAnchors();

  // Show edit button if applicable
  showEditButton();

  // Scroll to hash or top
  const contentEl = document.getElementById('content');
  if (location.hash) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) {
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), 100);
    } else {
      contentEl.scrollTop = 0;
    }
  } else {
    contentEl.scrollTop = 0;
  }
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
    securityLevel: 'strict',
  });

  blocks.forEach((block, i) => {
    const pre = block.closest('pre') || block;
    const mermaidSource = block.textContent;

    // Create diagram container with toolbar
    const wrapper = document.createElement('div');
    wrapper.className = 'diagram-container';
    wrapper.dataset.mermaidSource = mermaidSource;

    const toolbar = document.createElement('div');
    toolbar.className = 'diagram-toolbar';

    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.textContent = '⛶ Fullscreen';
    fullscreenBtn.title = 'View fullscreen';
    fullscreenBtn.addEventListener('click', () => openDiagramModal(wrapper));

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.title = 'Copy Mermaid source';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(mermaidSource).then(() => {
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
          copyBtn.classList.remove('copied');
        }, 1500);
      });
    });

    toolbar.appendChild(fullscreenBtn);
    toolbar.appendChild(copyBtn);

    const mermaidDiv = document.createElement('div');
    mermaidDiv.className = 'mermaid';
    mermaidDiv.textContent = mermaidSource;

    wrapper.appendChild(toolbar);
    wrapper.appendChild(mermaidDiv);
    pre.replaceWith(wrapper);
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
  document.title = 'mdbrowse-cli';
  hideAllToolbarButtons();
  editMode = false;
  contentInner.innerHTML = `
    <div id="welcome">
      <h1>mdbrowse-cli</h1>
      <p>Select a file from the sidebar to get started.</p>
    </div>
  `;
}

// ── WebSocket Live Reload ──

function connectWebSocket() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const token = localStorage.getItem('mdbrowse-token');
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  const ws = new WebSocket(`${protocol}//${location.host}/ws${tokenParam}`);
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
    const res = await authFetch('/api/raw-content?path=' + encodeURIComponent(currentPath));
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
    const res = await authFetch('/api/file?path=' + encodeURIComponent(currentPath), {
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

// ── Logout ──

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('mdbrowse-token');
    window.location.href = '/login';
  });
}

// ── Search ──

function clearSearch() {
  searchInput.value = '';
  searchClear.style.display = 'none';
  if (searchResultsEl) {
    searchResultsEl.remove();
    searchResultsEl = null;
  }
  fileTreeEl.style.display = '';
}

function highlightMatch(text, query) {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts = [];
  let lastIndex = 0;
  let idx;
  while ((idx = lowerText.indexOf(lowerQuery, lastIndex)) !== -1) {
    if (idx > lastIndex) parts.push(escapeHtml(text.slice(lastIndex, idx)));
    parts.push('<mark>' + escapeHtml(text.slice(idx, idx + query.length)) + '</mark>');
    lastIndex = idx + query.length;
  }
  if (lastIndex < text.length) parts.push(escapeHtml(text.slice(lastIndex)));
  return parts.join('');
}

function renderSearchResults(data) {
  if (searchResultsEl) searchResultsEl.remove();
  fileTreeEl.style.display = 'none';

  searchResultsEl = document.createElement('div');
  searchResultsEl.className = 'search-results';

  if (data.results.length === 0) {
    searchResultsEl.innerHTML = `<div class="search-empty">No results for '${escapeHtml(data.query)}'</div>`;
    sidebar.appendChild(searchResultsEl);
    return;
  }

  for (const file of data.results) {
    const group = document.createElement('div');
    group.className = 'search-file-group';

    const header = document.createElement('div');
    header.className = 'search-file-header';
    header.innerHTML = `<span class="tree-icon">${fileIcon(file.name)}</span> ${escapeHtml(file.path)}`;
    header.addEventListener('click', () => {
      navigateTo(file.path);
      clearSearch();
      toggleSidebar(false);
    });
    group.appendChild(header);

    for (const match of file.matches) {
      const row = document.createElement('div');
      row.className = 'search-match';
      row.innerHTML = `<span class="search-line-num">${match.lineNumber}</span><span class="search-line-text">${highlightMatch(match.line, data.query)}</span>`;
      row.addEventListener('click', () => {
        navigateTo(file.path);
        clearSearch();
        toggleSidebar(false);
      });
      group.appendChild(row);
    }

    searchResultsEl.appendChild(group);
  }

  sidebar.appendChild(searchResultsEl);
}

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim();
  searchClear.style.display = query ? '' : 'none';
  clearTimeout(searchDebounceTimer);

  if (!query) {
    clearSearch();
    return;
  }

  searchDebounceTimer = setTimeout(async () => {
    try {
      const res = await authFetch('/api/search?q=' + encodeURIComponent(query));
      if (!res.ok) return;
      const data = await res.json();
      // Only render if input hasn't changed
      if (searchInput.value.trim() === query) {
        renderSearchResults(data);
      }
    } catch { /* ignore */ }
  }, 300);
});

searchClear.addEventListener('click', () => {
  clearSearch();
  searchInput.focus();
});

// Ctrl+K / Cmd+K to focus search (auto-expand sidebar if collapsed)
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    if (appEl.classList.contains('sidebar-collapsed')) {
      setSidebarCollapsed(false);
    }
    searchInput.focus();
    searchInput.select();
  }
});

// ── Code Block Copy Buttons ──

function initCodeCopyButtons() {
  const preBlocks = contentInner.querySelectorAll('pre');
  preBlocks.forEach((pre) => {
    // Skip if already wrapped
    if (pre.parentElement?.classList.contains('code-block-wrapper')) return;
    // Skip mermaid blocks
    if (pre.querySelector('code.language-mermaid')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', () => {
      const code = pre.querySelector('code');
      const text = code ? code.textContent : pre.textContent;
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = '✓ Copied';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 1500);
      });
    });
    wrapper.appendChild(btn);
  });
}

// ── Heading Anchors (client-side click handling) ──

function initHeadingAnchors() {
  contentInner.querySelectorAll('.heading-anchor').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const hash = anchor.getAttribute('href');
      history.replaceState(null, '', location.pathname + hash);
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// ── Table of Contents ──

const tocBtn = document.getElementById('toc-btn');
const tocPanel = document.getElementById('toc-panel');
const tocList = document.getElementById('toc-list');
const tocClose = document.getElementById('toc-close');
let tocObserver = null;

function initTableOfContents() {
  // Clean up previous observer
  if (tocObserver) {
    tocObserver.disconnect();
    tocObserver = null;
  }
  tocList.innerHTML = '';
  tocBtn.style.display = 'none';
  tocPanel.style.display = 'none';

  const headings = contentInner.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
  if (headings.length < 2) return;

  tocBtn.style.display = '';

  headings.forEach((heading) => {
    const entry = document.createElement('a');
    entry.className = 'toc-entry';
    entry.dataset.level = heading.tagName[1];
    entry.dataset.target = heading.id;
    entry.textContent = heading.textContent.trim();
    entry.addEventListener('click', (e) => {
      e.preventDefault();
      history.replaceState(null, '', location.pathname + '#' + heading.id);
      heading.scrollIntoView({ behavior: 'smooth' });
      tocPanel.style.display = 'none';
    });
    tocList.appendChild(entry);
  });

  // Intersection observer to highlight current heading
  tocObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          tocList.querySelectorAll('.toc-entry.active').forEach((el) => el.classList.remove('active'));
          const tocEntry = tocList.querySelector(`.toc-entry[data-target="${entry.target.id}"]`);
          if (tocEntry) tocEntry.classList.add('active');
        }
      });
    },
    { rootMargin: '0px 0px -70% 0px', threshold: 0.1 }
  );

  headings.forEach((heading) => tocObserver.observe(heading));
}

tocBtn.addEventListener('click', () => {
  const isVisible = tocPanel.style.display !== 'none';
  tocPanel.style.display = isVisible ? 'none' : '';
});

tocClose.addEventListener('click', () => {
  tocPanel.style.display = 'none';
});

// Close ToC when clicking outside
document.addEventListener('click', (e) => {
  if (tocPanel.style.display !== 'none' && !tocPanel.contains(e.target) && e.target !== tocBtn) {
    tocPanel.style.display = 'none';
  }
});

// ── Diagram Fullscreen Modal ──

const diagramModal = document.getElementById('diagram-modal');
const diagramModalSvg = document.getElementById('diagram-modal-svg');
let diagramZoom = 1;
let diagramPanX = 0;
let diagramPanY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

function openDiagramModal(container) {
  const svgEl = container.querySelector('svg');
  if (!svgEl) return;
  diagramModalSvg.innerHTML = svgEl.outerHTML;
  diagramZoom = 1;
  diagramPanX = 0;
  diagramPanY = 0;
  updateDiagramTransform();
  diagramModal.style.display = '';
  document.body.style.overflow = 'hidden';
}

function closeDiagramModal() {
  diagramModal.style.display = 'none';
  diagramModalSvg.innerHTML = '';
  document.body.style.overflow = '';
}

function updateDiagramTransform() {
  diagramModalSvg.style.transform = `scale(${diagramZoom}) translate(${diagramPanX}px, ${diagramPanY}px)`;
}

// Modal close
diagramModal.querySelector('.diagram-modal-backdrop').addEventListener('click', closeDiagramModal);
diagramModal.querySelector('.diagram-modal-close').addEventListener('click', closeDiagramModal);

// Zoom buttons
diagramModal.querySelectorAll('.diagram-zoom-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    if (action === 'zoom-in') {
      diagramZoom = Math.min(5, diagramZoom * 1.3);
    } else if (action === 'zoom-out') {
      diagramZoom = Math.max(0.5, diagramZoom / 1.3);
    } else if (action === 'zoom-reset') {
      diagramZoom = 1;
      diagramPanX = 0;
      diagramPanY = 0;
    }
    updateDiagramTransform();
  });
});

// Mouse wheel zoom
diagramModal.querySelector('.diagram-modal-viewport').addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  diagramZoom = Math.max(0.5, Math.min(5, diagramZoom * delta));
  updateDiagramTransform();
}, { passive: false });

// Drag to pan
const viewport = diagramModal.querySelector('.diagram-modal-viewport');
viewport.addEventListener('mousedown', (e) => {
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = (e.clientX - dragStartX) / diagramZoom;
  const dy = (e.clientY - dragStartY) / diagramZoom;
  diagramPanX += dx;
  diagramPanY += dy;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  updateDiagramTransform();
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

// Double-click to reset zoom/pan
viewport.addEventListener('dblclick', () => {
  diagramZoom = 1;
  diagramPanX = 0;
  diagramPanY = 0;
  updateDiagramTransform();
});

// Esc to close modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && diagramModal.style.display !== 'none') {
    closeDiagramModal();
  }
});

// ── Init ──

async function init() {
  // Fetch config to determine read-only status and auth
  try {
    const res = await authFetch('/api/config');
    if (!res.ok) return;
    const config = await res.json();
    isReadOnly = config.readOnly;
    isAuthEnabled = config.auth;
  } catch {
    isReadOnly = true;
  }

  // Show/hide logout button based on auth state
  if (logoutBtn) {
    logoutBtn.style.display = isAuthEnabled ? '' : 'none';
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
