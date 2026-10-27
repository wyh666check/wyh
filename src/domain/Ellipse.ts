import { Arguments } from '../shared/Arguments';
import { CommandError } from '../shared/CommandError';
import { GeometryField } from './GeometryField';
import { Point } from '../shared/Point';
import { Shape } from './Shape';
import { SvgElement } from '../shared/SvgElement';

/** 椭圆 `<ellipse>`。 */
export class Ellipse extends Shape {
  override readonly typeName = 'ellipse';

  private cxValue: number;
  private cyValue: number;
  private rxValue: number;
  private ryValue: number;

  constructor(id: string, cx: number, cy: number, rx: number, ry: number) {
    super(id);
    this.cxValue = cx;
    this.cyValue = cy;
    this.rxValue = rx;
    this.ryValue = ry;
  }

  static fromArguments(id: string, args: ReadonlyArray<string>): Ellipse {
    const usage = 'create ellipse <id> <cx> <cy> <rx> <ry> [fill]';
    if (args.length < 4 || args.length > 5) throw new CommandError(`usage: ${usage}`);
    const values = Arguments.of(args);
    const ellipse = new Ellipse(
      id,
      values.number(0, usage),
      values.number(1, usage),
      values.number(2, usage),
      values.number(3, usage),
    );
    const fill = values.at(4);
    if (fill !== undefined) ellipse.writeAttribute('fill', fill);
    return ellipse;
  }

  override moveBy(dx: number, dy: number): void {
    this.cxValue += dx;
    this.cyValue += dy;
  }

  override scaleBy(factor: number): void {
    this.cxValue *= factor;
    this.cyValue *= factor;
    this.rxValue *= factor;
    this.ryValue *= factor;
  }

  override anchor(): Point {
    return new Point(this.cxValue, this.cyValue);
  }

  override toElement(): SvgElement {
    return SvgElement.leaf('ellipse', this.serializedAttributes());
  }

  protected override geometryFields(): ReadonlyArray<GeometryField> {
    return [
      new GeometryField('cx', () => this.cxValue, (value) => (this.cxValue = value)),
      new GeometryField('cy', () => this.cyValue, (value) => (this.cyValue = value)),
      new GeometryField('rx', () => this.rxValue, (value) => (this.rxValue = value)),
      new GeometryField('ry', () => this.ryValue, (value) => (this.ryValue = value)),
    ];
  }
}
