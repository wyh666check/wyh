import { Arguments } from '../shared/Arguments';
import { CommandError } from '../shared/CommandError';
import { GeometryField } from './GeometryField';
import { Point } from '../shared/Point';
import { Shape } from './Shape';
import { SvgElement } from '../shared/SvgElement';

/** 矩形 `<rect>`。 */
export class Rect extends Shape {
  override readonly typeName = 'rect';

  private xValue: number;
  private yValue: number;
  private widthValue: number;
  private heightValue: number;

  constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id);
    this.xValue = x;
    this.yValue = y;
    this.widthValue = width;
    this.heightValue = height;
  }

  static fromArguments(id: string, args: ReadonlyArray<string>): Rect {
    const usage = 'create rect <id> <x> <y> <w> <h> [fill]';
    if (args.length < 4 || args.length > 5) throw new CommandError(`usage: ${usage}`);
    const values = Arguments.of(args);
    const rect = new Rect(
      id,
      values.number(0, usage),
      values.number(1, usage),
      values.number(2, usage),
      values.number(3, usage),
    );
    const fill = values.at(4);
    if (fill !== undefined) rect.writeAttribute('fill', fill);
    return rect;
  }

  override moveBy(dx: number, dy: number): void {
    this.xValue += dx;
    this.yValue += dy;
  }

  override scaleBy(factor: number): void {
    this.xValue *= factor;
    this.yValue *= factor;
    this.widthValue *= factor;
    this.heightValue *= factor;
  }

  override anchor(): Point {
    return new Point(this.xValue, this.yValue);
  }

  override toElement(): SvgElement {
    return SvgElement.leaf('rect', this.serializedAttributes());
  }

  protected override geometryFields(): ReadonlyArray<GeometryField> {
    return [
      new GeometryField('x', () => this.xValue, (value) => (this.xValue = value)),
      new GeometryField('y', () => this.yValue, (value) => (this.yValue = value)),
      new GeometryField('width', () => this.widthValue, (value) => (this.widthValue = value), 'w'),
      new GeometryField('height', () => this.heightValue, (value) => (this.heightValue = value), 'h'),
    ];
  }
}
