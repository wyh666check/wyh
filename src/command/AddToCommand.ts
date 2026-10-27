import type { ArgumentList } from './ArgumentList';
import { CommandError } from '../shared/CommandError';
import { CommandResult } from './CommandResult';
import type { Container } from '../domain/Container';
import type { Document } from '../domain/Document';
import { EditCommand } from './EditCommand';
import type { Shape } from '../domain/Shape';

/**
 * `addto <gid> <id>`：把已有图形移入容器（作为最后一个子节点）。
 *
 * 与 `group` 的区别是"不新建容器、只改归属"，因此 undo 只需把图形插回原位置。
 * 防环检查与 `group` 同源：把容器移进自己的子孙会让树变成环。
 */
export class AddToCommand extends EditCommand {
  private shape: Shape | null = null;
  private target: Container | null = null;
  private previousParent: Container | null = null;
  private previousIndex = 0;

  constructor(
    private readonly gid: string,
    private readonly id: string,
  ) {
    super();
  }

  static fromArguments(argv: ArgumentList): AddToCommand {
    const usage = 'addto <gid> <id>';
    argv.ensureLength(2, 2, usage);
    return new AddToCommand(argv.require(0, usage), argv.require(1, usage));
  }

  protected override prepare(document: Document): void {
    const target = document.requireContainer(this.gid);
    const shape = document.require(this.id);

    if (shape === target) throw new CommandError(`cannot add a container into itself: ${this.id}`);
    if (shape.isAncestorOf(target)) {
      throw new CommandError(`cannot add a container into its own descendant: ${this.id}`);
    }

    const parent = shape.parent;
    if (parent === null) throw new Error(`shape ${this.id} is not attached to any container`);

    this.target = target;
    this.shape = shape;
    this.previousParent = parent;
    this.previousIndex = parent.indexOf(shape);
  }

  protected override apply(): CommandResult {
    const shape = this.requireShape();
    const target = this.requireTarget();
    target.append(shape);
    return CommandResult.of(`${shape.label} added to ${target.label}`);
  }

  protected override revert(): CommandResult {
    const shape = this.requireShape();
    const parent = this.requirePreviousParent();
    parent.insertAt(shape, this.previousIndex);
    return CommandResult.of(`${shape.label} restored into ${parent.label}`);
  }

  private requireShape(): Shape {
    if (this.shape === null) throw new Error('addto command used before prepare');
    return this.shape;
  }

  private requireTarget(): Container {
    if (this.target === null) throw new Error('addto command used before prepare');
    return this.target;
  }

  private requirePreviousParent(): Container {
    if (this.previousParent === null) throw new Error('addto command used before prepare');
    return this.previousParent;
  }
}
