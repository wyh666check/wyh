import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

import { CommandRegistry } from '../src/command/CommandRegistry';
import { CommandShell } from '../src/cli/CommandShell';
import { EditorSession } from '../src/session/EditorSession';
import { ShapeFactory } from '../src/domain/ShapeFactory';
import { SvgDocumentStore } from '../src/svgio/SvgDocumentStore';

function createShell(): CommandShell {
  return new CommandShell(
    new CommandRegistry(new ShapeFactory(), new SvgDocumentStore()),
    new EditorSession(),
  );
}

function tempPath(name: string): string {
  return join(mkdtempSync(join(tmpdir(), 'svg-editor-')), name).replace(/\\/g, '/');
}

test('round-trip：save → read → tree 与 save 字节完全一致', () => {
  const shell = createShell();
  for (const line of [
    'init 800 600',
    'create g flow',
    'create rect a 20 20 100 50 #4a90d9 in flow',
    'create text a-label 30 50 "开始 & 结束 <1>" in flow',
    'create circle c 200 45 20 in flow',
    'create ellipse e 300 45 30 20 in flow',
    'create line l 0 0 400 0 black in flow',
  ]) {
    shell.handleLine(line);
  }

  const first = tempPath('a.svg');
  const second = tempPath('b.svg');
  shell.handleLine(`save ${first}`);
  const treeBefore = shell.handleLine('tree');

  const readResult = shell.handleLine(`read ${first}`);
  assert.deepEqual(readResult, [`read ${first} (6 elements)`]);
  assert.deepEqual(shell.handleLine('tree'), treeBefore);

  shell.handleLine(`save ${second}`);
  assert.equal(readFileSync(second, 'utf8'), readFileSync(first, 'utf8'));
});

test('读入时把 g 上的 transform 烘焙成绝对坐标', () => {
  const shell = createShell();
  const source = tempPath('tf.svg');
  writeFileSync(
    source,
    [
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">',
      '  <g id="diagram" transform="translate(60,40)">',
      '    <rect id="a" x="0" y="0" width="120" height="60"/>',
      '  </g>',
      '</svg>',
    ].join('\n'),
    'utf8',
  );

  assert.deepEqual(shell.handleLine(`read ${source}`), [`read ${source} (2 elements)`]);
  assert.deepEqual(shell.handleLine('tree'), [
    'svg (400x200)',
    '└── g#diagram',
    '    └── rect#a     x=60 y=40 w=120 h=60',
  ]);
});

test('不支持的 transform 只告警，不影响其它元素', () => {
  const shell = createShell();
  const source = tempPath('bad.svg');
  writeFileSync(
    source,
    [
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">',
      '  <g id="g1" transform="rotate(45)">',
      '    <rect id="r1" x="1" y="2" width="3" height="4"/>',
      '  </g>',
      '</svg>',
    ].join('\n'),
    'utf8',
  );

  assert.deepEqual(shell.handleLine(`read ${source}`), [
    'warning: unsupported transform "rotate(45)" on g#g1, ignored',
    `read ${source} (2 elements)`,
  ]);
  assert.deepEqual(shell.handleLine('tree'), [
    'svg (100x100)',
    '└── g#g1',
    '    └── rect#r1  x=1 y=2 w=3 h=4',
  ]);
});

test('重复 id 与未知元素：改分配 / 跳过并告警', () => {
  const shell = createShell();
  const source = tempPath('dup.svg');
  writeFileSync(
    source,
    [
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">',
      '  <path d="M0 0 L1 1"/>',
      '  <rect id="dup" x="0" y="0" width="1" height="1"/>',
      '  <rect id="dup" x="2" y="0" width="1" height="1"/>',
      '</svg>',
    ].join('\n'),
    'utf8',
  );

  assert.deepEqual(shell.handleLine(`read ${source}`), [
    'warning: skipped unsupported element <path>',
    'warning: duplicate id dup, reassigned to rect1',
    `read ${source} (2 elements)`,
  ]);
});

test('缺省属性不写入文件：省略 fill 的图形遵循 SVG 默认值', () => {
  const shell = createShell();
  shell.handleLine('init 100 100');
  shell.handleLine('create circle c1 50 50 10');
  const target = tempPath('c.svg');
  shell.handleLine(`save ${target}`);
  const text = readFileSync(target, 'utf8');
  assert.match(text, /<circle id="c1" cx="50" cy="50" r="10"\/>/);
  assert.doesNotMatch(text, /fill=/);
});

test('set 撤销：原本不存在的属性被撤销后回到"未设置"', () => {
  const shell = createShell();
  shell.handleLine('init 100 100');
  shell.handleLine('create rect a 0 0 10 10');
  assert.deepEqual(shell.handleLine('set a fill red'), ['rect#a updated: fill=red']);
  assert.deepEqual(shell.handleLine('undo'), ['rect#a updated: fill=(unset)']);
  assert.deepEqual(shell.handleLine('show a'), [
    'rect#a  parent=svg',
    '  x=0 y=0 width=10 height=10',
  ]);
});
