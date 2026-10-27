import { mkdtempSync } from 'node:fs';
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

function tempFile(name: string): string {
  return join(mkdtempSync(join(tmpdir(), 'svg-editor-')), name).replace(/\\/g, '/');
}

test('group 是一个 undo 单元：一次 undo 还原全部成员与顺序', () => {
  const shell = createShell();
  for (const line of [
    'init 400 300',
    'create rect a 0 0 10 10',
    'create rect b 20 0 10 10',
    'create rect c 40 0 10 10',
  ]) {
    shell.handleLine(line);
  }
  shell.handleLine('front a'); // 根级顺序变为 b, c, a
  const before = shell.handleLine('tree');

  assert.deepEqual(shell.handleLine('group g1 b c'), ['g#g1 created with 2 children']);
  assert.deepEqual(shell.handleLine('tree'), [
    'svg (400x300)',
    '├── g#g1',
    '│   ├── rect#b  x=20 y=0 w=10 h=10',
    '│   └── rect#c  x=40 y=0 w=10 h=10',
    '└── rect#a  x=0 y=0 w=10 h=10',
  ]);

  assert.deepEqual(shell.handleLine('undo'), ['g#g1 ungrouped (2 children)']);
  assert.deepEqual(shell.handleLine('tree'), before);
});

test('ungroup / addto / front / back 均可撤销，且还原原始位置', () => {
  const shell = createShell();
  for (const line of [
    'init 400 300',
    'create g outer',
    'create rect a 0 0 10 10 in outer',
    'create rect b 20 0 10 10 in outer',
    'create rect c 40 0 10 10 in outer',
  ]) {
    shell.handleLine(line);
  }
  const initial = shell.handleLine('tree');

  assert.deepEqual(shell.handleLine('group g1 b c'), ['g#g1 created with 2 children']);
  const grouped = shell.handleLine('tree');

  assert.deepEqual(shell.handleLine('addto g1 a'), ['rect#a added to g#g1']);
  assert.deepEqual(shell.handleLine('undo'), ['rect#a restored into g#outer']);
  assert.deepEqual(shell.handleLine('tree'), grouped);

  assert.deepEqual(shell.handleLine('ungroup g1'), ['g#g1 ungrouped (2 children)']);
  assert.deepEqual(shell.handleLine('tree'), initial);
  assert.deepEqual(shell.handleLine('undo'), ['g#g1 regrouped with 2 children']);
  assert.deepEqual(shell.handleLine('tree'), grouped);

  assert.deepEqual(shell.handleLine('front b'), ['rect#b moved to front']);
  assert.deepEqual(shell.handleLine('undo'), ['rect#b z-order restored to position 1']);
  assert.deepEqual(shell.handleLine('tree'), grouped);
});

test('删除容器后 undo 恢复整棵子树', () => {
  const shell = createShell();
  for (const line of [
    'init 400 300',
    'create g node1',
    'create rect r1 10 10 20 20 in node1',
    'create text t1 12 25 "hi" in node1',
  ]) {
    shell.handleLine(line);
  }
  const before = shell.handleLine('tree');

  assert.deepEqual(shell.handleLine('delete node1'), ['g#node1 deleted']);
  assert.deepEqual(shell.handleLine('tree'), ['svg (400x300)']);

  assert.deepEqual(shell.handleLine('undo'), ['g#node1 restored into svg']);
  assert.deepEqual(shell.handleLine('tree'), before);
});

test('undo 之后发生新编辑，redo 栈被清空', () => {
  const shell = createShell();
  shell.handleLine('init 100 100');
  shell.handleLine('create rect a 0 0 10 10');

  assert.deepEqual(shell.handleLine('undo'), ['rect#a removed']);
  assert.deepEqual(shell.handleLine('create rect b 0 0 5 5'), ['rect#b created']);
  assert.deepEqual(shell.handleLine('redo'), ['error: nothing to redo']);
});

test('空历史与 io 锁定', () => {
  const shell = createShell();
  shell.handleLine('init 100 100');
  assert.deepEqual(shell.handleLine('undo'), ['error: nothing to undo']);
  assert.deepEqual(shell.handleLine('redo'), ['error: nothing to redo']);

  const file = tempFile('a.svg');
  shell.handleLine('create rect a 0 0 10 10');
  shell.handleLine(`save ${file}`);

  assert.deepEqual(shell.handleLine('undo'), ['error: undo not allowed after io command']);
  assert.deepEqual(shell.handleLine('redo'), ['error: redo not allowed after io command']);

  // 下一次编辑命令重新解禁
  assert.deepEqual(shell.handleLine('move a 1 1'), ['rect#a moved to (1,1)']);
  assert.deepEqual(shell.handleLine('undo'), ['rect#a moved back to (0,0)']);
});

test('init / read 换文档后历史整体失效', () => {
  const shell = createShell();
  shell.handleLine('init 100 100');
  shell.handleLine('create rect a 0 0 10 10');
  assert.deepEqual(shell.handleLine('init 200 200'), ['canvas 200x200 created']);
  assert.deepEqual(shell.handleLine('undo'), ['error: nothing to undo']);
  assert.deepEqual(shell.handleLine('tree'), ['svg (200x200)']);
});

test('redo 会重新施加同一条命令', () => {
  const shell = createShell();
  shell.handleLine('init 100 100');
  shell.handleLine('create rect a 2 4 10 10');
  shell.handleLine('scale a 2');

  assert.deepEqual(shell.handleLine('undo'), ['rect#a scaled back by 2']);
  assert.deepEqual(shell.handleLine('tree'), ['svg (100x100)', '└── rect#a  x=2 y=4 w=10 h=10']);
  assert.deepEqual(shell.handleLine('redo'), ['rect#a scaled by 2']);
  assert.deepEqual(shell.handleLine('tree'), ['svg (100x100)', '└── rect#a  x=4 y=8 w=20 h=20']);
});
