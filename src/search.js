import fs from 'fs';
import path from 'path';
import { buildIgnoreFilter } from './scanner.js';

const MAX_FILES = 50;
const MAX_MATCHES_PER_FILE = 5;
const BINARY_CHECK_SIZE = 8192;

function isBinary(absPath) {
  let fd;
  try {
    fd = fs.openSync(absPath, 'r');
    const buf = Buffer.alloc(BINARY_CHECK_SIZE);
    const bytesRead = fs.readSync(fd, buf, 0, BINARY_CHECK_SIZE, 0);
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 0) return true;
    }
    return false;
  } catch {
    return true;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function collectFiles(dirPath, rootDir, ig) {
  const files = [];

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;

      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);

      if (ig && ig.ignores(relativePath + (entry.isDirectory() ? '/' : ''))) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        files.push({ name: entry.name, path: relativePath, absPath: fullPath });
      }
    }
  }

  walk(dirPath);
  return files;
}

export async function search(rootDir, query, respectIgnore = true) {
  const lowerQuery = query.toLowerCase();
  const ig = respectIgnore ? buildIgnoreFilter(rootDir, rootDir) : null;
  const files = collectFiles(rootDir, rootDir, ig);

  const results = [];

  for (const file of files) {
    if (results.length >= MAX_FILES) break;

    const nameMatch = file.name.toLowerCase().includes(lowerQuery);

    if (isBinary(file.absPath)) {
      if (nameMatch) {
        results.push({ path: file.path, name: file.name, matches: [] });
      }
      continue;
    }

    let content;
    try {
      content = fs.readFileSync(file.absPath, 'utf-8');
    } catch {
      if (nameMatch) {
        results.push({ path: file.path, name: file.name, matches: [] });
      }
      continue;
    }

    const lines = content.split('\n');
    const matches = [];

    for (let i = 0; i < lines.length && matches.length < MAX_MATCHES_PER_FILE; i++) {
      if (lines[i].toLowerCase().includes(lowerQuery)) {
        const before = i > 0 ? lines[i - 1] : '';
        const after = i < lines.length - 1 ? lines[i + 1] : '';
        const contextParts = [];
        if (i > 0) contextParts.push(before);
        contextParts.push(lines[i]);
        if (i < lines.length - 1) contextParts.push(after);

        matches.push({
          line: lines[i],
          lineNumber: i + 1,
          context: contextParts.join('\n'),
        });
      }
    }

    if (nameMatch || matches.length > 0) {
      results.push({ path: file.path, name: file.name, matches });
    }
  }

  return {
    results,
    query,
    totalFiles: results.length,
  };
}
