import type { Document } from '../domain/Document';
import { NumberText } from '../shared/NumberText';
import type { Shape } from '../domain/Shape';

interface TreeRow {
  readonly prefix: string;
  readonly label: string;
  readonly summary: string;
}

/**
 * `tree` 命令的渲染器（规范 5.1）。
 *
 * 只做一件事：把图形树画成带连接线的文本，并把关键几何属性**内联**在节点后面——
 * 脱离画布也能读出结构与坐标。列对齐按本次输出中最长的 `type#id` 计算，
 * 因此深层子树也不会出现参差不齐的列。
 */
export class TreeRenderer {
  render(document: Document): string[] {
    const rows = this.collectChildren(document.canvasRoot.childNodes(), '');
    const header = `svg (${NumberText.format(document.width)}x${NumberText.format(document.height)})`;
    return [header, ...this.formatRows(rows)];
  }

  renderSubtree(shape: Shape): string[] {
    const summary = shape.summary();
    const header = summary === '' ? shape.label : `${shape.label}  ${summary}`;
    const rows = this.collectChildren(shape.childNodes(), '');
    return [header, ...this.formatRows(rows)];
  }

  private collectChildren(shapes: ReadonlyArray<Shape>, prefix: string): TreeRow[] {
    const rows: TreeRow[] = [];
    shapes.forEach((shape, index) => {
      const isLast = index === shapes.length - 1;
      rows.push({
        prefix: `${prefix}${isLast ? '└── ' : '├── '}`,
        label: shape.label,
        summary: shape.summary(),
      });
      const childPrefix = `${prefix}${isLast ? '    ' : '│   '}`;
      rows.push(...this.collectChildren(shape.childNodes(), childPrefix));
    });
    return rows;
  }

  private formatRows(rows: ReadonlyArray<TreeRow>): string[] {
    const width = rows.reduce((max, row) => Math.max(max, row.label.length), 0);
    return rows.map((row) => {
      const head = `${row.prefix}${row.label.padEnd(width)}`;
      return row.summary === '' ? head.trimEnd() : `${head}  ${row.summary}`;
    });
  }
}
