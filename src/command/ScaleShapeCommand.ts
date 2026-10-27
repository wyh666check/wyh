import type { ArgumentList } from './ArgumentList';
import { CommandError } from '../shared/CommandError';
import { CommandResult } from './CommandResult';
import type { Document } from '../domain/Document';
import { EditCommand } from './EditCommand';
import { NumberText } from '../shared/NumberText';
import type { Shape } from '../domain/Shape';

/**
 * `scale <id> <factor>`：等比缩放，`factor` 同乘到图形的全部几何属性（位置与尺寸）。
 *
 * 语义就是"所有坐标乘以 factor"（相对画布原点），不是围绕图形中心缩放；
 * 作用于容器时递归到每个子孙——因此"整体缩放一组图形"与"逐个缩放"结果等价。
 */
export class ScaleShapeCommand extends EditCommand {
  private shape: Shape | null = null;

  constructor(
    private readonly id: string,
    private readonly factor: number,
  ) {
    super();
  }

  static fromArguments(argv: ArgumentList): ScaleShapeCommand {
    const usage = 'scale <id> <factor>';
    argv.ensureLength(2, 2, usage);
    return new ScaleShapeCommand(argv.require(0, usage), argv.requireNumber(1, usage));
  }

  protected override prepare(document: Document): void {
    if (!(this.factor > 0)) throw new CommandError('scale factor must be positive');
    this.shape = document.require(this.id);
  }

  protected override apply(): CommandResult {
    const shape = this.requireShape();
    shape.scaleBy(this.factor);
    return CommandResult.of(`${shape.label} scaled by ${NumberText.format(this.factor)}`);
  }

  protected override revert(): CommandResult {
    const shape = this.requireShape();
    shape.scaleBy(1 / this.factor);
    return CommandResult.of(`${shape.label} scaled back by ${NumberText.format(this.factor)}`);
  }

  private requireShape(): Shape {
    if (this.shape === null) throw new Error('scale command used before prepare');
    return this.shape;
  }
}
