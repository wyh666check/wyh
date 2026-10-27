import { Arguments } from '../shared/Arguments';
import { CommandError } from '../shared/CommandError';
import { GeometryField } from './GeometryField';
import { Point } from '../shared/Point';
import { Shape } from './Shape';
import { SvgElement } from '../shared/SvgElement';

/** 圆 `<circle>`。 */
export class Circle extends Shape {
  override readonly typeName = 'circle';

  private cxValue: number;
  private cyValue: number;
  private radiusValue: number;

  constructor(id: string, cx: number, cy: number, radius: number) {
    super(id);
    this.cxValue = cx;
    this.cyValue = cy;
    this.radiusValue = radius;
  }

  static fromArguments(id: string, args: ReadonlyArray<string>): Circle {
    const usage = 'create circle <id> <cx> <cy> <r> [fill]';
    if (args.length < 3 || args.length > 4) throw new CommandError(`usage: ${usage}`);
    const values = Arguments.of(args);
    const circle = new Circle(
      id,
      values.number(0, usage),
      values.number(1, usage),
      values.number(2, usage),
    );
    const fill = values.at(3);
    if (fill !== undefined) circle.writeAttribute('fill', fill);
    return circle;
  }

  override moveBy(dx: number, dy: number): void {
    this.cxValue += dx;
    this.cyValue += dy;
  }

  override scaleBy(factor: number): void {
    this.cxValue *= factor;
    this.cyValue *= factor;
    this.radiusValue *= factor;
  }

  override anchor(): Point {
    return new Point(this.cxValue, this.cyValue);
  }

  override toElement(): SvgElement {
    return SvgElement.leaf('circle', this.serializedAttributes());
  }

  protected override geometryFields(): ReadonlyArray<GeometryField> {
    return [
      new GeometryField('cx', () => this.cxValue, (value) => (this.cxValue = value)),
      new GeometryField('cy', () => this.cyValue, (value) => (this.cyValue = value)),
      new GeometryField('r', () => this.radiusValue, (value) => (this.radiusValue = value)),
    ];
  }
}
