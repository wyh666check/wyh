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

test('规范 4.2 错误文案：逐条对齐', () => {
  const shell = createShell();

  assert.deepEqual(shell.handleLine('tree'), ["error: no document. use 'init' or 'read' first"]);
  assert.deepEqual(shell.handleLine('undo'), ["error: no document. use 'init' or 'read' first"]);

  shell.handleLine('init 800 600');
  shell.handleLine('create g scene');
  shell.handleLine('create rect start 10 20 100 50 in scene');

  assert.deepEqual(shell.handleLine('create rect start 0 0 1 1'), [
    'error: id already exists: start',
  ]);
  assert.deepEqual(shell.handleLine('delete r9'), ['error: no such shape: r9']);
  assert.deepEqual(shell.handleLine('create rect r1 0 0 1 1 in node9'), [
    'error: no such container: node9',
  ]);
  assert.deepEqual(shell.handleLine('create rect r1 0 0 1 1 in start'), [
    'error: not a container: start',
  ]);
  assert.deepEqual(shell.handleLine('create hexagon h1 0 0 10'), [
    'error: unknown shape type: hexagon (is the plugin loaded?)',
  ]);
  assert.deepEqual(shell.handleLine('group inner scene start'), [
    'error: cannot group a container into its own descendant: scene',
  ]);
  assert.deepEqual(shell.handleLine('ungroup scene'), [
    'error: cannot ungroup top-level container: scene',
  ]);
  assert.deepEqual(shell.handleLine('scale start 0'), ['error: scale factor must be positive']);
  assert.deepEqual(shell.handleLine('scale start -2'), ['error: scale factor must be positive']);
  assert.deepEqual(shell.handleLine('read no-such-file.svg'), [
    'error: cannot read file: no-such-file.svg',
  ]);
  // 用已存在的目录当目标文件，必然写失败（EISDIR）
  const dir = mkdtempSync(join(tmpdir(), 'svg-editor-')).replace(/\\/g, '/');
  assert.deepEqual(shell.handleLine(`save ${dir}`), [`error: cannot write file: ${dir}`]);
  assert.deepEqual(shell.handleLine('ungroup start'), ['error: not a container: start']);
  assert.deepEqual(shell.handleLine('set start bogus 1'), ['error: unknown attribute: bogus']);
  assert.deepEqual(shell.handleLine('set start x abc'), ['error: invalid number: abc']);
  assert.deepEqual(shell.handleLine('nope'), [
    "error: unknown command: nope (type 'help' for commands)",
  ]);
  assert.deepEqual(shell.handleLine('create rect r1 0 0'), [
    'error: usage: create rect <id> <x> <y> <w> <h> [fill]',
  ]);
});

test('命令失败不改变任何状态', () => {
  const shell = createShell();
  shell.handleLine('init 400 300');
  shell.handleLine('create rect a 0 0 10 10 red');
  const before = shell.handleLine('tree');

  for (const failing of [
    'move a x 0',
    'set a width abc',
    'set a nope 1',
    'create rect a 1 1 1 1',
    'delete zz',
    'scale a 0',
    'ungroup a',
    'group g a zz',
    'addto a a',
  ]) {
    assert.match(shell.handleLine(failing)[0] ?? '', /^error: /, `${failing} 应当报错`);
  }

  assert.deepEqual(shell.handleLine('tree'), before);
});

test('注释行与空行不产生输出', () => {
  const shell = createShell();
  assert.deepEqual(shell.handleLine(''), []);
  assert.deepEqual(shell.handleLine('   '), []);
  assert.deepEqual(shell.handleLine('# 这是注释'), []);
  assert.deepEqual(shell.handleLine('   # 缩进的注释'), []);
  // 颜色值以 # 开头但不是整行注释
  shell.handleLine('init 100 100');
  assert.deepEqual(shell.handleLine('create rect r 0 0 5 5 #ff0000'), ['rect#r created']);
});
