import { Arguments } from '../shared/Arguments';
import { CommandError } from '../shared/CommandError';
import { GeometryField } from './GeometryField';
import { Point } from '../shared/Point';
import { Shape } from './Shape';
import { SvgElement } from '../shared/SvgElement';

/** 线段 `<line>`：没有面积，`fill` 无意义，因此外观参数是 `stroke`。 */
export class Line extends Shape {
  override readonly typeName = 'line';

  private x1Value: number;
  private y1Value: number;
  private x2Value: number;
  private y2Value: number;

  constructor(id: string, x1: number, y1: number, x2: number, y2: number) {
    super(id);
    this.x1Value = x1;
    this.y1Value = y1;
    this.x2Value = x2;
    this.y2Value = y2;
  }

  static fromArguments(id: string, args: ReadonlyArray<string>): Line {
    const usage = 'create line <id> <x1> <y1> <x2> <y2> [stroke]';
    if (args.length < 4 || args.length > 5) throw new CommandError(`usage: ${usage}`);
    const values = Arguments.of(args);
    const line = new Line(
      id,
      values.number(0, usage),
      values.number(1, usage),
      values.number(2, usage),
      values.number(3, usage),
    );
    const stroke = values.at(4);
    if (stroke !== undefined) line.writeAttribute('stroke', stroke);
    return line;
  }

  override moveBy(dx: number, dy: number): void {
    this.x1Value += dx;
    this.y1Value += dy;
    this.x2Value += dx;
    this.y2Value += dy;
  }

  override scaleBy(factor: number): void {
    this.x1Value *= factor;
    this.y1Value *= factor;
    this.x2Value *= factor;
    this.y2Value *= factor;
  }

  override anchor(): Point {
    return new Point(this.x1Value, this.y1Value);
  }

  /** tree 上连线更适合显示成 `(x1,y1) -> (x2,y2)` 而不是四个属性（外观留给 `show`）。 */
  override summary(): string {
    const start = new Point(this.x1Value, this.y1Value);
    const end = new Point(this.x2Value, this.y2Value);
    return `${start} -> ${end}`;
  }

  override toElement(): SvgElement {
    return SvgElement.leaf('line', this.serializedAttributes());
  }

  protected override geometryFields(): ReadonlyArray<GeometryField> {
    return [
      new GeometryField('x1', () => this.x1Value, (value) => (this.x1Value = value)),
      new GeometryField('y1', () => this.y1Value, (value) => (this.y1Value = value)),
      new GeometryField('x2', () => this.x2Value, (value) => (this.x2Value = value)),
      new GeometryField('y2', () => this.y2Value, (value) => (this.y2Value = value)),
    ];
  }
}
