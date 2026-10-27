import type { Document } from '../domain/Document';
import type { History } from './History';

/**
 * 命令执行所需的最小上下文（Dependency Inversion）。
 *
 * 命令**不认识** REPL、不认识文件、也不认识 CLI；它只要求"能拿到当前文档、
 * 能换掉当前文档、能操作历史栈"。`EditorSession` 实现这个接口，
 * 因此命令层与 session 层之间没有循环依赖。
 */
export interface CommandTarget {
  readonly document: Document | null;
  readonly sourcePath: string | null;
  readonly history: History;
  requireDocument(): Document;
  replaceDocument(document: Document, path: string | null): void;
  rememberPath(path: string): void;
}
