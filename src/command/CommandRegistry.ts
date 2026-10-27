import { AddToCommand } from './AddToCommand';
import { CanvasCommand } from './CanvasCommand';
import { CommandSpec } from './CommandSpec';
import { CreateShapeCommand } from './CreateShapeCommand';
import { DeleteShapeCommand } from './DeleteShapeCommand';
import { GroupShapesCommand } from './GroupShapesCommand';
import { HelpCommand } from './HelpCommand';
import { InitCommand } from './InitCommand';
import { MoveShapeCommand } from './MoveShapeCommand';
import { ReadCommand } from './ReadCommand';
import { RedoCommand } from './RedoCommand';
import { ReorderCommand } from './ReorderCommand';
import { SaveCommand } from './SaveCommand';
import { ScaleShapeCommand } from './ScaleShapeCommand';
import { SetAttributeCommand } from './SetAttributeCommand';
import { ShowCommand } from './ShowCommand';
import type { ShapeFactory } from '../domain/ShapeFactory';
import type { SvgDocumentStore } from '../svgio/SvgDocumentStore';
import { TreeCommand } from './TreeCommand';
import { UndoCommand } from './UndoCommand';
import { UngroupCommand } from './UngroupCommand';

/**
 * 命令注册表：命令名 → CommandSpec。
 *
 * 两条依赖从外部注入（`ShapeFactory`、`SvgDocumentStore`），因此注册表本身无状态、
 * 可在测试里替换；同时它也是 `help` 的唯一数据源。
 *
 * 待重构（已记入架构方案）：`build` 仍靠 `new` 直接构造具体命令类，
 * Phase 2 若要做"命令插件"，把这里换成运行时可注册的 CommandProvider 即可。
 */
export class CommandRegistry {
  private readonly specs = new Map<string, CommandSpec>();

  constructor(factory: ShapeFactory, store: SvgDocumentStore) {
    this.register(
      new CommandSpec('init', 'document', 'init [w] [h]', '新建空画布（默认 800×600）', InitCommand.fromArguments),
    );
    this.register(
      new CommandSpec('read', 'document', 'read <file.svg>', '读入 SVG 文件；缺 id 自动补全并告警', (argv) =>
        ReadCommand.fromArguments(argv, store),
      ),
    );
    this.register(
      new CommandSpec('save', 'document', 'save [file.svg]', '保存文档；省略路径时写回读入路径', (argv) =>
        SaveCommand.fromArguments(argv, store),
      ),
    );
    this.register(
      new CommandSpec('canvas', 'document', 'canvas [w] [h]', '查看 / 修改画布尺寸', CanvasCommand.fromArguments),
    );

    this.register(
      new CommandSpec(
        'create',
        'edit',
        'create <type> <id> [params...] [in <containerId>]',
        '创建图形（rect/circle/ellipse/line/text/g）',
        (argv) => CreateShapeCommand.fromArguments(argv, factory),
      ),
    );
    this.register(
      new CommandSpec('delete', 'edit', 'delete <id>', '删除图形（容器连同全部子孙）', DeleteShapeCommand.fromArguments),
    );
    this.register(
      new CommandSpec('move', 'edit', 'move <id> <dx> <dy>', '增量平移；作用于容器时整体平移', MoveShapeCommand.fromArguments),
    );
    this.register(
      new CommandSpec('scale', 'edit', 'scale <id> <factor>', '等比缩放；作用于容器时递归子孙', ScaleShapeCommand.fromArguments),
    );
    this.register(
      new CommandSpec('set', 'edit', 'set <id> <attr> <value>', '设置属性（白名单见文档）', SetAttributeCommand.fromArguments),
    );
    this.register(
      new CommandSpec('group', 'edit', 'group <newGid> <id1> <id2>...', '新建容器并收编已有图形', GroupShapesCommand.fromArguments),
    );
    this.register(new CommandSpec('ungroup', 'edit', 'ungroup <gid>', '解散容器，子图形提升一级', UngroupCommand.fromArguments));
    this.register(new CommandSpec('addto', 'edit', 'addto <gid> <id>', '把已有图形移入容器', AddToCommand.fromArguments));
    this.register(new CommandSpec('front', 'edit', 'front <id>', '移到同级最前', ReorderCommand.frontFromArguments));
    this.register(new CommandSpec('back', 'edit', 'back <id>', '移到同级最后', ReorderCommand.backFromArguments));

    this.register(new CommandSpec('tree', 'query', 'tree [id]', '结构树（内联关键几何属性）', TreeCommand.fromArguments));
    this.register(new CommandSpec('show', 'query', 'show <id>', '单个图形的属性明细', ShowCommand.fromArguments));
    this.register(
      new CommandSpec('help', 'query', 'help', '显示全部命令与语法', (argv) => HelpCommand.create(argv, this)),
    );

    this.register(new CommandSpec('undo', 'history', 'undo', '撤销上一次编辑', UndoCommand.fromArguments));
    this.register(new CommandSpec('redo', 'history', 'redo', '重做', RedoCommand.fromArguments));
  }

  find(name: string): CommandSpec | undefined {
    return this.specs.get(name);
  }

  has(name: string): boolean {
    return this.specs.has(name);
  }

  list(): ReadonlyArray<CommandSpec> {
    return [...this.specs.values()];
  }

  private register(spec: CommandSpec): void {
    if (this.specs.has(spec.name)) throw new Error(`command already registered: ${spec.name}`);
    this.specs.set(spec.name, spec);
  }
}
