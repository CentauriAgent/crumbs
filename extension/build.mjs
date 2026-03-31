import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, existsSync } from 'fs';

const watch = process.argv.includes('--watch');

// Ensure dist exists
mkdirSync('dist/icons', { recursive: true });

// Copy static files
const staticFiles = ['manifest.json', 'popup.html', 'options.html'];
for (const f of staticFiles) {
  if (existsSync(`src/${f}`)) cpSync(`src/${f}`, `dist/${f}`);
}
// Copy icons
if (existsSync('src/icons')) {
  cpSync('src/icons', 'dist/icons', { recursive: true });
}

const buildOptions = {
  entryPoints: [
    'src/popup.js',
    'src/options.js',
    'src/background.js',
    'src/content.js',
  ],
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  target: 'chrome120',
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  define: {
    'process.env.NODE_ENV': watch ? '"development"' : '"production"',
  },
};

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(buildOptions);
  console.log('Build complete → dist/');
}
