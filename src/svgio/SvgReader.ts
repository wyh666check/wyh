import { Circle } from '../domain/Circle';
import { Document } from '../domain/Document';
import { Ellipse } from '../domain/Ellipse';
import { Group } from '../domain/Group';
import { IdAllocator } from './IdAllocator';
import { Line } from '../domain/Line';
import { NumberText } from '../shared/NumberText';
import { Rect } from '../domain/Rect';
import type { Shape } from '../domain/Shape';
import { SvgReadResult } from './SvgReadResult';
import { TextShape } from '../domain/TextShape';
import { XmlNode } from './XmlNode';
import { XmlParser } from './XmlParser';

/**
 * SVG → Document。
 *
 * 两个关键决策：
 * 1. **内部只用绝对坐标**：`<g transform>` 在读入时烘焙进子孙的几何值（只支持
 *    translate / 等比 scale），之后 `tree` 显示的一定是画布上的真实坐标，
 *    命令层也不必处理坐标系叠加。不支持的 transform 会告警并忽略。
 * 2. **缺 id 就地补齐**：由于所有命令都靠 id 寻址，读入阶段必须保证"每个图形都有唯一 id"，
 *    否则整棵树的后续编辑都不可寻址。
 *
 * 本类只抛内部 Error（表示输入不合法），由 `SvgDocumentStore` 转换成用户可见的
 * `cannot read file` / `invalid svg file` 文案。
 */
export class SvgReader {
  private static readonly SHAPE_TAGS: ReadonlyArray<string> = [
    'g',
    'rect',
    'circle',
    'ellipse',
    'line',
    'text',
  ];

  private readonly parser = new XmlParser();

  read(source: string): SvgReadResult {
    const root = this.parser.parse(source);
    if (root.localTag !== 'svg') throw new Error('root element is not <svg>');

    const warnings: string[] = [];
    const allocator = new IdAllocator();
    const document = new Document(
      SvgReader.readSize(root, 'width') ?? SvgReader.readViewBox(root, 2) ?? 800,
      SvgReader.readSize(root, 'height') ?? SvgReader.readViewBox(root, 3) ?? 600,
    );

    for (const child of root.children) {
      const shape = this.buildShape(child, allocator, warnings);
      if (shape !== null) document.canvasRoot.append(shape);
    }
    return new SvgReadResult(document, warnings);
  }

  private buildShape(node: XmlNode, allocator: IdAllocator, warnings: string[]): Shape | null {
    const tag = node.localTag;
    if (!SvgReader.SHAPE_TAGS.includes(tag)) {
      warnings.push(`warning: skipped unsupported element <${tag}>`);
      return null;
    }

    const id = this.assignId(node, tag, allocator, warnings);
    switch (tag) {
      case 'rect':
        return this.buildRect(node, id);
      case 'circle':
        return this.buildCircle(node, id);
      case 'ellipse':
        return this.buildEllipse(node, id);
      case 'line':
        return this.buildLine(node, id);
      case 'text':
        return this.buildText(node, id);
      case 'g':
        return this.buildGroup(node, id, allocator, warnings);
      default:
        /* istanbul ignore next - SHAPE_TAGS 与分支保持同步，这里不可达 */
        warnings.push(`warning: skipped unsupported element <${tag}>`);
        return null;
    }
  }

  private buildGroup(
    node: XmlNode,
    id: string,
    allocator: IdAllocator,
    warnings: string[],
  ): Group {
    const group = new Group(id);
    for (const child of node.children) {
      const shape = this.buildShape(child, allocator, warnings);
      if (shape !== null) group.append(shape);
    }
    this.bakeTransform(group, node.attribute('transform'), warnings);
    return group;
  }

  private buildRect(node: XmlNode, id: string): Rect {
    const rect = new Rect(
      id,
      SvgReader.number(node, 'x'),
      SvgReader.number(node, 'y'),
      SvgReader.number(node, 'width'),
      SvgReader.number(node, 'height'),
    );
    SvgReader.applyPaint(node, rect);
    return rect;
  }

  private buildCircle(node: XmlNode, id: string): Circle {
    const circle = new Circle(
      id,
      SvgReader.number(node, 'cx'),
      SvgReader.number(node, 'cy'),
      SvgReader.number(node, 'r'),
    );
    SvgReader.applyPaint(node, circle);
    return circle;
  }

  private buildEllipse(node: XmlNode, id: string): Ellipse {
    const ellipse = new Ellipse(
      id,
      SvgReader.number(node, 'cx'),
      SvgReader.number(node, 'cy'),
      SvgReader.number(node, 'rx'),
      SvgReader.number(node, 'ry'),
    );
    SvgReader.applyPaint(node, ellipse);
    return ellipse;
  }

