import { CommandError } from '../shared/CommandError';
import { Token } from './Token';

/**
 * 命令行切词：空格分隔、双引号包裹带空格的参数、`\"` 转义。
 *
 * 刻意**不**处理行内 `#` 注释——因为 `#ffffff` 是合法颜色值；
 * 注释只在"整行首非空白字符为 `#`"时成立，判断放在 CommandShell 里。
 */
export class CommandTokenizer {
  tokenize(line: string): Token[] {
    const tokens: Token[] = [];
    let index = 0;

    while (index < line.length) {
      const char = line[index];
      if (char === ' ' || char === '\t') {
        index += 1;
        continue;
      }

      if (char === '"') {
        index += 1;
        let value = '';
        while (index < line.length && line[index] !== '"') {
          if (line[index] === '\\' && index + 1 < line.length) {
            value += line[index + 1] ?? '';
            index += 2;
            continue;
          }
          value += line[index] ?? '';
          index += 1;
        }
        if (index >= line.length) throw new CommandError('unterminated string literal');
        index += 1; // 跳过收尾引号
        tokens.push(new Token(value, true));
        continue;
      }

      let value = '';
      while (index < line.length && line[index] !== ' ' && line[index] !== '\t') {
        value += line[index] ?? '';
        index += 1;
      }
      tokens.push(new Token(value, false));
    }

    return tokens;
  }
}
