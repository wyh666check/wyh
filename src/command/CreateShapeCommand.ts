import type { ArgumentList } from './ArgumentList';
import { CommandError } from '../shared/CommandError';
import { CommandResult } from './CommandResult';
import type { Container } from '../domain/Container';
import type { Document } from '../domain/Document';
import { EditCommand } from './EditCommand';
import type { Shape } from '../domain/Shape';
import type { ShapeFactory } from '../domain/ShapeFactory';

/**
 * `create <type> <id> [params…] [in <containerId>]`
 *
 * 归属关系在**创建时**就表达（`in`），与"事后收编"（group）、"移动归属"（addto）
 * 一起覆盖三种真实时机。图形实例在 `prepare` 阶段构造一次并保留，
 * 因此 undo→redo 拿到的是同一个对象，不会产生 id 相同但状态不同的"幽灵图形"。
 */
export class CreateShapeCommand extends EditCommand {
  private shape: Shape | null = null;
  private parent: Container | null = null;

  constructor(
    private readonly factory: ShapeFactory,
    private readonly type: string,
    private readonly id: string,
    private readonly params: ReadonlyArray<string>,
    private readonly containerId: string | null,
  ) {
    super();
  }

  static fromArguments(argv: ArgumentList, factory: ShapeFactory): CreateShapeCommand {
    const usage = 'create <type> <id> [params...] [in <containerId>]';
    const type = argv.require(0, usage);
    const id = argv.require(1, usage);

    const inIndex = argv.indexOfKeyword('in', 2);
    const containerId = inIndex < 0 ? null : argv.require(inIndex + 1, usage);
    const params = argv.valuesBetween(2, inIndex < 0 ? argv.length : inIndex);
    if (inIndex >= 0 && inIndex + 2 !== argv.length) throw new CommandError(`usage: ${usage}`);

    return new CreateShapeCommand(factory, type, id, params, containerId);
  }

  protected override prepare(document: Document): void {
    if (!this.factory.has(this.type)) {
      throw new CommandError(`unknown shape type: ${this.type} (is the plugin loaded?)`);
    }
    if (document.find(this.id) !== undefined) {
      throw new CommandError(`id already exists: ${this.id}`);
    }
    this.parent =
      this.containerId === null
        ? document.canvasRoot
        : document.requireInsertTarget(this.containerId);
    this.shape = this.factory.create(this.type, this.id, this.params);
  }

  protected override apply(): CommandResult {
    const shape = this.requireShape();
    const parent = this.requireParent();
    parent.append(shape);
    return CommandResult.of(
      this.containerId === null
        ? `${shape.label} created`
        : `${shape.label} created in ${parent.label}`,
    );
  }

  protected override revert(): CommandResult {
    const shape = this.requireShape();
    this.requireParent().detach(shape);
    return CommandResult.of(`${shape.label} removed`);
  }

  private requireShape(): Shape {
    if (this.shape === null) throw new Error('create command used before prepare');
    return this.shape;
  }

  private requireParent(): Container {
    if (this.parent === null) throw new Error('create command used before prepare');
    return this.parent;
  }
}
