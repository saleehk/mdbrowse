import fs from 'fs';
import path from 'path';
import ignore from 'ignore';

/**
 * Build ignore filter by reading .gitignore files up the tree.
 */
export function buildIgnoreFilter(dirPath, rootDir) {
  const ig = ignore();
  // Always skip these
  ig.add(['node_modules', '.git']);

  // Walk from root to current dir, collecting .gitignore rules
  const relative = path.relative(rootDir, dirPath);
  const segments = relative ? relative.split(path.sep) : [];
  const dirs = [rootDir];
  let current = rootDir;
  for (const seg of segments) {
    current = path.join(current, seg);
    dirs.push(current);
  }

  for (const dir of dirs) {
    const gitignorePath = path.join(dir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      const prefix = path.relative(rootDir, dir);
      const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      if (prefix) {
        ig.add(lines.map(l => path.join(prefix, l)));
      } else {
        ig.add(lines);
      }
    }
  }

  return ig;
}

/**
 * Scan a directory recursively and return a tree structure.
 */
export function scanDirectory(rootDir, respectIgnore = true) {
  const ig = respectIgnore ? buildIgnoreFilter(rootDir, rootDir) : null;

  function scan(dirPath) {
    let entries;
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return [];
    }

    const results = [];

    // Sort: directories first, then alphabetical
    entries.sort((a, b) => {
      const aIsDir = a.isDirectory();
      const bIsDir = b.isDirectory();
      if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(rootDir, fullPath);

      // Always skip .git and node_modules
      if (entry.name === '.git' || entry.name === 'node_modules') continue;

      if (ig && ig.ignores(relativePath + (entry.isDirectory() ? '/' : ''))) {
        continue;
      }

      if (entry.isDirectory()) {
        const children = scan(fullPath);
        results.push({
          name: entry.name,
          path: relativePath,
          type: 'directory',
          children,
        });
      } else if (entry.isFile()) {
        results.push({
          name: entry.name,
          path: relativePath,
          type: 'file',
        });
      }
    }

    return results;
  }

  return scan(rootDir);
}
