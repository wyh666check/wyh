import { Arguments } from '../shared/Arguments';
import { AttributeView } from './AttributeView';
import { CommandError } from '../shared/CommandError';
import { GeometryField } from './GeometryField';
import { Point } from '../shared/Point';
import { Shape } from './Shape';
import { SvgElement } from '../shared/SvgElement';

/**
 * 文本 `<text>`。
 *
 * 与其它图形的两点差异，都用多态吸收掉、命令层不感知：
 * - 文本内容不是 SVG 属性而是子文本节点，因此序列化时走 `text` 而不是 attributes；
 * - `show` / `set` 里它表现为一个名为 `text` 的可写"属性"，回显时带引号。
 */
export class TextShape extends Shape {
  override readonly typeName = 'text';

  private xValue: number;
  private yValue: number;
  private contentValue: string;

  constructor(id: string, x: number, y: number, content: string) {
    super(id);
    this.xValue = x;
    this.yValue = y;
    this.contentValue = content;
  }

  static fromArguments(id: string, args: ReadonlyArray<string>): TextShape {
    const usage = 'create text <id> <x> <y> "content"';
    if (args.length < 3) throw new CommandError(`usage: ${usage}`);
    const values = Arguments.of(args);
    const content = args.slice(2).join(' ');
    return new TextShape(id, values.number(0, usage), values.number(1, usage), content);
  }

  get content(): string {
    return this.contentValue;
  }

  override moveBy(dx: number, dy: number): void {
    this.xValue += dx;
    this.yValue += dy;
  }

  override scaleBy(factor: number): void {
    this.xValue *= factor;
    this.yValue *= factor;
  }

  override anchor(): Point {
    return new Point(this.xValue, this.yValue);
  }

  override summary(): string {
    return `${new Point(this.xValue, this.yValue)} ${this.quoted()}`;
  }

  override presentValue(name: string, raw: string): string {
    return name === 'text' ? TextShape.quote(raw) : raw;
  }

  override toElement(): SvgElement {
    return SvgElement.textNode('text', this.serializedAttributes(), this.contentValue);
  }

  protected override geometryFields(): ReadonlyArray<GeometryField> {
    return [
      new GeometryField('x', () => this.xValue, (value) => (this.xValue = value)),
      new GeometryField('y', () => this.yValue, (value) => (this.yValue = value)),
    ];
  }

  protected override contentViews(): AttributeView[] {
    return [AttributeView.content('text', this.quoted())];
  }

  protected override acceptsContent(name: string): boolean {
    return name === 'text';
  }

  protected override readContent(name: string): string | undefined {
    return name === 'text' ? this.contentValue : undefined;
  }

  protected override writeContent(name: string, raw: string): void {
    if (name !== 'text') throw new CommandError(`unknown attribute: ${name}`);
    this.contentValue = raw;
  }

  private quoted(): string {
    return TextShape.quote(this.contentValue);
  }

  private static quote(content: string): string {
    return JSON.stringify(content);
  }
}
