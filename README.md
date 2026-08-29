# dsh-passpass

PassPass 是 DeepSeek Harness 的本地敏感凭据管理插件。它将凭据以 AES-256-GCM 加密保存到 DSH 数据目录，并向 Agent 提供“按变量名使用凭据”的工具，而不是直接把凭据明文放进对话上下文。

## 主要能力

- **加密落盘**：凭据值以 AES-256-GCM 加密后保存到 `${DSH_HOME}/.passpass.json`。
- **密钥隔离**：加密密钥优先读取 `DSH_PASSPASS_KEY`，否则使用 `${DSH_HOME}/.passpass.key`，首次运行自动生成。
- **安全工具**：
  - `list_secrets`：列出凭据元数据和固定宽度脱敏值；
  - `resolve_secret`：按变量名查找凭据，返回脱敏值和备注；
  - `credential_exec`：按变量名把真实值注入环境变量后执行 shell；
  - `credential_http`：按变量名构造 Basic/Bearer/自定义请求头并发起 HTTP 请求。
- **结果脱敏**：Shell 输出和 HTTP 响应会过滤已知凭据及常见编码变体。
- **Web 管理界面**：在 Harness 设置页提供 PassPass 卡片、启停开关、凭据增删改和复制操作。
- **禁用即注销工具**：关闭 PassPass 后，服务端会注销相关工具，而不仅仅是在执行阶段报错。
- **客户端安全同步**：服务端 `/list` 只返回脱敏元数据，不通过普通 HTTP 接口下发凭据明文；浏览器使用自身的本地明文工作副本支持编辑和复制。

## 安全边界

PassPass 的核心目标是避免凭据进入 Agent 的正常工具结果和对话上下文：

- Agent 通过 `list_secrets` / `resolve_secret` 只能看到固定宽度脱敏值；
- Agent 使用 `credential_exec` / `credential_http` 时，真实值由服务端注入，返回结果经过脱敏；
- 服务端文件中的凭据值为密文；
- Web `/list` 接口只返回元数据、脱敏值和 `hasValue` 状态。

> **重要**：PassPass 不能替代操作系统权限隔离。如果 Agent 拥有不受限制的 root 文件访问权限，可以直接读取加密文件和密钥文件并自行解密；如果 Agent 能访问本机 Web 服务，也应由 DSH 沙箱限制其网络和文件权限。插件级脱敏是工具边界保护，不是对全权限进程的绝对安全边界。

## 安装到 DSH Web Profile

在 Web Profile 的 `package.json` 中加入本地包，并把包加入 profile bundles：

```json
{
  "dependencies": {
    "dsh-passpass": "file:/path/to/dsh-passpass"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-passpass"
      ]
    }
  }
}
```

安装依赖并重启 Profile：

```bash
npm install
npm run build --prefix /path/to/dsh-passpass
# 由 DSH Profile 重新加载该 bundle
```

本项目提供的 bundle patch 会注册：

```yaml
- insert:
    - id: dsh-passpass
      name: 'dsh-passpass'
```

## 数据文件

| 文件 | 作用 |
| --- | --- |
| `${DSH_HOME}/.passpass.json` | 加密后的凭据数据 |
| `${DSH_HOME}/.passpass.key` | 32 字节 AES 密钥的十六进制表示，权限应为 `0600` |

建议通过环境变量注入固定密钥，便于备份和迁移：

```bash
export DSH_PASSPASS_KEY='<64 hexadecimal characters>'
```

如果更换密钥，现有密文不会自动迁移；请先使用旧密钥启动并导出/重新保存，再切换新密钥。

## 版本

当前版本：`0829-0.1.0-rc.2`

项目地址：<https://github.com/ideasir/dsh-passpass>

## 开发

详细的环境、构建、测试和发布说明见 [`DEVELOPMENT.md`](./DEVELOPMENT.md)。

## License

MIT