  private buildLine(node: XmlNode, id: string): Line {
    const line = new Line(
      id,
      SvgReader.number(node, 'x1'),
      SvgReader.number(node, 'y1'),
      SvgReader.number(node, 'x2'),
      SvgReader.number(node, 'y2'),
    );
    SvgReader.applyPaint(node, line);
    return line;
  }

  private buildText(node: XmlNode, id: string): TextShape {
    const text = new TextShape(
      id,
      SvgReader.number(node, 'x'),
      SvgReader.number(node, 'y'),
      node.trimmedText,
    );
    SvgReader.applyPaint(node, text);
    return text;
  }

  private assignId(node: XmlNode, tag: string, allocator: IdAllocator, warnings: string[]): string {
    const raw = node.attribute('id')?.trim();
    if (raw === undefined || raw === '') {
      const generated = allocator.generate(tag);
      warnings.push(`warning: assigned id ${generated} to unnamed <${tag}>`);
      return generated;
    }
    if (!allocator.reserve(raw)) {
      const generated = allocator.generate(tag);
      warnings.push(`warning: duplicate id ${raw}, reassigned to ${generated}`);
      return generated;
    }
    return raw;
  }

  /**
   * 把 `transform` 烘焙进子树。
   * `transform="translate(a,b) scale(s)"` 的语义是"先 scale 再 translate"（矩阵从右往左作用），
   * 因此这里**逆序**施加：对子树先整体 scale，再整体平移。
   */
  private bakeTransform(group: Group, raw: string | undefined, warnings: string[]): void {
    if (raw === undefined || raw.trim() === '') return;
    const operations = SvgReader.parseTransform(raw);
    if (operations === null) {
      warnings.push(`warning: unsupported transform "${raw.trim()}" on ${group.label}, ignored`);
      return;
    }
    for (let index = operations.length - 1; index >= 0; index -= 1) {
      const operation = operations[index];
      if (operation === undefined) continue;
      if (operation.name === 'translate') {
        group.moveBy(operation.values[0] ?? 0, operation.values[1] ?? 0);
      } else {
        group.scaleBy(operation.values[0] ?? 1);
      }
    }
  }

  private static parseTransform(
    raw: string,
  ): Array<{ name: string; values: number[] }> | null {
    const operations: Array<{ name: string; values: number[] }> = [];
    const pattern = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
    let match: RegExpExecArray | null = pattern.exec(raw);
    while (match !== null) {
      const name = (match[1] ?? '').toLowerCase();
      const args = (match[2] ?? '')
        .split(/[\s,]+/)
        .filter((value) => value !== '')
        .map((value) => NumberText.parseQuantity(value));
      if (args.some((value) => value === null)) return null;
      const values = args.filter((value): value is number => value !== null);

      if (name === 'translate') {
        if (values.length < 1 || values.length > 2) return null;
        operations.push({ name, values: [values[0] ?? 0, values[1] ?? 0] });
      } else if (name === 'scale') {
        if (values.length < 1 || values.length > 2) return null;
        const sx = values[0] ?? 1;
        const sy = values[1] ?? sx;
        if (sx !== sy) return null; // 非等比缩放会破坏 circle/ellipse 的语义，拒绝并告警
        operations.push({ name, values: [sx] });
      } else {
        return null;
      }
      match = pattern.exec(raw);
    }
    return operations.length === 0 ? null : operations;
  }

  private static applyPaint(node: XmlNode, shape: Shape): void {
    const fill = node.attribute('fill')?.trim();
    if (fill !== undefined && fill !== '') shape.writeAttribute('fill', fill);

    const stroke = node.attribute('stroke')?.trim();
    if (stroke !== undefined && stroke !== '') shape.writeAttribute('stroke', stroke);

    const strokeWidth = node.attribute('stroke-width');
    if (strokeWidth !== undefined) {
      const value = NumberText.parseQuantity(strokeWidth);
      if (value !== null && value >= 0) shape.writeAttribute('stroke-width', String(value));
    }
  }

  private static number(node: XmlNode, name: string): number {
    const raw = node.attribute(name);
    if (raw === undefined) return 0;
    return NumberText.parseQuantity(raw) ?? 0;
  }

  private static readSize(node: XmlNode, name: string): number | null {
    const raw = node.attribute(name);
    if (raw === undefined) return null;
    const value = NumberText.parseQuantity(raw);
    return value !== null && value > 0 ? value : null;
  }

  private static readViewBox(node: XmlNode, index: number): number | null {
    const raw = node.attribute('viewBox');
    if (raw === undefined) return null;
    const parts = raw.split(/[\s,]+/).filter((part) => part !== '');
    const part = parts[index];
    if (part === undefined) return null;
    const value = NumberText.parseQuantity(part);
    return value !== null && value > 0 ? value : null;
  }
}
