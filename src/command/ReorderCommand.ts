import type { ArgumentList } from './ArgumentList';
import { CommandResult } from './CommandResult';
import type { Container } from '../domain/Container';
import type { Document } from '../domain/Document';
import { EditCommand } from './EditCommand';
import type { Shape } from '../domain/Shape';

/**
 * `front <id>` / `back <id>`：调整同级 z-order（同级最前 / 最后）。
 *
 * 两个命令共用一套实现：区别只在"插到末尾还是插到 0"，
 * 因此命令注册表里两条表项指向同一个类，不需要两份几乎相同的代码。
 */
export class ReorderCommand extends EditCommand {
  private shape: Shape | null = null;
  private parent: Container | null = null;
  private previousIndex = 0;

  constructor(
    private readonly id: string,
    private readonly mode: 'front' | 'back',
  ) {
    super();
  }

  static frontFromArguments(argv: ArgumentList): ReorderCommand {
    return ReorderCommand.fromArguments(argv, 'front');
  }

  static backFromArguments(argv: ArgumentList): ReorderCommand {
    return ReorderCommand.fromArguments(argv, 'back');
  }

  protected override prepare(document: Document): void {
    this.shape = document.require(this.id);
    const parent = this.shape.parent;
    if (parent === null) throw new Error(`shape ${this.id} is not attached to any container`);
    this.parent = parent;
    this.previousIndex = parent.indexOf(this.shape);
  }

  protected override apply(): CommandResult {
    const shape = this.requireShape();
    const parent = this.requireParent();
    parent.detach(shape);
    if (this.mode === 'front') {
      parent.append(shape);
    } else {
      parent.insertAt(shape, 0);
    }
    return CommandResult.of(`${shape.label} moved to ${this.mode}`);
  }

  protected override revert(): CommandResult {
    const shape = this.requireShape();
    const parent = this.requireParent();
    parent.detach(shape);
    parent.insertAt(shape, this.previousIndex);
    return CommandResult.of(
      `${shape.label} z-order restored to position ${String(this.previousIndex + 1)}`,
    );
  }

  private static fromArguments(argv: ArgumentList, mode: 'front' | 'back'): ReorderCommand {
    const usage = `${mode} <id>`;
    argv.ensureLength(1, 1, usage);
    return new ReorderCommand(argv.require(0, usage), mode);
  }

  private requireShape(): Shape {
    if (this.shape === null) throw new Error('z-order command used before prepare');
    return this.shape;
  }

  private requireParent(): Container {
    if (this.parent === null) throw new Error('z-order command used before prepare');
    return this.parent;
  }
}
