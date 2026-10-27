import { AttributeView } from './AttributeView';
import { CommandError } from '../shared/CommandError';
import type { GeometryField } from './GeometryField';
import { Shape } from './Shape';
import { SvgElement } from '../shared/SvgElement';

/**
 * 容器（Composite 模式的 Composite 角色）。
 *
 * 容器**没有自己的几何**：它的 `move` / `scale` 直接递归到每个子孙，
 * 于是"对 g 操作"和"对 rect 操作"在命令层完全同形（统一操作）。
 * 内部统一使用绝对坐标，容器不承担坐标系变换——这条决定让 `tree` 的内联属性
 * 始终是"画布上的真实位置"，也让 undo 不必处理矩阵。
 */
export abstract class Container extends Shape {
  private readonly items: Shape[] = [];

  protected constructor(id: string) {
    super(id);
  }

  get children(): ReadonlyArray<Shape> {
    return this.items;
  }

  override childNodes(): ReadonlyArray<Shape> {
    return this.items;
  }

  get childCount(): number {
    return this.items.length;
  }

  override get isContainer(): boolean {
    return true;
  }

  indexOf(shape: Shape): number {
    return this.items.indexOf(shape);
  }

  childAt(index: number): Shape | undefined {
    return this.items[index];
  }

  /** 插入到指定位置；若图形已挂在别处，先摘除（父指针由容器负责维护）。 */
  insertAt(shape: Shape, index: number): void {
    const position = Math.max(0, Math.min(index, this.items.length));
    const previousParent = shape.parent;
    if (previousParent !== null && previousParent !== this) previousParent.detach(shape);
    this.items.splice(position, 0, shape);
    shape.bindParent(this);
  }

  append(shape: Shape): void {
    this.insertAt(shape, this.items.length);
  }

  detach(shape: Shape): void {
    const index = this.items.indexOf(shape);
    if (index < 0) return;
    this.items.splice(index, 1);
    shape.bindParent(null);
  }

  detachAt(index: number): Shape | undefined {
    const [removed] = this.items.splice(index, 1);
    if (removed !== undefined) removed.bindParent(null);
    return removed;
  }

  override moveBy(dx: number, dy: number): void {
    for (const child of this.items) child.moveBy(dx, dy);
  }

  override scaleBy(factor: number): void {
    for (const child of this.items) child.scaleBy(factor);
  }

  override isAncestorOf(shape: Shape): boolean {
    let cursor = shape.parent;
    while (cursor !== null) {
      if (cursor === this) return true;
      cursor = cursor.parent;
    }
    return false;
  }

  /**
   * 是否允许 `ungroup`。
   * 普通 `<g>` 恒为 true；Phase 2 的复合图形 `box` 由插件拥有内部结构，
   * 会覆写为 false 并触发 `error: cannot ungroup composite shape: n1`。
   */
  allowsUngroup(): boolean {
    return true;
  }

  /** 容器没有可设置的属性（`transform` 不在白名单内），一律拒绝。 */
  override acceptsAttribute(_name: string): boolean {
    return false;
  }

  override attributes(): AttributeView[] {
    return [];
  }

  override writeAttribute(name: string, _raw: string): void {
    throw new CommandError(`unknown attribute: ${name}`);
  }

  override clearAttribute(name: string): void {
    throw new CommandError(`unknown attribute: ${name}`);
  }

  override summary(): string {
    return '';
  }

  override toElement(): SvgElement {
    return SvgElement.branch(
      'g',
      [['id', this.id]],
      this.items.map((child) => child.toElement()),
    );
  }

  protected override geometryFields(): ReadonlyArray<GeometryField> {
    return [];
  }
}
