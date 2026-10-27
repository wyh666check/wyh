import type { ArgumentList } from './ArgumentList';
import { CommandError } from '../shared/CommandError';
import { CommandResult } from './CommandResult';
import type { Container } from '../domain/Container';
import type { Document } from '../domain/Document';
import { EditCommand } from './EditCommand';
import type { Shape } from '../domain/Shape';

/**
 * `ungroup <gid>`：解散容器，子图形提升到父级、占据原容器的位置。
 *
 * 与之对称的两条限制也在这里：
 * - 根级容器不允许 ungroup（否则"父子关系"在顶层就没有可提升的目标）；
 * - 复合图形（Phase 2 的 `box`）由插件拥有内部结构，`allowsUngroup()` 为 false。
 */
export class UngroupCommand extends EditCommand {
  private container: Container | null = null;
  private parent: Container | null = null;
  private index = 0;
  private children: ReadonlyArray<Shape> = [];

  constructor(private readonly gid: string) {
    super();
  }

  static fromArguments(argv: ArgumentList): UngroupCommand {
    const usage = 'ungroup <gid>';
    argv.ensureLength(1, 1, usage);
    return new UngroupCommand(argv.require(0, usage));
  }

  protected override prepare(document: Document): void {
    const shape = document.require(this.gid);
    if (!shape.isContainer) throw new CommandError(`not a container: ${this.gid}`);

    const container = shape as Container;
    if (!container.allowsUngroup()) {
      throw new CommandError(`cannot ungroup composite shape: ${this.gid}`);
    }
    const parent = container.parent;
    if (parent === null) throw new Error(`container ${this.gid} is not attached to any parent`);
    if (parent === document.canvasRoot) {
      throw new CommandError(`cannot ungroup top-level container: ${this.gid}`);
    }

    this.container = container;
    this.parent = parent;
    this.index = parent.indexOf(container);
    this.children = [...container.children];
  }

  protected override apply(): CommandResult {
    const container = this.requireContainer();
    const parent = this.requireParent();
    this.children.forEach((child, offset) => parent.insertAt(child, this.index + offset));
    parent.detach(container);
    return CommandResult.of(`${container.label} ungrouped (${this.children.length} children)`);
  }

  protected override revert(): CommandResult {
    const container = this.requireContainer();
    const parent = this.requireParent();
    parent.insertAt(container, this.index);
    for (const child of this.children) container.append(child);
    return CommandResult.of(`${container.label} regrouped with ${this.children.length} children`);
  }

  private requireContainer(): Container {
    if (this.container === null) throw new Error('ungroup command used before prepare');
    return this.container;
  }

  private requireParent(): Container {
    if (this.parent === null) throw new Error('ungroup command used before prepare');
    return this.parent;
  }
}
