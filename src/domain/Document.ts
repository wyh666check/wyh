import { CanvasRoot } from './CanvasRoot';
import { CommandError } from '../shared/CommandError';
import type { Container } from './Container';
import { NumberText } from '../shared/NumberText';
import type { Shape } from './Shape';
import { SvgElement } from '../shared/SvgElement';

/**
 * 文档聚合根：画布尺寸 + 一棵图形树。
 *
 * 职责边界：只做**结构查询与树维护**，不认识命令、不认识文件格式、不做显示格式化。
 * 命令层通过它定位图形，IO 层通过 `toElement()` 拿到可序列化的快照。
 */
export class Document {
  static readonly ROOT_ID = 'svg';

  private widthValue: number;
  private heightValue: number;
  private readonly root: CanvasRoot;

  constructor(width: number, height: number) {
    Document.requirePositiveSize(width, height);
    this.widthValue = width;
    this.heightValue = height;
    this.root = new CanvasRoot();
  }

  get width(): number {
    return this.widthValue;
  }

  get height(): number {
    return this.heightValue;
  }

  get canvasRoot(): CanvasRoot {
    return this.root;
  }

  get shapes(): ReadonlyArray<Shape> {
    return this.root.children;
  }

  resize(width: number, height: number): void {
    Document.requirePositiveSize(width, height);
    this.widthValue = width;
    this.heightValue = height;
  }

  /** 深度优先的全部图形（不含根容器）。 */
  all(): Shape[] {
    const shapes: Shape[] = [];
    for (const shape of this.root.selfAndDescendants()) {
      if (shape !== this.root) shapes.push(shape);
    }
    return shapes;
  }

  count(): number {
    return this.all().length;
  }

  find(id: string): Shape | undefined {
    for (const shape of this.root.selfAndDescendants()) {
      if (shape !== this.root && shape.id === id) return shape;
    }
    return undefined;
  }

  require(id: string): Shape {
    const shape = this.find(id);
    if (shape === undefined) throw new CommandError(`no such shape: ${id}`);
    return shape;
  }

  /** `group` / `addto` / `ungroup` 的目标容器：先判断存在，再判断类型。 */
  requireContainer(id: string): Container {
    const shape = this.require(id);
    if (!shape.isContainer) throw new CommandError(`not a container: ${id}`);
    return shape as Container;
  }

  /** `create … in <containerId>` 的目标容器：错误文案与上面不同，故单独开一个入口。 */
  requireInsertTarget(id: string): Container {
    const shape = this.find(id);
    if (shape === undefined) throw new CommandError(`no such container: ${id}`);
    if (!shape.isContainer) throw new CommandError(`not a container: ${id}`);
    return shape as Container;
  }

  toElement(): SvgElement {
    return SvgElement.branch(
      'svg',
      [
        ['xmlns', 'http://www.w3.org/2000/svg'],
        ['width', NumberText.format(this.widthValue)],
        ['height', NumberText.format(this.heightValue)],
        ['viewBox', `0 0 ${NumberText.format(this.widthValue)} ${NumberText.format(this.heightValue)}`],
      ],
      this.root.children.map((child) => child.toElement()),
    );
  }

  private static requirePositiveSize(width: number, height: number): void {
    if (!(width > 0) || !(height > 0)) throw new CommandError('canvas size must be positive');
  }
}
