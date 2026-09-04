## 2026-09-04 v0904-0.1.2-alpha.3 清除 passpass 旧名残留 + 版本更新

### 为什么
主任拍板：开发期插件没有旧用户/旧数据包袱，passpass 改名 verypass 的兼容迁移代码直接删干净。

### 改了哪些
- src/client/index.tsx：删 localStorage「dsh-passpass-data → dsh-verypass-data」一次性迁移；删 DOM 里 .dsh-passpass-lock-btn 旧按钮清理
- src/index.ts：删 legacyStorePath（.passpass.json）/ legacyKeyPath（.passpass.key）与整个 ensureMigrated() 迁移函数
- README / CHANGES 同步；版本号 0901 → 0904

### 验证
- tsc 编译通过，部署（symlink 即时生效），重启 active

---


## 2026-09-01 — 全量改名 PassPass → VeryPass + 推送到 for.very.im

### 修改
- 包名/目录/namespace/路由/localStorage 键/CSS 类/组件名/环境变量/数据文件全部改名 dsh-passpass → dsh-verypass
- 数据文件 `.passpass.json`/`.passpass.key` → `.verypass.json`/`.verypass.key`（一次性迁移，旧文件保留；**后续 2026-09-02 清理时已删除迁移代码 ensureMigrated() 及旧文件**）
- 版本号统一 `0901-0.1.2-alpha.3`（五处一致）
- 视觉对齐 veryskill：四标签（ideasir/卸载/已最新/智能检测）+ hover 反馈、开关药丸样式、浅色深色主题适配、弹窗遮罩 rgba(0,0,0,0.55)
- 推送仓库：https://for.very.im/EVAN/dsh-verypass

## 2026-08-29 — 图标规范化（编辑/新增标题去 emoji）

### 修改
- 编辑/新增条目标题：✏️/➕ emoji → 纯文字
- 遵循 /vol1/1000/DeepSeek/DSH-UI-SPEC.md 规范
