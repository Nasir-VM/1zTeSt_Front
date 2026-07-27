#!/usr/bin/env node
const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');

const OBFUSCATION_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.4,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
  debugProtection: true,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
  target: 'browser'
};

function findHtmlFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findHtmlFiles(full));
    } else if (entry.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

function obfuscateInlineScripts(html) {
  const scriptRegex = /(<script[^>]*>)([\s\S]*?)(<\/script>)/gi;
  let match;
  const segments = [];
  let lastIndex = 0;

  while ((match = scriptRegex.exec(html)) !== null) {
    const tagOpen = match[1];
    if (tagOpen.includes(' src=') || tagOpen.includes('http')) {
      continue;
    }
    const scriptContent = match[2];
    if (!scriptContent.trim()) continue;

    segments.push({ start: match.index, end: match.index + match[0].length, tagOpen, content: scriptContent, tagClose: match[3] });
  }

  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    try {
      const result = JavaScriptObfuscator.obfuscate(seg.content, OBFUSCATION_OPTIONS);
      const obfuscated = result.getObfuscatedCode();
      html = html.substring(0, seg.start) + seg.tagOpen + obfuscated + seg.tagClose + html.substring(seg.end);
    } catch (e) {
      console.warn(`  Skipped script block: ${e.message.substring(0, 80)}`);
    }
  }
  return html;
}

function main() {
  const files = findHtmlFiles(DIST);
  console.log(`Found ${files.length} HTML files to process`);
  let count = 0;
  for (const file of files) {
    const html = fs.readFileSync(file, 'utf-8');
    const obfuscated = obfuscateInlineScripts(html);
    if (obfuscated !== html) {
      fs.writeFileSync(file, obfuscated);
      count++;
      console.log(`  Obfuscated: ${path.relative(DIST, file)}`);
    }
  }
  console.log(`Done. Obfuscated ${count}/${files.length} files.`);
}

main();
