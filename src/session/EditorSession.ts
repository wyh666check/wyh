import type { CommandTarget } from '../command/CommandTarget';
import { CommandError } from '../shared/CommandError';
import type { Document } from '../domain/Document';
import { History } from '../command/History';

/**
 * 编辑会话：当前文档 + 当前文件路径 + 撤销栈。
 *
 * 它是命令层的 Facade —— REPL 只跟它打交道，命令只跟它暴露的 `CommandTarget`
 * 接口打交道。这层隔断带来两个好处：
 * 1. 命令不需要知道"文档从哪来"（`init` 新建还是 `read` 读入）；
 * 2. 换前端（agent、鼠标、测试脚本）时，会话与命令完全复用。
 */
export class EditorSession implements CommandTarget {
  private currentDocument: Document | null = null;
  private path: string | null = null;
  private readonly historyStack = new History();

  get document(): Document | null {
    return this.currentDocument;
  }

  get sourcePath(): string | null {
    return this.path;
  }

  get history(): History {
    return this.historyStack;
  }

  requireDocument(): Document {
    if (this.currentDocument === null) {
      throw new CommandError("no document. use 'init' or 'read' first");
    }
    return this.currentDocument;
  }

  /** 换整份文档：旧历史引用的图形已不在树上，必须一并丢弃。 */
  replaceDocument(document: Document, path: string | null): void {
    this.currentDocument = document;
    this.path = path;
    this.historyStack.reset();
  }

  rememberPath(path: string): void {
    this.path = path;
  }
}
