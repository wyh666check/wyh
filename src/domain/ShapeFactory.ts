import { Circle } from './Circle';
import { Ellipse } from './Ellipse';
import { Group } from './Group';
import { Line } from './Line';
import { Rect } from './Rect';
import type { Shape } from './Shape';
import { ShapeTypeEntry } from './ShapeTypeEntry';
import { TextShape } from './TextShape';
import { CommandError } from '../shared/CommandError';

/**
 * 图形工厂（工厂方法 + 注册表）。
 *
 * 规范允许的**按名字分派**两处之一（另一处是命令分发）。这里用 Map 而不是
 * `switch (tag)`：新增类型只是注册一条表项，未注册类型给出统一错误：
 * `unknown shape type: hexagon (is the plugin loaded?)`。
 *
 * 待重构（已记入架构方案）：Phase 2 会把这 6 条内置注册项换成运行时可插拔的
 * `ShapeProvider`，届时本类的 `create` / `has` 签名保持不变。
 */
export class ShapeFactory {
  private readonly entries = new Map<string, ShapeTypeEntry>();

  constructor() {
    this.registerDefaults();
  }

  register(entry: ShapeTypeEntry): void {
    if (this.entries.has(entry.name)) {
      throw new Error(`shape type already registered: ${entry.name}`);
    }
    this.entries.set(entry.name, entry);
  }

  has(type: string): boolean {
    return this.entries.has(type);
  }

  list(): ReadonlyArray<ShapeTypeEntry> {
    return [...this.entries.values()];
  }

  create(type: string, id: string, args: ReadonlyArray<string>): Shape {
    const entry = this.entries.get(type);
    if (entry === undefined) {
      throw new CommandError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
    return entry.build(id, args);
  }

  /** 内置六种类型：type 名 → 类。新增类型只在这里加一行。 */
  private registerDefaults(): void {
    this.register(
      new ShapeTypeEntry('rect', 'rect <id> <x> <y> <w> <h> [fill]', (id, args) =>
        Rect.fromArguments(id, args),
      ),
    );
    this.register(
      new ShapeTypeEntry('circle', 'circle <id> <cx> <cy> <r> [fill]', (id, args) =>
        Circle.fromArguments(id, args),
      ),
    );
    this.register(
      new ShapeTypeEntry('ellipse', 'ellipse <id> <cx> <cy> <rx> <ry> [fill]', (id, args) =>
        Ellipse.fromArguments(id, args),
      ),
    );
    this.register(
      new ShapeTypeEntry('line', 'line <id> <x1> <y1> <x2> <y2> [stroke]', (id, args) =>
        Line.fromArguments(id, args),
      ),
    );
    this.register(
      new ShapeTypeEntry('text', 'text <id> <x> <y> "content"', (id, args) =>
        TextShape.fromArguments(id, args),
      ),
    );
    this.register(new ShapeTypeEntry('g', 'g <id>', (id, args) => Group.fromArguments(id, args)));
  }
}
