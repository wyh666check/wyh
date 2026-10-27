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

/** 每个测试用独立临时目录，避免互相污染。 */
function tempPath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'svg-editor-'));
  return join(dir, name).replace(/\\/g, '/');
}

test('规范第 6 节 transcript：基本会话逐条对齐', () => {
  const shell = createShell();

  assert.deepEqual(shell.handleLine('init 800 600'), ['canvas 800x600 created']);
  assert.deepEqual(shell.handleLine('create rect bg 0 0 800 600 #ffffff'), ['rect#bg created']);
  assert.deepEqual(shell.handleLine('create text title 20 40 "My Diagram"'), [
    'text#title created',
  ]);
  assert.deepEqual(shell.handleLine('create circle c1 100 100 20 red'), ['circle#c1 created']);
  assert.deepEqual(shell.handleLine('create rect box 200 80 60 60 #3366ff'), ['rect#box created']);
  assert.deepEqual(shell.handleLine('group markers c1 box'), [
    'g#markers created with 2 children',
  ]);

  assert.deepEqual(shell.handleLine('move c1 30 0'), ['circle#c1 moved to (130,100)']);
  assert.deepEqual(shell.handleLine('undo'), ['circle#c1 moved back to (100,100)']);
  assert.deepEqual(shell.handleLine('redo'), ['circle#c1 moved to (130,100)']);

  assert.deepEqual(shell.handleLine('set title text "My Diagram v2"'), [
    'text#title updated: text="My Diagram v2"',
  ]);
  assert.deepEqual(shell.handleLine('undo'), ['text#title updated: text="My Diagram"']);

  assert.deepEqual(shell.handleLine('group bad c1 markers'), [
    'error: cannot group a container into its own descendant: markers',
  ]);
  assert.deepEqual(shell.handleLine('delete box'), ['rect#box deleted']);
  assert.deepEqual(shell.handleLine('undo'), ['rect#box restored into g#markers']);

  const target = tempPath('demo.svg');
  assert.deepEqual(shell.handleLine(`save ${target}`), [`saved to ${target} (5 elements)`]);
  assert.deepEqual(shell.handleLine('undo'), ['error: undo not allowed after io command']);
});

test('树形显示：结构 + 内联几何属性 + show 明细', () => {
  const shell = createShell();
  for (const line of [
    'init 800 600',
    'create rect bg 0 0 800 600 #ffffff',
    'create text title 20 40 "My Diagram"',
    'create circle c1 100 100 20 red',
    'create rect box 200 80 60 60 #3366ff',
    'group markers c1 box',
  ]) {
    shell.handleLine(line);
  }

  assert.deepEqual(shell.handleLine('tree'), [
    'svg (800x600)',
    '├── rect#bg     x=0 y=0 w=800 h=600 fill=#ffffff',
    '├── text#title  (20,40) "My Diagram"',
    '└── g#markers',
    '    ├── circle#c1   cx=100 cy=100 r=20 fill=red',
    '    └── rect#box    x=200 y=80 w=60 h=60 fill=#3366ff',
  ]);

  assert.deepEqual(shell.handleLine('show c1'), [
    'circle#c1  parent=g#markers',
    '  cx=100 cy=100 r=20',
    '  fill=red',
  ]);
});

