import type { Shape } from '../domain/Shape';

/**
 * `show` 命令的渲染器（规范 5.2）。
 *
 * 输出结构：首行 `type#id  parent=<父元素>`，随后几何属性并成一行、
 * 样式与内容属性各占一行——这样"位置"与"外观"在视觉上天然分组。
 */
export class ShapeDetailRenderer {
  render(shape: Shape): string[] {
    const lines: string[] = [`${shape.label}  parent=${shape.parentLabel}`];
    const attributes = shape.attributes();

    const geometry = attributes
      .filter((view) => view.kind === 'geometry')
      .map((view) => view.toString())
      .join(' ');
    if (geometry !== '') lines.push(`  ${geometry}`);

    for (const view of attributes) {
      if (view.kind === 'geometry') continue;
      lines.push(`  ${view.toString()}`);
    }
    return lines;
  }
}
