import { NumberText } from '../shared/NumberText';

/**
 * 一个属性的对外视图：名字、**已格式化**的值、以及所属分组。
 *
 * 分组决定了显示方式（见规范 5.1 / 5.2）：几何属性内联在 tree 上、`show` 时并成一行；
 * 样式属性在 `show` 里各占一行；内容（text 元素的文本）单独一行。
 */
export class AttributeView {
  constructor(
    readonly name: string,
    readonly value: string,
    readonly kind: 'geometry' | 'style' | 'content',
  ) {}

  static geometry(name: string, value: number): AttributeView {
    return new AttributeView(name, NumberText.format(value), 'geometry');
  }

  static style(name: string, value: string): AttributeView {
    return new AttributeView(name, value, 'style');
  }

  static content(name: string, quoted: string): AttributeView {
    return new AttributeView(name, quoted, 'content');
  }

  toString(): string {
    return `${this.name}=${this.value}`;
  }
}
