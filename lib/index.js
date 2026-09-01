/** dsh-verypass server entry — password vault with masked display
 *
 * 职责：
 * - 持久化密码本数据到 ~/.dsh/.verypass.json（服务端存储，跨会话/重启保留）
 * - 真实值加密落盘（AES-256-GCM），密钥来自 env DSH_VERYPASS_KEY 或 ~/.dsh/.verypass.key
 * - 注册工具：
 *     list_secrets      —— 列出所有条目（等宽脱敏，模型看不到明文/长度/首尾）
 *     resolve_secret    —— 按变量名查条目描述（等宽脱敏 + 备注全文），仅供识别，不能用
 *     credential_exec   —— 引用变量名把真实值注入环境变量执行 shell，输出自动脱敏（代理执行）
 *     credential_http   —— 引用变量名把真实值注入请求鉴权执行 HTTP，响应自动脱敏（代理执行）
 * - Web 路由：GET /list 仅同步脱敏元数据；POST /save 接收浏览器提交并加密落盘
 * - enabled=false 时真正注销工具（模型感知不到密码本存在）
 *
 * 安全模型：模型走工具只能拿到脱敏值；真实密钥只由「受信执行层」按变量名注入，
 * 且任何工具输出/渲染前都会把命中密钥替换成 [REDACTED]——实现「引用变量即用、明文不落上下文」。
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import Schema from '@deepseek-ai/schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
export const inject = ['tools', 'webServer', 'settings', 'systemPrompt'];
const dshHome = process.env.DSH_HOME ?? '/root/.dsh';
const storePath = path.join(dshHome, '.verypass.json');
const keyPath = path.join(dshHome, '.verypass.key');
const legacyStorePath = path.join(dshHome, '.passpass.json');
const legacyKeyPath = path.join(dshHome, '.passpass.key');
const PROFILE_DIR = path.join(dshHome, 'profiles', 'web');
const NM_DIR = path.join(PROFILE_DIR, 'node_modules');
const SELF = 'dsh-verypass';
const GITHUB_RAW = 'https://ghfast.top/https://raw.githubusercontent.com/ideasir/dsh-verypass/main/package.json';
const defaultData = { enabled: true, secrets: [] };
const REDACT = '[REDACTED]';
// 内存里当前所有未加密值（用于全局脱敏）
let secretValues = [];
function refreshSecretValues(data) {
    secretValues = data.secrets.map(s => s.value).filter(Boolean);
}
// ── 加密 / 解密 ────────────────────────────────────────
async function getEncKey() {
    const envKey = process.env.DSH_VERYPASS_KEY;
    if (envKey && /^[0-9a-fA-F]{64}$/.test(envKey))
        return Buffer.from(envKey, 'hex');
    try {
        const raw = (await readFile(keyPath, 'utf-8')).trim();
        if (/^[0-9a-fA-F]{64}$/.test(raw))
            return Buffer.from(raw, 'hex');
    }
    catch { /* 首次无 key */ }
    const key = randomBytes(32);
    await mkdir(path.dirname(keyPath), { recursive: true });
    await writeFile(keyPath, key.toString('hex'), { mode: 0o600 });
    return key;
}
let encKeyCache = null;
async function encKey() {
    if (!encKeyCache)
        encKeyCache = await getEncKey();
    return encKeyCache;
}
function encryptValue(plain, key) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `enc:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}
function decryptValue(payload, key) {
    // 兼容旧版本可能产生的多层 enc:，逐层解密直到得到真正明文。
    let current = payload;
    for (let depth = 0; depth < 4; depth++) {
        const parts = current.split(':');
        if (parts[0] !== 'enc' || parts.length !== 4)
            return current;
        try {
            const iv = Buffer.from(parts[1], 'base64');
            const tag = Buffer.from(parts[2], 'base64');
            const enc = Buffer.from(parts[3], 'base64');
            const decipher = createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(tag);
            current = Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
        }
        catch {
            return current;
        }
    }
    return current;
}
// 等宽脱敏：不泄露长度、首尾字符（固定宽度遮罩）
function maskValue(val) {
    if (!val)
        return '';
    return '••••••••';
}
// 全局脱敏：把任何已知密钥（及其 base64/hex/URL 编码变体）替换成 [REDACTED]
const extraVariants = (v) => {
    const out = [];
    try {
        const b64 = Buffer.from(v, 'utf8').toString('base64');
        if (!b64.startsWith('enc:'))
            out.push(b64);
        out.push(Buffer.from(v, 'utf8').toString('hex'));
    }
    catch { /* ignore */ }
    try {
        out.push(encodeURIComponent(v));
    }
    catch { /* ignore */ }
    return out;
};
function redact(text, extra = []) {
    if (!text)
        return text;
    for (const v of [...secretValues, ...extra]) {
        if (!v || v.length < 3)
            continue;
        const candidates = new Set([v, ...extraVariants(v)]);
        for (const s of candidates) {
            if (s && text.includes(s))
                text = text.split(s).join(REDACT);
        }
    }
    return text;
}
// 一次性迁移：新文件名不存在但旧 .passpass 文件存在时，复制旧 .passpass 数据到新 .verypass 文件名。
// 保留旧文件不动（只读复制），确保任何回滚或误删都可通过旧文件找回。
async function ensureMigrated() {
    // 1) 迁移密钥文件（先迁移 key，否则旧数据无法解密）
    try {
        await readFile(keyPath);
    }
    catch {
        try {
            const legacyKey = await readFile(legacyKeyPath);
            await mkdir(path.dirname(keyPath), { recursive: true });
            await writeFile(keyPath, legacyKey, { mode: 0o600 });
        }
        catch { /* 无旧密钥，忽略 */ }
    }
    // 2) 迁移数据文件
    try {
        await readFile(storePath);
    }
    catch {
        try {
            const legacyData = await readFile(legacyStorePath);
            await mkdir(path.dirname(storePath), { recursive: true });
            await writeFile(storePath, legacyData, { mode: 0o600 });
        }
        catch { /* 无旧数据，忽略 */ }
    }
}
// ── 加载 / 保存（value 加密落盘，内存始终明文） ──────────
async function loadData() {
    await ensureMigrated();
    try {
        const raw = await readFile(storePath, 'utf-8');
        const parsed = JSON.parse(raw);
        const key = await encKey();
        const data = {
            enabled: parsed.enabled ?? true,
            secrets: Array.isArray(parsed.secrets) ? parsed.secrets.map(s => ({
                name: s.name, project: s.project || '', variable: s.variable,
                prefix: s.prefix || '', value: decryptValue(s.value, key),
                note: s.note || '', createdAt: s.createdAt || '',
            })) : [],
        };
        refreshSecretValues(data);
        return data;
    }
    catch {
        return { ...defaultData };
    }
}
async function saveData(data) {
    const key = await encKey();
    const clean = {
        enabled: !!data.enabled,
        secrets: data.secrets.map(s => ({
            name: s.name, project: s.project || '', variable: s.variable,
            prefix: s.prefix || '',
            // 已是密文则原样保留，避免重复加密；否则加密一次
            value: s.value.startsWith('enc:') ? s.value : encryptValue(s.value, key),
            note: s.note || '', createdAt: s.createdAt || '',
        })),
    };
    refreshSecretValues(data);
    await mkdir(path.dirname(storePath), { recursive: true });
    await writeFile(storePath, JSON.stringify(clean, null, 2), { mode: 0o600 });
}
// 尽快把旧的明文 value 迁移为密文
async function migratePlaintext() {
    try {
        const data = await loadData();
        if (data.secrets.some(s => !s.value.startsWith('enc:')))
            await saveData(data);
    }
    catch { /* ignore */ }
}
export function apply(ctx, config = {}) {
    // settings namespace（客户端 settings.plugin.item 卡片 key="verypass" 匹配）
    // schema 必须是可调用的 schemastery 实例，普通对象会导致 "schema is not a function" 抛错
    const scope = ctx.settings.register('verypass', Schema.object({
        enabled: Schema.boolean().default(true).description('密码本开关'),
    }), { base: config });
    // enabled 以文件为准（客户端 toggle 通过 save 路由写文件）。
    // 启动阶段先按关闭处理，待安全读取完成后再按实际状态注册工具，避免短暂暴露。
    let enabledCache = false;
    const getEnabled = () => enabledCache;
    void migratePlaintext();
    // 校验开启状态
    function assertEnabled() {
        if (!getEnabled())
            throw new Error('密码本已关闭，请在设置页启用。');
    }
    // ─── Web 路由：前端弹窗保存/加载 ────────────────────
    ctx.effect(() => {
        ctx.webServer.register({
            kind: 'exact', path: '/plugins/dsh-verypass/list',
            handler: async (req, res) => {
                try {
                    const data = await loadData();
                    // 只向浏览器同步元数据，绝不通过普通 HTTP 路由下发明文。
                    // 浏览器中的明文工作副本仅保留在该浏览器 localStorage；若丢失，用户需重新录入，
                    // 但服务端密文及 credential_* 工具仍可继续使用。
                    const safeData = {
                        enabled: data.enabled,
                        secrets: data.secrets.map(s => ({
                            name: s.name,
                            project: s.project || '',
                            variable: s.variable,
                            prefix: s.prefix || '',
                            masked: maskValue(s.value),
                            hasValue: !!s.value,
                            note: s.note || '',
                            createdAt: s.createdAt || '',
                        })),
                    };
                    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
                    res.end(JSON.stringify(safeData));
                }
                catch (e) {
                    res.writeHead(500, { 'content-type': 'application/json' });
                    res.end(JSON.stringify({ error: e?.message ?? 'load failed' }));
                }
            },
        });
        ctx.webServer.register({
            kind: 'exact', path: '/plugins/dsh-verypass/save',
            handler: async (req, res) => {
                try {
                    const chunks = [];
                    for await (const chunk of req)
                        chunks.push(chunk);
                    const body = Buffer.concat(chunks).toString('utf-8');
                    const data = JSON.parse(body);
                    if (!data || typeof data !== 'object' || !Array.isArray(data.secrets)) {
                        res.writeHead(400, { 'content-type': 'application/json' });
                        res.end(JSON.stringify({ error: 'bad payload' }));
                        return;
                    }
                    const previous = await loadData();
                    const previousByVariable = new Map(previous.secrets.map(s => [s.variable, s]));
                    // ⚠️ 防清空保护：提交空 secrets 且服务端已有数据时拒绝（除非显式 force:true 主动清空）
                    const submitted = Array.isArray(data.secrets) ? data.secrets.filter((r) => r && typeof r === 'object') : [];
                    const wantForceClear = data.force === true;
                    if (submitted.length === 0 && previous.secrets.length > 0 && !wantForceClear) {
                        res.writeHead(409, { 'content-type': 'application/json' });
                        res.end(JSON.stringify({ ok: false, error: '拒绝空提交：密码本已有 ' + previous.secrets.length + ' 条数据，请刷新页面后重试（防止旧页面误覆盖）' }));
                        return;
                    }
                    const secrets = [];
                    const seen = new Set();
                    for (const raw of data.secrets) {
                        if (!raw || typeof raw.name !== 'string' || typeof raw.variable !== 'string')
                            continue;
                        const name = raw.name.trim();
                        const variable = raw.variable.trim();
                        if (!name || !variable || seen.has(variable))
                            continue;
                        seen.add(variable);
                        const old = previousByVariable.get(variable);
                        // value 缺失时保留服务端已有明文；仅新增条目必须明确提交 value。
                        const rawValue = typeof raw.value === 'string' ? raw.value : old?.value;
                        if (typeof rawValue !== 'string' || !rawValue)
                            continue;
                        // 多行 value 自动拆分为多条独立条目
                        const values = rawValue.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
                        for (let vi = 0; vi < values.length; vi++) {
                            const val = values[vi];
                            const entryName = values.length > 1 ? `${name} ${vi + 1}` : name;
                            // 多行拆分时变量名自动续编
                            let entryVar = variable;
                            if (values.length > 1) {
                                let n = 1;
                                while (seen.has(`${entryVar}_${String(n).padStart(2, '0')}`))
                                    n++;
                                entryVar = `${entryVar}_${String(n).padStart(2, '0')}`;
                            }
                            if (seen.has(entryVar))
                                continue;
                            seen.add(entryVar);
                            secrets.push({
                                name: entryName,
                                project: typeof raw.project === 'string' ? raw.project.trim() : (old?.project || ''),
                                variable: entryVar,
                                prefix: typeof raw.prefix === 'string' ? raw.prefix.trim() : (old?.prefix || ''),
                                value: val,
                                note: typeof raw.note === 'string' ? raw.note : '',
                                createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : old?.createdAt || '',
                            });
                        }
                    }
                    const clean = { enabled: !!data.enabled, secrets };
                    await saveData(clean);
                    await setToolsEnabled(clean.enabled);
                    res.writeHead(200, { 'content-type': 'application/json' });
                    res.end(JSON.stringify({ ok: true }));
                }
                catch (e) {
                    res.writeHead(500, { 'content-type': 'application/json' });
                    res.end(JSON.stringify({ error: e?.message ?? 'save failed' }));
                }
            },
        });
        // 检查更新：对比本地版本与 GitHub 远端 package.json 版本
        ctx.webServer.register({
            kind: 'exact', path: '/plugins/dsh-verypass/update',
            handler: async (_req, res) => {
                try {
                    let localVersion = '';
                    try {
                        const pkgPath = path.join(NM_DIR, SELF, 'package.json');
                        localVersion = JSON.parse(await readFile(pkgPath, 'utf-8')).version ?? '';
                    }
                    catch { /* 读不到本地版本则空 */ }
                    let remoteVersion = '', hasUpdate = false;
                    try {
                        const resp = await fetch(GITHUB_RAW, { signal: AbortSignal.timeout(8_000) });
                        if (resp.ok) {
                            remoteVersion = ((await resp.json()).version) ?? '';
                            hasUpdate = remoteVersion !== '' && remoteVersion !== localVersion;
                        }
                    }
                    catch { /* 网络不可达保守无更新 */ }
                    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
                    res.end(JSON.stringify({ ok: true, hasUpdate, remoteVersion, localVersion }));
                }
                catch (e) {
                    res.writeHead(500, { 'content-type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, error: e?.message ?? 'update check failed' }));
                }
            },
        });
    });
    // ─── 系统提示词：告诉模型密码本用法 ──────────────────
    ctx.systemPrompt.section({
        name: 'verypass',
        order: 240,
        text: () => {
            if (!getEnabled())
                return '';
            return [
                '## 密码本（VeryPass）',
                '用户有密码本可用于取用敏感凭据（API Key、密码、token 等）。',
                '调用 list_secrets 查看可用条目（只会看到等宽脱敏值，看不到明文/长度/首尾）。',
                '需要用某个凭据执行真实动作时，不要尝试把脱敏值当真实值用；',
                '改用 credential_exec / credential_http，把账号口令按「变量名」传给它们。',
                '这两个工具会由受信执行层用真实值完成动作，并把结果里的密钥替换成 [REDACTED]，',
                '这些专用工具不会把明文返回到对话；浏览器密码本界面仅使用该浏览器本地保存的明文副本。',
                '不要在对话中猜测或传播任何密钥的真实内容。',
            ].join('\n');
        },
    });
    // ─── 工具注册 ──────────────────────────────────────
    let toolDisposers = [];
    const unregisterTools = () => {
        for (const dispose of toolDisposers.splice(0)) {
            try {
                dispose();
            }
            catch { /* ignore */ }
        }
    };
    const registerTools = () => {
        if (toolDisposers.length)
            return;
        // list_secrets：列出所有条目（等宽脱敏）
        toolDisposers.push(ctx.tools.register(defineTool({
            name: 'list_secrets',
            description: '列出密码本中所有条目，每个条目包含名字、变量名、脱敏值、备注。用于查看用户保存了哪些凭据。',
            parameters: {},
            output: {
                schema: {
                    type: 'object', additionalProperties: false, properties: {
                        entries: {
                            type: 'array', required: true, items: {
                                type: 'object', additionalProperties: false, properties: {
                                    project: { type: 'string' },
                                    name: { type: 'string', required: true },
                                    variable: { type: 'string', required: true },
                                    prefix: { type: 'string' },
                                    masked: { type: 'string', required: true },
                                    note: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                render: (_args, value) => [
                    { type: 'text', text: value.entries.length > 0 ? value.entries.map(e => `${e.project ? `[${e.project}] ` : ''}${e.name} (${e.variable})：${e.masked}${e.note ? ' — ' + e.note : ''}`).join('\n') : '密码本为空，暂无条目。' },
                ],
            },
            async execute() {
                assertEnabled();
                const data = await loadData();
                return {
                    entries: data.secrets.map(s => ({
                        project: s.project || '',
                        name: s.name,
                        variable: s.variable,
                        prefix: s.prefix || '',
                        masked: maskValue(s.value),
                        note: s.note || '',
                    })),
                };
            },
        })));
        // resolve_secret：按变量名查条目描述（等宽脱敏 + 备注全文）
        toolDisposers.push(ctx.tools.register(defineTool({
            name: 'resolve_secret',
            description: '按变量名在密码本中查找凭据，返回等宽脱敏值和完整备注。仅用于确认变量存在、拿到配合信息（用户名/地址/端口）；不能把脱敏值当真实值使用，真实执行请改用 credential_exec / credential_http。',
            parameters: {
                variable: { type: 'string', required: true, description: '要查找的变量名，如 ARM_SSH_KEY' },
            },
            output: {
                schema: {
                    type: 'object', additionalProperties: false, properties: {
                        found: { type: 'boolean', required: true },
                        name: { type: 'string' },
                        project: { type: 'string' },
                        variable: { type: 'string' },
                        prefix: { type: 'string' },
                        masked: { type: 'string' },
                        note: { type: 'string' },
                        hint: { type: 'string' },
                    },
                },
                render: (args, value) => [
                    { type: 'text', text: value.found ? `找到了「${value.name}」${value.project ? `（项目：${value.project}）` : ''}（${value.variable}）：${value.masked}${value.note ? '\n备注：' + value.note : ''}` : `未找到变量「${args.variable}」。可先用 list_secrets 查看可用条目。` },
                ],
            },
            async execute(args) {
                assertEnabled();
                const data = await loadData();
                const entry = data.secrets.find(s => s.variable === args.variable);
                if (!entry)
                    return { found: false };
                return { found: true, name: entry.name, project: entry.project || '', variable: entry.variable, prefix: entry.prefix || '', masked: maskValue(entry.value), note: entry.note || '' };
            },
        })));
        // ── 代理执行 1：credential_exec —— 引用变量名，注入真实值执行 shell ──
        toolDisposers.push(ctx.tools.register(defineTool({
            name: 'credential_exec',
            description: '按变量名把密码本中的真实值注入为环境变量，再执行一条 shell 命令；命令 stdout/stderr 会把任何命中密钥替换为 [REDACTED]。用于需要真实凭据的登录/鉴权操作，模型全程看不到明文。',
            parameters: {
                command: { type: 'string', required: true, description: '要执行的 shell 命令，可用 $ENV_VAR 引用 secrets 里注入的环境变量' },
                secrets: { type: 'object', additionalProperties: true, description: '变量名→环境变量名的映射，如 {TEST_KEY:MY_PASS}，命令里用 $MY_PASS 引用' },
                timeoutMs: { type: 'number', description: '超时(毫秒)，默认 60000' },
            },
            output: {
                schema: {
                    type: 'object', additionalProperties: false, properties: {
                        ok: { type: 'boolean', required: true },
                        exitCode: { type: 'number' },
                        stdout: { type: 'string' },
                        stderr: { type: 'string' },
                        error: { type: 'string' },
                        truncated: { type: 'boolean' },
                    },
                },
                render: (_args, value) => [
                    { type: 'text', text: value.ok ? `退出码 ${value.exitCode ?? 0}\n${(value.stdout || '').slice(-2000)}\n${(value.stderr || '').slice(-1000)}` : `执行失败：${value.error ?? '未知错误'}` },
                ],
            },
            async execute(args) {
                assertEnabled();
                const data = await loadData();
                const secretsMap = args.secrets ?? {};
                const env = {};
                for (const [varName, envName] of Object.entries(secretsMap)) {
                    const entry = data.secrets.find(s => s.variable === varName);
                    if (!entry)
                        return { ok: false, error: `密码本中不存在变量「${varName}」` };
                    env[envName] = entry.value;
                }
                return await runShell(args.command, env, args.timeoutMs ?? 60000);
            },
        })));
        // ── 代理执行 2：credential_http —— 引用变量名，注入请求鉴权 ──
        toolDisposers.push(ctx.tools.register(defineTool({
            name: 'credential_http',
            description: '按变量名把密码本中的真实值注入 HTTP 请求的鉴权（Basic/Bearer/自定义头）后发起请求，只返回状态码与响应体，并把任何命中密钥替换为 [REDACTED]。用于需要登录/带 token 的接口请求，模型全程看不到明文。',
            parameters: {
                url: { type: 'string', required: true, description: '请求 URL' },
                method: { type: 'string', description: 'HTTP 方法，默认 GET' },
                auth: { type: 'object', additionalProperties: false, properties: {
                        type: { type: 'string', description: 'basic | bearer | none' },
                        username: { type: 'string', description: 'Basic 的用户名（可明文）' },
                        passwordSecret: { type: 'string', description: 'Basic 密码在密码本中的变量名' },
                        tokenSecret: { type: 'string', description: 'Bearer token 在密码本中的变量名' },
                    }, description: '鉴权配置，密码/token 用变量名代替真实值' },
                headers: { type: 'object', additionalProperties: true, description: '额外请求头，值可为字面量，或以 VAR 引用密码本变量名' },
                body: { type: 'string', description: '请求体（字符串）' },
                timeoutMs: { type: 'number', description: '超时(毫秒)，默认 30000' },
            },
            output: {
                schema: {
                    type: 'object', additionalProperties: false, properties: {
                        ok: { type: 'boolean', required: true },
                        status: { type: 'number' },
                        statusText: { type: 'string' },
                        body: { type: 'string' },
                        error: { type: 'string' },
                        truncated: { type: 'boolean' },
                    },
                },
                render: (_args, value) => [
                    { type: 'text', text: value.ok ? `HTTP ${value.status ?? 200} ${value.statusText ?? ''}\n${(value.body || '').slice(-2000)}` : `请求失败：${value.error ?? '未知错误'}` },
                ],
            },
            async execute(args) {
                assertEnabled();
                const data = await loadData();
                const findVar = (v) => data.secrets.find(s => s.variable === v)?.value;
                const headers = {};
                const extraRedact = []; // 拼接变体/完整鉴权头，纳入脱敏
                // 额外头：{{VAR}} 引用变量
                for (const [k, raw] of Object.entries(args.headers ?? {})) {
                    if (/^\{\{[A-Z0-9_]+\}\}$/.test(raw)) {
                        const val = findVar(raw.slice(2, -2));
                        if (val !== undefined) {
                            headers[k] = val;
                            extraRedact.push(val);
                        }
                        else
                            headers[k] = raw;
                    }
                    else {
                        headers[k] = raw;
                    }
                }
                // 鉴权
                const authType = args.auth?.type ?? 'none';
                if (authType === 'basic') {
                    const pass = findVar(args.auth?.passwordSecret) ?? '';
                    const user = args.auth?.username ?? '';
                    const basicPlain = `${user}:${pass}`;
                    const basicB64 = Buffer.from(basicPlain).toString('base64');
                    const authHeader = 'Basic ' + basicB64;
                    headers['Authorization'] = authHeader;
                    // 把拼接串、其 base64、完整 Authorization 头都加入脱敏候选，拦住回显
                    extraRedact.push(basicPlain, basicB64, authHeader);
                }
                else if (authType === 'bearer') {
                    const token = findVar(args.auth?.tokenSecret) ?? '';
                    const authHeader = 'Bearer ' + token;
                    headers['Authorization'] = authHeader;
                    extraRedact.push(token, authHeader);
                }
                const ctrl = new AbortController();
                const timer = setTimeout(() => ctrl.abort(), args.timeoutMs ?? 30000);
                try {
                    const res = await fetch(args.url, {
                        method: args.method ?? 'GET',
                        headers,
                        body: args.body,
                        redirect: 'follow',
                        signal: ctrl.signal,
                    });
                    let rawBody = await res.text();
                    const truncated = rawBody.length > 20000;
                    if (truncated)
                        rawBody = rawBody.slice(0, 20000);
                    return { ok: res.ok, status: res.status, statusText: res.statusText, body: redact(rawBody, extraRedact), truncated };
                }
                catch (e) {
                    return { ok: false, error: e?.message ?? '请求失败' };
                }
                finally {
                    clearTimeout(timer);
                }
            },
        })));
    };
    const setToolsEnabled = async (enabled) => {
        enabledCache = enabled;
        if (enabled)
            registerTools();
        else
            unregisterTools();
    };
    // 首次读取完成后才按真实开关状态暴露工具；关闭时工具 schema 完全不存在。
    void loadData().then(data => setToolsEnabled(data.enabled)).catch(() => setToolsEnabled(false));
    ctx.effect(() => () => unregisterTools(), 'dsh-verypass: tools');
    return { scope, loadData };
}
// ── 代理执行底层 ───────────────────────────────────────
function runShell(command, env, timeoutMs) {
    return new Promise((resolve) => {
        let child;
        try {
            child = spawn('/bin/bash', ['-lc', command], { env: { ...process.env, ...env } });
        }
        catch (e) {
            resolve({ ok: false, error: e?.message ?? '无法启动进程' });
            return;
        }
        let out = '', err = '';
        let truncated = false;
        const cap = (buf, cur) => {
            const next = cur + buf;
            if (next.length > 8000) {
                truncated = true;
                return next.slice(-8000);
            }
            return next;
        };
        child.stdout.on('data', (d) => { out = cap(d.toString('utf8'), out); });
        child.stderr.on('data', (d) => { err = cap(d.toString('utf8'), err); });
        const timer = setTimeout(() => { child.kill('SIGKILL'); }, timeoutMs);
        child.on('error', (e) => { clearTimeout(timer); resolve({ ok: false, error: e.message }); });
        child.on('close', (code) => {
            clearTimeout(timer);
            resolve({ ok: (code ?? 1) === 0, exitCode: code ?? 1, stdout: redact(out), stderr: redact(err), truncated });
        });
    });
}
//# sourceMappingURL=index.js.map