const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src');
function walk(dir, files=[]) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (/\.jsx?$/.test(f)) files.push(p);
  });
  return files;
}

const files = walk(srcDir);
const issues = [];
files.forEach(file => {
  const src = fs.readFileSync(file, 'utf8');
  const importNames = new Set();
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['\"]([^'\"]+)['\"]/g;
  let m;
  while ((m = importRegex.exec(src)) !== null) {
    m[1].split(',').map(s => s.trim().split(' as ')[0]).forEach(n => importNames.add(n));
  }
  const defaultImportRegex = /import\s+([A-Za-z0-9_]+)\s+from\s+['\"]([^'\"]+)['\"]/g;
  while ((m = defaultImportRegex.exec(src)) !== null) {
    importNames.add(m[1]);
  }
  const definedNames = new Set();
  const defRegex = /(?:function|const|let|var|class)\s+([A-Z][A-Za-z0-9_]*)/g;
  while ((m = defRegex.exec(src)) !== null) {
    definedNames.add(m[1]);
  }
  const jsxTagRegex = /<\s*([A-Z][A-Za-z0-9_]*)/g;
  while ((m = jsxTagRegex.exec(src)) !== null) {
    const name = m[1];
    if (!importNames.has(name) && !definedNames.has(name) && name !== 'Logo' && name !== 'LiveClock') {
      issues.push({ file: path.relative(root, file), name });
    }
  }
});
if (issues.length === 0) {
  console.log('No obvious missing imports found');
} else {
  console.log('Potential missing imports (file : tagName)');
  issues.forEach(i => console.log(i.file + ' : ' + i.name));
}
