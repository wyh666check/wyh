import { AttributeView } from './AttributeView';
import { CommandError } from '../shared/CommandError';
import type { Container } from './Container';
import { GeometryField } from './GeometryField';
import { Paint } from './Paint';
import type { Point } from '../shared/Point';
import type { SvgElement } from '../shared/SvgElement';

/**
 * 图形元素抽象基类（Composite 模式的 Component 角色）。
 *
 * 关键约束：
 * - 所有图形只靠 `id` 被寻址，`id` 唯一且大小写敏感；
 * - `move` / `scale` / `set` / `delete` 对容器与叶子一视同仁——
 *   多态由子类实现，命令层不出现任何 `switch (tag)` 式的类型分派；
 * - 属性访问只走 `readAttribute` / `writeAttribute` / `clearAttribute` 三个入口，
 *   白名单判断在各自类里完成，非白名单属性统一报 `unknown attribute`。
 */
export abstract class Shape {
  private parentRef: Container | null = null;

  protected readonly paint = new Paint();

  protected constructor(readonly id: string) {}

  abstract readonly typeName: string;

  /** 回显用的完整称呼，如 `rect#r1`。 */
  get label(): string {
    return `${this.typeName}#${this.id}`;
  }

  get parent(): Container | null {
    return this.parentRef;
  }

  /** 父元素的称呼；根画布自身就是 `svg`。 */
  get parentLabel(): string {
    return this.parentRef === null ? 'svg' : this.parentRef.label;
  }

  get isContainer(): boolean {
    return false;
  }

  /** @internal 只允许 Container 在挂载 / 摘除时调用，命令层不得直接使用。 */
  bindParent(parent: Container | null): void {
    this.parentRef = parent;
  }

  /**
   * Composite 的"取子节点"：叶子返回空表，容器返回子节点。
   * 有了它，渲染器与遍历逻辑都不必 `instanceof` 判断类型。
   */
  childNodes(): ReadonlyArray<Shape> {
    return [];
  }

  /** 以自身为根的深度优先遍历（叶子只产出自己）。 */
  *selfAndDescendants(): Generator<Shape> {
    yield this;
    for (const child of this.childNodes()) {
      yield* child.selfAndDescendants();
    }
  }

  /** 是否是 `shape` 的祖先（叶子恒为 false，容器覆写）。 */
  isAncestorOf(_shape: Shape): boolean {
    return false;
  }

  abstract moveBy(dx: number, dy: number): void;

  abstract scaleBy(factor: number): void;

  abstract toElement(): SvgElement;

  /** 属性明细（供 `show` 使用，属性名与 `set` 白名单完全一致）。 */
  attributes(): AttributeView[] {
    return [
      ...this.geometryFields().map((field) => AttributeView.geometry(field.name, field.read())),
      ...this.paint.views(),
      ...this.contentViews(),
    ];
  }

  /** `tree` 上的内联摘要：默认由几何短名 + 外观属性拼成。 */
  summary(): string {
    const parts: string[] = [];
    for (const field of this.geometryFields()) {
      parts.push(`${field.displayName}=${field.format()}`);
    }
    for (const view of this.paint.views()) parts.push(view.toString());
    for (const view of this.contentViews()) parts.push(view.toString());
    return parts.join(' ');
  }

  /** `move` 回显用的定位点；容器没有唯一定位点，返回 null 表示用位移量回显。 */
  anchor(): Point | null {
    return null;
  }

  /** 属性值的回显形式；text 内容需要加引号，故由子类覆写。 */
  presentValue(_name: string, raw: string): string {
    return raw;
  }

  acceptsAttribute(name: string): boolean {
    return (
      this.geometryFields().some((field) => field.name === name) ||
      Paint.accepts(name) ||
      this.acceptsContent(name)
    );
  }

  readAttribute(name: string): string | undefined {
    const field = this.geometryFields().find((candidate) => candidate.name === name);
    if (field !== undefined) return field.raw();
    const styleValue = this.paint.read(name);
    if (styleValue !== undefined) return styleValue;
    return this.readContent(name);
  }

  writeAttribute(name: string, raw: string): void {
    const field = this.geometryFields().find((candidate) => candidate.name === name);
    if (field !== undefined) {
      field.write(raw);
      return;
    }
    if (Paint.accepts(name)) {
      this.paint.write(name, raw);
      return;
    }
    if (this.acceptsContent(name)) {
      this.writeContent(name, raw);
      return;
    }
    throw new CommandError(`unknown attribute: ${name}`);
  }

  clearAttribute(name: string): void {
    if (Paint.accepts(name)) {
      this.paint.clear(name);
      return;
    }
    throw new CommandError(`unknown attribute: ${name}`);
  }

  /** 序列化属性：`id` + 几何 + 外观，顺序固定以保证 round-trip 可 diff。 */
  protected serializedAttributes(): Array<readonly [string, string]> {
    const attributes: Array<readonly [string, string]> = [['id', this.id]];
    for (const field of this.geometryFields()) {
      attributes.push([field.name, field.format()]);
    }
    attributes.push(...this.paint.serialized());
    return attributes;
  }

  protected abstract geometryFields(): ReadonlyArray<GeometryField>;

  protected contentViews(): AttributeView[] {
    return [];
  }

  protected acceptsContent(_name: string): boolean {
    return false;
  }

  protected readContent(_name: string): string | undefined {
    return undefined;
  }

  protected writeContent(_name: string, _raw: string): void {
    throw new CommandError(`unknown attribute: ${_name}`);
  }
}