test('规范 6.1：用 in 子句自顶向下构建流程图，容器移动整体生效', () => {
  const shell = createShell();
  assert.deepEqual(shell.handleLine('init 800 600'), ['canvas 800x600 created']);
  assert.deepEqual(shell.handleLine('create g flowchart'), ['g#flowchart created']);
  assert.deepEqual(shell.handleLine('create g node1 in flowchart'), [
    'g#node1 created in g#flowchart',
  ]);
  assert.deepEqual(shell.handleLine('create rect start 120 100 160 60 #4a90d9 in node1'), [
    'rect#start created in g#node1',
  ]);
  assert.deepEqual(shell.handleLine('create text start-label 155 135 "开始" in node1'), [
    'text#start-label created in g#node1',
  ]);
  shell.handleLine('create g node2 in flowchart');
  shell.handleLine('create rect process 520 100 160 60 #f5a623 in node2');
  shell.handleLine('create text process-label 545 135 "处理数据" in node2');
  assert.deepEqual(shell.handleLine('create line arrow1 280 130 520 130 black in flowchart'), [
    'line#arrow1 created in g#flowchart',
  ]);

  assert.deepEqual(shell.handleLine('tree'), [
    'svg (800x600)',
    '└── g#flowchart',
    '    ├── g#node1',
    '    │   ├── rect#start          x=120 y=100 w=160 h=60 fill=#4a90d9',
    '    │   └── text#start-label    (155,135) "开始"',
    '    ├── g#node2',
    '    │   ├── rect#process        x=520 y=100 w=160 h=60 fill=#f5a623',
    '    │   └── text#process-label  (545,135) "处理数据"',
    '    └── line#arrow1         (280,130) -> (520,130)',
  ]);

  assert.deepEqual(shell.handleLine('move node2 0 100'), ['g#node2 moved by (0,100)']);
  assert.deepEqual(shell.handleLine('undo'), ['g#node2 moved back by (0,-100)']);
  assert.deepEqual(shell.handleLine('tree node1'), [
    'g#node1',
    '├── rect#start        x=120 y=100 w=160 h=60 fill=#4a90d9',
    '└── text#start-label  (155,135) "开始"',
  ]);
});

test('规范第 6 节：read 外部文件并补齐缺失 id', () => {
  const shell = createShell();
  const source = tempPath('other.svg');
  writeFileSync(
    source,
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">',
      '  <rect x="0" y="0" width="400" height="300" fill="#ffffff"/>',
      '  <text id="t1" x="10" y="290">imported</text>',
      '  <circle id="c1" cx="50" cy="50" r="10"/>',
      '  <g id="g1">',
      '    <rect id="r2" x="0" y="0" width="10" height="10"/>',
      '    <circle id="c2" cx="5" cy="5" r="2"/>',
      '  </g>',
      '  <ellipse id="e1" cx="1" cy="2" rx="3" ry="4"/>',
      '</svg>',
    ].join('\n'),
    'utf8',
  );

  assert.deepEqual(shell.handleLine(`read ${source}`), [
    'warning: assigned id rect1 to unnamed <rect>',
    `read ${source} (7 elements)`,
  ]);

  assert.deepEqual(shell.handleLine('tree'), [
    'svg (400x300)',
    '├── rect#rect1  x=0 y=0 w=400 h=300 fill=#ffffff',
    '├── text#t1     (10,290) "imported"',
    '├── circle#c1   cx=50 cy=50 r=10',
    '├── g#g1',
    '│   ├── rect#r2     x=0 y=0 w=10 h=10',
    '│   └── circle#c2   cx=5 cy=5 r=2',
    '└── ellipse#e1  cx=1 cy=2 rx=3 ry=4',
  ]);
});

test('保存输出的 SVG 片段与规范格式一致', () => {
  const shell = createShell();
  for (const line of [
    'init 400 200',
    'create rect start 30 70 120 60 #4a90d9',
    'create line edge 150 100 250 100 black',
    'create rect end 250 70 120 60 #f5a623',
  ]) {
    shell.handleLine(line);
  }
  const target = tempPath('flow.svg');
  shell.handleLine(`save ${target}`);

  assert.equal(
    readFileSync(target, 'utf8'),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">',
      '  <rect id="start" x="30" y="70" width="120" height="60" fill="#4a90d9"/>',
      '  <line id="edge" x1="150" y1="100" x2="250" y2="100" stroke="black"/>',
      '  <rect id="end" x="250" y="70" width="120" height="60" fill="#f5a623"/>',
      '</svg>',
      '',
    ].join('\n'),
  );
});
