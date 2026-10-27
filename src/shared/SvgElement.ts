/**
 * 与存储无关的 SVG 元素描述（不可变值对象）。
 *
 * 定位：domain 的图形"自我介绍"成这棵树，svgio 只负责把它序列化成文本。
 * 这样序列化格式与图形类层次解耦——换格式（JSON、自研）时 domain 不需要改。
 */
export class SvgElement {
  constructor(
    readonly tag: string,
    readonly attributes: ReadonlyArray<readonly [string, string]> = [],
    readonly text: string | null = null,
    readonly children: ReadonlyArray<SvgElement> = [],
  ) {}

  static leaf(tag: string, attributes: ReadonlyArray<readonly [string, string]> = []): SvgElement {
    return new SvgElement(tag, attributes);
  }

  static textNode(
    tag: string,
    attributes: ReadonlyArray<readonly [string, string]>,
    text: string,
  ): SvgElement {
    return new SvgElement(tag, attributes, text);
  }

  static branch(
    tag: string,
    attributes: ReadonlyArray<readonly [string, string]>,
    children: ReadonlyArray<SvgElement>,
  ): SvgElement {
    return new SvgElement(tag, attributes, null, children);
  }
}
