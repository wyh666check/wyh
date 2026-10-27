#!/usr/bin/env node
/**
 * 架构约束的自动校验（对应 doc/README.md 的「依赖方向规则」与「一类一文件」）。
 *
 * 为什么要有这个脚本：分层一旦只写在文档里，几周后就会被人（或 AI）顺手绕过。
 * 把它变成可执行的门槛后，"违反规则的依赖即为待处理项"不再依赖人眼。
 *
 * 规则（只允许向下依赖，箭头表示"可以依赖"）：
 *   cli → session → command → { presentation, svgio } → domain → shared
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const srcDir = join(root, 'src');

const ALLOWED = {
  shared: [],
  domain: ['shared'],
  presentation: ['domain', 'shared'],
  svgio: ['domain', 'shared'],
  command: ['domain', 'presentation', 'shared', 'svgio'],
  session: ['command', 'domain', 'shared'],
  cli: ['command', 'domain', 'presentation', 'session', 'shared', 'svgio'],
};

/** 同一个类文件内的窄类型/接口也允许与被校验的文件同名。 */
const DECLARATION = /(?:class|interface|type|enum)\s+([A-Za-z0-9_]+)/g;

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (entry.endsWith('.ts')) files.push(full);
  }
  return files;
}

function moduleOf(file) {
  const parts = relative(srcDir, file).split(/[\\/]/);
  return parts.length > 1 ? parts[0] : null;
}

const violations = [];
const files = walk(srcDir).sort();

for (const file of files) {
  const ownModule = moduleOf(file);
  const text = readFileSync(file, 'utf8');
  const ownBase = file.slice(file.lastIndexOf('\\') + 1).replace(/\.ts$/, '').split('/').pop();

  // 1) 一类一文件：文件主名必须是被声明的类型名之一
  const declared = new Set([...text.matchAll(DECLARATION)].map((match) => match[1]));
  if (!declared.has(ownBase)) {
    violations.push(
      `${relative(root, file)}: 文件名与类/接口/类型名不一致（声明有 ${[...declared].join(', ') || '无'}）`,
    );
  }

  // 2) 依赖方向
  for (const match of text.matchAll(/from\s+'([^']+)'/g)) {
    const spec = match[1];
    if (!spec.startsWith('.')) continue; // Node 内置或第三方依赖不参与分层校验
    const target = resolve(dirname(file), spec);
    const targetModule = moduleOf(target);
    if (targetModule === null || targetModule === ownModule) continue;
    const allowed = ALLOWED[ownModule] ?? [];
    if (!allowed.includes(targetModule)) {
      violations.push(`${relative(root, file)}: ${ownModule} 不允许依赖 ${targetModule}（${spec}）`);
    }
  }
}

if (violations.length > 0) {
  console.error(`✗ 架构校验失败，共 ${violations.length} 处：`);
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exit(1);
}

console.log(`✓ 架构校验通过：${files.length} 个源文件，模块依赖方向与命名约定均符合方案。`);
