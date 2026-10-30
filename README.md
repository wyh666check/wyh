# SVG 编辑器（CLI）· Lab1 Phase 1

TypeScript 实现的命令行 SVG 编辑器：**以 `id` 寻址**，命令式编辑，支持分组（Composite）、逐命令撤销重做，读写标准 SVG 文件。零运行时依赖（XML 解析器自研）。

架构方案、过程记录与一致性自查见 **[doc/README.md](doc/README.md)**；模块依赖图见 [doc/architecture.svg](doc/architecture.svg)。

- **仓库地址**：<https://github.com/wyh666check/wyh>
- **最终提交**：annotated tag `final`
- **作者**：王宇豪（2801762879@qq.com）

## 快速开始

```bash
npm install
npm run cli                                         # 交互式 REPL，敲 help 看全部命令
node dist/src/cli/Main.js < examples/session.txt     # 脚本回放（# 开头为注释）
npm run verify                                      # 架构校验 + 全部回归测试
```

## 命令一览

| 类别 | 命令 |
|---|---|
| 文档类（执行后 undo/redo 禁止） | `init [w] [h]` · `read <file.svg>` · `save [file.svg]` · `canvas [w] [h]` |
| 图形编辑（可 undo/redo） | `create <type> <id> [params...] [in <gid>]` · `delete` · `move` · `scale` · `set` · `group` · `ungroup` · `addto` · `front` · `back` |
| 显示类 | `tree [id]` · `show <id>` · `help` |
| 撤销重做 | `undo` · `redo` |

`create` 内置类型：`rect` / `circle` / `ellipse` / `line` / `text` / `g`。

```text
svg> init 400 200
canvas 400x200 created
svg> create g flow
g#flow created
svg> create rect start 30 70 120 60 #4a90d9 in flow
rect#start created in g#flow
svg> move flow 10 0
g#flow moved by (10,0)
svg> tree
svg (400x200)
└── g#flow
    └── rect#start  x=40 y=70 w=120 h=60 fill=#4a90d9
```

## 目录结构

```text
src/
  shared/        通用件：错误类型、数字格式、坐标、SVG 元素描述
  domain/        图形模型：Shape 类层次、Container、Document、ShapeFactory
  presentation/  tree / show 渲染器
  svgio/         SVG 文本 <-> Document（缺 id 自动补全、transform 烘焙）
  command/       Command 模式：18 个命令类、History、CommandRegistry
  session/       EditorSession（当前文档 + 文件路径 + 撤销栈）
  cli/           REPL、命令外壳、组合根
test/            21 条回归测试（node:test）
doc/             架构文档与依赖图
examples/        可回放脚本与生成结果
```

依赖方向只允许向下：`cli → session → command → {presentation, svgio} → domain → shared`，由 `scripts/check-deps.mjs` 强制校验。

## 验证

```text
✓ 架构校验通过：63 个源文件，模块依赖方向与命名约定均符合方案。
# tests 21 · pass 21 · fail 0
```
