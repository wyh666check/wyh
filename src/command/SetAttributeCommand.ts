import type { ArgumentList } from './ArgumentList';
import { CommandError } from '../shared/CommandError';
import { CommandResult } from './CommandResult';
import type { Document } from '../domain/Document';
import { EditCommand } from './EditCommand';
import type { Shape } from '../domain/Shape';

/**
 * `set <id> <attr> <value>`：设置属性。
 *
 * 白名单由图形自己回答（`acceptsAttribute`）：`fill`/`stroke`/`stroke-width` 加上
 * 各自的几何属性，text 元素额外允许 `text`。白名单外一律 `unknown attribute: <attr>`。
 *
 * undo 保存的是**旧值原文**（不存在则为 `undefined`），所以"设置一个原本没有的
 * `fill`"撤销后会回到"没有 fill"，而不是"fill 为空串"——这两种状态在 SVG 里不等价。
 */
export class SetAttributeCommand extends EditCommand {
  private shape: Shape | null = null;
  private previous: string | undefined;

  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly value: string,
  ) {
    super();
  }

  static fromArguments(argv: ArgumentList): SetAttributeCommand {
    const usage = 'set <id> <attr> <value>';
    if (argv.length < 3) throw new CommandError(`usage: ${usage}`);
    return new SetAttributeCommand(
      argv.require(0, usage),
      argv.require(1, usage),
      argv.joinedFrom(2),
    );
  }

  protected override prepare(document: Document): void {
    this.shape = document.require(this.id);
    if (!this.shape.acceptsAttribute(this.name)) {
      throw new CommandError(`unknown attribute: ${this.name}`);
    }
    this.previous = this.shape.readAttribute(this.name);
  }

  protected override apply(): CommandResult {
    const shape = this.requireShape();
    shape.writeAttribute(this.name, this.value);
    return CommandResult.of(
      `${shape.label} updated: ${this.name}=${shape.presentValue(this.name, this.value)}`,
    );
  }

  protected override revert(): CommandResult {
    const shape = this.requireShape();
    const restored = this.previous;
    if (restored === undefined) {
      shape.clearAttribute(this.name);
      return CommandResult.of(`${shape.label} updated: ${this.name}=(unset)`);
    }
    shape.writeAttribute(this.name, restored);
    return CommandResult.of(
      `${shape.label} updated: ${this.name}=${shape.presentValue(this.name, restored)}`,
    );
  }

  private requireShape(): Shape {
    if (this.shape === null) throw new Error('set command used before prepare');
    return this.shape;
  }
}
