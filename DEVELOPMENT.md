# dsh-passpass 开发文档

## 1. 项目结构

```text
src/index.ts             # Host 半部：加密、存储、Web 路由、工具
src/client/index.tsx     # Client 半部：设置卡片和密码本界面
lib/index.js             # Host 构建产物
lib/client.js            # 浏览器 bundle 构建产物
cordis.patch.yml         # DSH bundle 注册 patch
package.json             # npm 与 DSH bundle 元数据
tsdown.config.ts         # 客户端 bundle 配置
```

运行时使用 `lib/index.js` 和 `lib/client.js`。`src/` 是唯一源码，修改源码后必须重新构建，不能只手改 `lib/`。

## 2. 环境要求

- Node.js 20+（当前开发环境使用 Node.js 24）；
- npm；
- 可访问 DSH 相关依赖包的 npm/file 依赖；
- React 19 类型和 DSH Client UI primitives。

安装依赖：

```bash
npm install
```

项目使用 `package-lock.json` 锁定 npm 依赖。`pnpm-lock.yaml` 和 workspace 文件用于兼容现有 DSH 开发环境；不要在没有确认影响的情况下混用包管理器更新锁文件。

## 3. 构建

完整构建：

```bash
npm run build
```

等价于：

```bash
npm run build:server  # TypeScript 编译 Host 半部
npm run build:client  # tsdown 构建浏览器 bundle
```

客户端构建会生成包装在 `window.__ModuleLoader__.load(...)` 中的 `lib/client.js`。不要直接把普通 CJS/ESM 文件当作客户端 bundle 部署。

## 4. Host 半部设计

`src/index.ts` 负责：

1. 从 `${DSH_HOME}` 定位数据和密钥文件；
2. 使用 AES-256-GCM 对凭据值加密/解密；
3. 注册 `passpass` settings namespace；
4. 注册 `/plugins/dsh-passpass/list` 和 `/plugins/dsh-passpass/save`；
5. 注册四个 Agent 工具；
6. 将工具输出中的凭据及常见编码变体替换为 `[REDACTED]`。

### 数据格式

```json
{
  "enabled": true,
  "secrets": [
    {
      "name": "示例凭据",
      "variable": "EXAMPLE_TOKEN",
      "value": "enc:<iv-base64>:<tag-base64>:<ciphertext-base64>",
      "note": "用途和配合信息",
      "createdAt": "2026-01-01"
    }
  ]
}
```

内存中的 `value` 才是明文；保存到磁盘时必须转换为 `enc:` 密文。

### 工具生命周期

- 启动时先按关闭处理；
- 读取数据成功后，只有 `enabled=true` 才注册工具；
- 关闭开关时调用各工具 disposer，真正注销工具；
- 插件停止/更新时由 Fiber effect 清理工具注册。

修改工具注册时必须保持 disposer 生命周期完整，不能把注册结果丢弃。

## 5. Client 半部设计

客户端从 `/list` 获取的内容只包括：

- `name`；
- `variable`；
- `masked`；
- `hasValue`；
- `note`；
- `createdAt`；
- `enabled`。

服务端不会通过 `/list` 返回 `value`。客户端只从当前浏览器的 `localStorage` 恢复自身已有的明文副本，并按 `variable` 与服务端元数据合并。

### 修改客户端时的注意事项

- `localStorage` key 为 `dsh-passpass-data`；
- 所有用户输入进入 HTML 前必须经过 `escapeHtml`；
- UI 事件应使用当前弹窗的事件代理，避免重复绑定；
- 新增/编辑/删除后要同时更新本地缓存和服务端；
- 不能把服务端返回对象直接当作含有明文的对象使用；
- 使用 React 组件时保持 `React.createElement` 或经过 tsdown 支持的形式，并确保外部依赖在 `tsdown.config.ts` 中正确处理。

## 6. 本地运行验证

启动 DSH Web Profile 后，检查：

```bash
curl -sS http://127.0.0.1:3080/plugins/dsh-passpass/list
curl -sS -o /dev/null -w '%{http_code}\n' \
  http://127.0.0.1:3080/plugins/dsh-passpass/client.js
```

安全检查要求：

- `/list` 返回中不能出现 `value` 字段；
- `/list` 的 `masked` 应为固定宽度遮罩；
- `.passpass.json` 中所有值应以 `enc:` 开头；
- `list_secrets` 和 `resolve_secret` 不得返回明文；
- `credential_exec` / `credential_http` 的输出必须执行 redact；
- 关闭 PassPass 后四个工具应不再出现在工具注册表中。

语法检查：

```bash
node --check lib/index.js
node --check lib/client.js
```

## 7. 发布流程

1. 修改 `src/`、`package.json` 或配置；
2. 运行 `npm install` 更新锁文件（仅在依赖发生变化时）；
3. 运行 `npm run build`；
4. 检查 `git diff`、`git diff --check`；
5. 将 bundle 安装到 DSH Profile；
6. 重启当前 Profile，不要另起替代 Web 服务；
7. 检查 HTTP 路由、工具脱敏、客户端 bundle 和日志；
8. 更新版本号与 README；
9. 创建 Git 提交并推送远程仓库。

## 8. 安全发布检查清单

- [ ] 不提交 `.passpass.json`、`.passpass.key` 或任何真实凭据；
- [ ] 不把测试 token 写入源码、README、日志或提交信息；
- [ ] `/list` 不返回 `value` 明文；
- [ ] `/save` 缺失 `value` 时保留已有服务端值；
- [ ] 服务端工具输出只包含脱敏值；
- [ ] `.passpass.key` 权限为 `0600`；
- [ ] 生产环境的 Agent sandbox 不应允许直接读取 DSH 密钥文件；
- [ ] 生产环境应限制 Agent 对本机 DSH Web 管理端点的直接访问；
- [ ] 发布前执行构建和运行时回归检查。

## 9. 已知边界

PassPass 是 DSH 的本地插件，不是独立的操作系统密码管理器。若运行 Agent 拥有 root 权限、能读取 `${DSH_HOME}/.passpass.key`，或能直接访问并调用本机 Web 管理接口，则插件无法单独保证明文对该进程不可见。真正的进程隔离必须由 DSH sandbox、系统权限和网络策略提供。
