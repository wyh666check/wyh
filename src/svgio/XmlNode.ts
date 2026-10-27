/**
 * 解析后的 XML 元素（仅覆盖 SVG 需要的子集：元素、属性、子文本）。
 *
 * 刻意不引入第三方 XML 库：一是零运行时依赖，二是这个小模型足够表达 SVG，
 * 也避免把库的错误信息直接暴露给用户。
 */
export class XmlNode {
  readonly children: XmlNode[] = [];
  textContent = '';

  constructor(
    readonly tag: string,
    readonly attributes: ReadonlyMap<string, string>,
  ) {}

  attribute(name: string): string | undefined {
    return this.attributes.get(name);
  }

  /** 去掉命名空间前缀：`svg:rect` → `rect`。 */
  get localTag(): string {
    const index = this.tag.indexOf(':');
    return index < 0 ? this.tag : this.tag.slice(index + 1);
  }

  get trimmedText(): string {
    return this.textContent.trim();
  }
}
