import type { Document } from '../domain/Document';
import type { SvgElement } from '../shared/SvgElement';

/**
 * Document → SVG 文本。
 *
 * 只负责"把值对象渲染成文本"：属性顺序由 domain 决定（`id` → 几何 → 外观），
 * 因此同一份文档两次保存得到逐字节相同的文件，便于 git diff 与回归测试。
 */
export class SvgWriter {
  write(document: Document): string {
    const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];
    this.renderElement(document.toElement(), 0, lines);
    return `${lines.join('\n')}\n`;
  }

  private renderElement(element: SvgElement, depth: number, lines: string[]): void {
    const indent = '  '.repeat(depth);
    const attributes = element.attributes
      .map(([name, value]) => ` ${name}="${SvgWriter.escape(value)}"`)
      .join('');

    if (element.text !== null) {
      lines.push(
        `${indent}<${element.tag}${attributes}>${SvgWriter.escape(element.text)}</${element.tag}>`,
      );
      return;
    }
    if (element.children.length === 0) {
      lines.push(`${indent}<${element.tag}${attributes}/>`);
      return;
    }
    lines.push(`${indent}<${element.tag}${attributes}>`);
    for (const child of element.children) this.renderElement(child, depth + 1, lines);
    lines.push(`${indent}</${element.tag}>`);
  }

  private static escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
