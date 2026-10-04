const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Filter out problematic Node.js built-in modules that don't exist on Windows
const problematicModules = new Set([
  'node:sea',
  'sea',
  'node:sqlite',
  'node:sqlite3',
  'sqlite',
  'sqlite3',
  'node:fs',
  'node:fs/promises',
  'node:path',
  'node:os',
  'node:crypto',
  'node:stream',
  'node:util',
  'node:events',
  'node:buffer',
  'node:querystring',
  'node:url',
  'node:zlib',
  'node:http',
  'node:https',
  'node:net',
  'node:tls',
  'node:child_process',
  'node:cluster',
  'node:dgram',
  'node:dns',
  'node:readline',
  'node:repl',
  'node:tty',
  'node:vm',
  'node:worker_threads',
]);

// Override the resolver to exclude problematic modules
config.resolver = {
  ...config.resolver,
  blockList: (() => {
    const { blockList } = require('metro-config');
    return blockList([
      // Block problematic node: modules
      /node_modules\/@expo\/cli\/.*\/metro\/externals/,
    ]);
  })(),
  unstable_enablePackageExports: false,
};

// Custom transformer to skip node: modules
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
};

module.exports = config;