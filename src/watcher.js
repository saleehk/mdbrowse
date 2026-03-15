import chokidar from 'chokidar';
import path from 'path';

/**
 * Start watching a directory for file changes.
 * Calls `broadcast(message)` whenever a file changes.
 */
export function startWatcher(rootDir, broadcast, respectIgnore = true) {
  const ignored = [
    '**/node_modules/**',
    '**/.git/**',
  ];

  const watcher = chokidar.watch(rootDir, {
    ignored,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  watcher.on('change', (filePath) => {
    const relativePath = path.relative(rootDir, filePath);
    broadcast({ type: 'change', path: relativePath });
  });

  watcher.on('add', (filePath) => {
    const relativePath = path.relative(rootDir, filePath);
    broadcast({ type: 'add', path: relativePath });
  });

  watcher.on('unlink', (filePath) => {
    const relativePath = path.relative(rootDir, filePath);
    broadcast({ type: 'unlink', path: relativePath });
  });

  return watcher;
}
