import path from 'path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkHtml from 'remark-html';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import matter from 'gray-matter';
import { createHighlighter } from 'shiki';

let highlighterPromise = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: [
        'javascript', 'typescript', 'python', 'rust', 'go', 'java',
        'c', 'cpp', 'csharp', 'ruby', 'php', 'swift', 'kotlin',
        'html', 'css', 'json', 'yaml', 'toml', 'xml', 'sql',
        'bash', 'shell', 'markdown', 'dockerfile', 'graphql',
        'lua', 'r', 'scala', 'haskell', 'elixir', 'zig',
      ],
    });
  }
  return highlighterPromise;
}

// Map file extensions to shiki language IDs
const EXT_TO_LANG = {
  '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.ts': 'typescript', '.tsx': 'typescript', '.jsx': 'javascript',
  '.py': 'python', '.rs': 'rust', '.go': 'go', '.java': 'java',
  '.c': 'c', '.h': 'c', '.cpp': 'cpp', '.hpp': 'cpp', '.cc': 'cpp',
  '.cs': 'csharp', '.rb': 'ruby', '.php': 'php', '.swift': 'swift',
  '.kt': 'kotlin', '.kts': 'kotlin',
  '.html': 'html', '.htm': 'html', '.css': 'css',
  '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml',
  '.toml': 'toml', '.xml': 'xml', '.svg': 'xml',
  '.sql': 'sql', '.sh': 'bash', '.bash': 'bash', '.zsh': 'bash',
  '.md': 'markdown', '.mdx': 'markdown',
  '.dockerfile': 'dockerfile', '.graphql': 'graphql', '.gql': 'graphql',
  '.lua': 'lua', '.r': 'r', '.scala': 'scala',
  '.hs': 'haskell', '.ex': 'elixir', '.exs': 'elixir', '.zig': 'zig',
};

function detectLanguage(filePath) {
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return EXT_TO_LANG[ext] || null;
}

/**
 * Render markdown content to HTML.
 */
export async function renderMarkdown(content, filePath) {
  const { data: frontmatter, content: body } = matter(content);
  const highlighter = await getHighlighter();

  // Build the remark pipeline
  // We use remark-html which outputs an HTML string directly,
  // then do a second pass for math with rehype
  const remarkResult = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkHtml, { sanitize: false })
    .process(body);

  let html = String(remarkResult);

  // Highlight code blocks in the HTML
  // Match <code class="language-xxx">...</code> blocks
  html = html.replace(
    /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
    (match, lang, code) => {
      // Decode HTML entities
      const decoded = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      try {
        return highlighter.codeToHtml(decoded, {
          lang,
          themes: { dark: 'github-dark', light: 'github-light' },
        });
      } catch {
        return match;
      }
    }
  );

  // Handle KaTeX rendering for math blocks
  // remark-math + remark-html produces <span class="math math-inline"> and <div class="math math-display">
  // We need rehype-katex for proper rendering, but since we used remark-html directly,
  // we handle math with a second pass
  const mathInlineRegex = /<code class="language-math math-inline">([\s\S]*?)<\/code>/g;
  const mathDisplayRegex = /<code class="language-math math-display">([\s\S]*?)<\/code>/g;

  // For now, leave math as-is — KaTeX CSS + auto-render will handle it client-side
  // The remark-math plugin wraps math in appropriate classes

  // Rewrite relative image URLs to /raw/ paths
  const fileDir = path.posix.dirname(filePath);
  html = html.replace(/<img([^>]*?)src="([^"]*?)"([^>]*?)>/gi, (match, before, src, after) => {
    if (/^(https?:\/\/|\/\/|data:)/.test(src)) return match;
    const resolved = path.posix.normalize(path.posix.join(fileDir, src));
    return `<img${before}src="/raw/${resolved}"${after}>`;
  });

  // Extract title from frontmatter or first heading
  let title = frontmatter?.title;
  if (!title) {
    const headingMatch = body.match(/^#\s+(.+)$/m);
    if (headingMatch) title = headingMatch[1];
  }

  // Build frontmatter HTML block
  let frontmatterHtml = '';
  if (Object.keys(frontmatter).length > 0) {
    frontmatterHtml = '<div class="frontmatter"><table>';
    for (const [key, value] of Object.entries(frontmatter)) {
      frontmatterHtml += `<tr><td class="fm-key">${escapeHtml(key)}</td><td class="fm-value">${escapeHtml(String(value))}</td></tr>`;
    }
    frontmatterHtml += '</table></div>';
  }

  return {
    html: frontmatterHtml + html,
    frontmatter,
    title: title || filePath.split('/').pop(),
  };
}

/**
 * Render a non-markdown file with syntax highlighting.
 */
export async function renderCode(content, filePath) {
  const highlighter = await getHighlighter();
  const language = detectLanguage(filePath);

  if (language) {
    try {
      const html = highlighter.codeToHtml(content, {
        lang: language,
        themes: { dark: 'github-dark', light: 'github-light' },
      });
      return { html, language };
    } catch {
      // Fall through to plain text
    }
  }

  // Plain text fallback
  return {
    html: `<pre><code>${escapeHtml(content)}</code></pre>`,
    language: 'text',
  };
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
