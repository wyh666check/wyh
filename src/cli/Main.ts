import { CommandRegistry } from '../command/CommandRegistry';
import { CommandShell } from './CommandShell';
import { EditorSession } from '../session/EditorSession';
import { Repl } from './Repl';
import { ShapeFactory } from '../domain/ShapeFactory';
import { SvgDocumentStore } from '../svgio/SvgDocumentStore';

/**
 * 组合根（composition root）：唯一允许 `new` 出所有具体实现的地方。
 *
 * 依赖在这里被逐层注入——domain 与 command 都不知道自己是"跑在 CLI 里"的，
 * 因此换前端（agent、鼠标、测试脚本）只需要换这里的一行装配。
 */
export class Main {
  static async run(): Promise<void> {
    const session = new EditorSession();
    const registry = new CommandRegistry(new ShapeFactory(), new SvgDocumentStore());
    const shell = new CommandShell(registry, session);
    await new Repl(shell).run();
  }
}

void Main.run().catch((error: unknown) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`fatal: ${message}\n`);
  process.exitCode = 1;
});
