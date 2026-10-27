import type { Shape } from './Shape';

/**
 * 一种图形类型的注册项：类型名、`create` 的语法提示、以及构造函数。
 *
 * 这是**图形工厂这条唯一按名字分派通道**的数据载体（另一条是命令分发）。
 * 类型名 → 类的映射被限制在这里，命令层只通过 `ShapeFactory` 消费，
 * 因此 Phase 2 把 `box` 做成插件时不需要改动任何命令。
 */
export class ShapeTypeEntry {
  constructor(
    readonly name: string,
    readonly syntax: string,
    private readonly builder: (id: string, args: ReadonlyArray<string>) => Shape,
  ) {}

  build(id: string, args: ReadonlyArray<string>): Shape {
    return this.builder(id, args);
  }
}
