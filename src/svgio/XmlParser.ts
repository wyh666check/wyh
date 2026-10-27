import { XmlNode } from './XmlNode';

/**
 * 极简 XML 解析器：只支持 SVG 必需的部分（元素、属性、文本、注释、CDATA、PI、DOCTYPE）。
 *
 * 输入永远是我们自己的文件或用户提供的小型 SVG，解析失败即整体失败——
 * 不做"尽力恢复"，避免出现半棵树这种难以推理的状态。
 */
export class XmlParser {
  parse(source: string): XmlNode {
    const stack: XmlNode[] = [];
    let root: XmlNode | null = null;
    let cursor = 0;

    while (cursor < source.length) {
      const open = source.indexOf('<', cursor);
      if (open < 0) {
        this.appendText(stack, source.slice(cursor));
        break;
      }
      if (open > cursor) this.appendText(stack, source.slice(cursor, open));

      if (source.startsWith('<!--', open)) {
        cursor = this.skipUntil(source, open + 4, '-->');
        continue;
      }
      if (source.startsWith('<![CDATA[', open)) {
        const end = source.indexOf(']]>', open + 9);
        if (end < 0) throw new Error('unterminated CDATA section');
        this.appendText(stack, source.slice(open + 9, end));
        cursor = end + 3;
        continue;
      }
      if (source.startsWith('<?', open)) {
        cursor = this.skipUntil(source, open + 2, '?>');
        continue;
      }
      if (source.startsWith('<!', open)) {
        const end = source.indexOf('>', open + 2);
        if (end < 0) throw new Error('unterminated declaration');
        cursor = end + 1;
        continue;
      }

      const close = this.findTagEnd(source, open + 1);
      if (close < 0) throw new Error('unterminated tag');
      const raw = source.slice(open + 1, close);

      if (raw.startsWith('/')) {
        const name = raw.slice(1).trim();
        const node = stack.pop();
        if (node === undefined) throw new Error(`unexpected closing tag </${name}>`);
        if (node.tag !== name) throw new Error(`mismatched closing tag </${name}> for <${node.tag}>`);
        cursor = close + 1;
        continue;
      }

      const selfClosing = raw.endsWith('/');
      const body = selfClosing ? raw.slice(0, -1) : raw;
      const parsed = XmlParser.parseTagBody(body);
      const node = new XmlNode(parsed.tag, parsed.attributes);

      if (stack.length === 0) {
        if (root !== null) throw new Error('multiple root elements');
        root = node;
      } else {
        stack[stack.length - 1]?.children.push(node);
      }
      if (!selfClosing) stack.push(node);
      cursor = close + 1;
    }

    if (root === null) throw new Error('no root element');
    if (stack.length > 0) throw new Error(`unclosed element <${stack[stack.length - 1]?.tag ?? '?'}>`);
    return root;
  }

  private appendText(stack: XmlNode[], raw: string): void {
    if (raw.trim() === '') return;
    const current = stack[stack.length - 1];
    if (current === undefined) return;
    current.textContent += XmlParser.decode(raw);
  }

  private skipUntil(source: string, from: number, terminator: string): number {
    const end = source.indexOf(terminator, from);
    if (end < 0) throw new Error(`unterminated ${terminator}`);
    return end + terminator.length;
  }

  /** 找到标签结束的 `>`，跳过引号内的内容。 */
  private findTagEnd(source: string, from: number): number {
    let quote: string | null = null;
    for (let i = from; i < source.length; i += 1) {
      const char = source[i];
      if (quote !== null) {
        if (char === quote) quote = null;
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }
      if (char === '>') return i;
    }
    return -1;
  }

  private static parseTagBody(body: string): {
    tag: string;
    attributes: Map<string, string>;
  } {
    let index = 0;
    while (index < body.length && !XmlParser.isSpace(body[index])) index += 1;
    const tag = body.slice(0, index);
    if (tag === '') throw new Error('empty tag name');

    const attributes = new Map<string, string>();
    while (index < body.length) {
      while (index < body.length && XmlParser.isSpace(body[index])) index += 1;
      if (index >= body.length) break;

      const nameStart = index;
      while (index < body.length && body[index] !== '=' && !XmlParser.isSpace(body[index])) {
        index += 1;
      }
      const name = body.slice(nameStart, index);
      if (name === '') throw new Error(`malformed attribute in <${tag}>`);

      while (index < body.length && XmlParser.isSpace(body[index])) index += 1;
      if (body[index] !== '=') {
        attributes.set(name, '');
        continue;
      }
      index += 1;
      while (index < body.length && XmlParser.isSpace(body[index])) index += 1;

      const quote = body[index];
      if (quote !== '"' && quote !== "'") {
        throw new Error(`unquoted value for attribute ${name} in <${tag}>`);
      }
      index += 1;
      const valueStart = index;
      while (index < body.length && body[index] !== quote) index += 1;
      if (index >= body.length) throw new Error(`unterminated value for attribute ${name} in <${tag}>`);
      attributes.set(name, XmlParser.decode(body.slice(valueStart, index)));
      index += 1;
    }

    return { tag, attributes };
  }

  private static isSpace(char: string | undefined): boolean {
    return char === ' ' || char === '\t' || char === '\n' || char === '\r';
  }

  private static decode(raw: string): string {
    if (!raw.includes('&')) return raw;
    return raw.replace(
      /&(?:#(\d+)|#x([0-9a-fA-F]+)|([a-zA-Z]+));/g,
      (whole: string, decimal?: string, hex?: string, entity?: string) => {
        if (decimal !== undefined) return String.fromCodePoint(Number(decimal));
        if (hex !== undefined) return String.fromCodePoint(Number.parseInt(hex, 16));
        switch (entity) {
          case 'amp':
            return '&';
          case 'lt':
            return '<';
          case 'gt':
            return '>';
          case 'quot':
            return '"';
          case 'apos':
            return "'";
          default:
            return whole;
        }
      },
    );
  }
}
