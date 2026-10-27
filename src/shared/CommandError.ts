import { AppError } from './AppError';

/**
 * 命令层的可预期错误：输入不合法、id 不存在、文件不可读写……
 *
 * 约定（见规范 2. 通用约定）：命令失败时输出单行 `error: <message>`，
 * 且**不改变任何状态**——所以所有校验都必须发生在任何变更之前。
 */
export class CommandError extends AppError {
  constructor(message: string) {
    super(message);
  }
}
