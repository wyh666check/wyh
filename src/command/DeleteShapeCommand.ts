import type { ArgumentList } from './ArgumentList';
import { CommandResult } from './CommandResult';
import type { Container } from '../domain/Container';
import type { Document } from '../domain/Document';
import { EditCommand } from './EditCommand';
import type { Shape } from '../domain/Shape';

/**
 * `delete <id>`：删除图形，容器则连同全部子孙（Composite 语义）。
 *
 * undo 不是"重建一个长得一样的图形"，而是把**原对象**按原父容器、原下标插回去——
 * 这保证了子部件、z-order 与被外部引用的实例全部原样恢复。
 */
export class DeleteShapeCommand extends EditCommand {
  private shape: Shape | null = null;
  private parent: Container | null = null;
  private index = 0;

  constructor(private readonly id: string) {
    super();
  }

  static fromArguments(argv: ArgumentList): DeleteShapeCommand {
    const usage = 'delete <id>';
    argv.ensureLength(1, 1, usage);
    return new DeleteShapeCommand(argv.require(0, usage));
  }

  protected override prepare(document: Document): void {
    this.shape = document.require(this.id);
    this.parent = this.shape.parent;
    if (this.parent === null) throw new Error(`shape ${this.id} is not attached to any container`);
    this.index = this.parent.indexOf(this.shape);
  }

  protected override apply(): CommandResult {
    const shape = this.requireShape();
    this.requireParent().detach(shape);
    return CommandResult.of(`${shape.label} deleted`);
  }

  protected override revert(): CommandResult {
    const shape = this.requireShape();
    const parent = this.requireParent();
    parent.insertAt(shape, this.index);
    return CommandResult.of(`${shape.label} restored into ${parent.label}`);
  }

  private requireShape(): Shape {
    if (this.shape === null) throw new Error('delete command used before prepare');
    return this.shape;
  }

  private requireParent(): Container {
    if (this.parent === null) throw new Error('delete command used before prepare');
    return this.parent;
  }
}
