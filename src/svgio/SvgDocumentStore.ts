import { readFileSync, writeFileSync } from 'node:fs';

import { CommandError } from '../shared/CommandError';
import type { Document } from '../domain/Document';
import { SvgReadResult } from './SvgReadResult';
import { SvgReader } from './SvgReader';
import { SvgWriter } from './SvgWriter';

/**
 * 文件层门面：把"磁盘 + 文本格式"这一整块收在一个类后面。
 *
 * 上层（命令层）只看到 `read(path) → SvgReadResult` 与 `write(document, path)`，
 * 换存储格式（JSON、数据库、远端）时只需要替换本类的实现。
 * 所有 IO 异常都在这里被翻译成规范要求的文案：
 * `error: cannot read file: a.svg` / `error: cannot write file: a.svg`。
 */
export class SvgDocumentStore {
  constructor(
    private readonly reader: SvgReader = new SvgReader(),
    private readonly writer: SvgWriter = new SvgWriter(),
  ) {}

  read(path: string): SvgReadResult {
    let source: string;
    try {
      source = readFileSync(path, 'utf8');
    } catch {
      throw new CommandError(`cannot read file: ${path}`);
    }
    try {
      return this.reader.read(source);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new CommandError(`invalid svg file: ${path} (${reason})`);
    }
  }

  write(document: Document, path: string): void {
    try {
      writeFileSync(path, this.writer.write(document), 'utf8');
    } catch {
      throw new CommandError(`cannot write file: ${path}`);
    }
  }
}
