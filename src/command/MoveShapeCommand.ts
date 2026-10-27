import type { ArgumentList } from './ArgumentList';
import { CommandResult } from './CommandResult';
import type { Document } from '../domain/Document';
import { EditCommand } from './EditCommand';
import { NumberText } from '../shared/NumberText';
import type { Point } from '../shared/Point';
import type { Shape } from '../domain/Shape';

/**
 * `move <id> <dx> <dy>`：增量平移，作用于容器时递归到每个子孙（整体平移）。
 *
 * 撤销方式是参数逆运算（反向位移），不需要保存任何状态：
 * 递归平移可逆，浮点往返误差由 `NumberText` 的 6 位舍入吸收。
 */
export class MoveShapeCommand extends EditCommand {
  private shape: Shape | null = null;

  constructor(
    private readonly id: string,
    private readonly dx: number,
    private readonly dy: number,
  ) {
    super();
  }

  static fromArguments(argv: ArgumentList): MoveShapeCommand {
    const usage = 'move <id> <dx> <dy>';
    argv.ensureLength(3, 3, usage);
    return new MoveShapeCommand(
      argv.require(0, usage),
      argv.requireNumber(1, usage),
      argv.requireNumber(2, usage),
    );
  }

  protected override prepare(document: Document): void {
    this.shape = document.require(this.id);
  }

  protected override apply(): CommandResult {
    const shape = this.requireShape();
    shape.moveBy(this.dx, this.dy);
    return CommandResult.of(MoveShapeCommand.describe(shape, 'moved', this.dx, this.dy));
  }

  protected override revert(): CommandResult {
    const shape = this.requireShape();
    shape.moveBy(-this.dx, -this.dy);
    return CommandResult.of(MoveShapeCommand.describe(shape, 'moved back', -this.dx, -this.dy));
  }

  /**
   * 叶子有唯一定位点，回显"移动到了哪里"；容器没有，回显位移量。
   * 这个差异由多态（`anchor()` 返回 null）决定，而不是命令层判断类型。
   */
  private static describe(shape: Shape, verb: string, dx: number, dy: number): string {
    const anchor: Point | null = shape.anchor();
    if (anchor !== null) return `${shape.label} ${verb} to ${anchor}`;
    return `${shape.label} ${verb} by (${NumberText.format(dx)},${NumberText.format(dy)})`;
  }

  private requireShape(): Shape {
    if (this.shape === null) throw new Error('move command used before prepare');
    return this.shape;
  }
}
