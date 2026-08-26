window.__ModuleLoader__.load({
	id: "dsh-passpass",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region src/client/index.tsx
		/** dsh-passpass — 密码本插件
		* 折叠面板 → 大按钮「打开密码本」→ 弹窗
		* 开关启用/禁用 → 侧边栏小锁图标
		* 条目：名字、变量、值、备注
		* 值脱敏显示，模型不可见明文
		*/
		const STORAGE_KEY = "dsh-passpass-data";
		let secretsData = loadData();
		let editDirty = false;
		let activeEditDiv = null;
		let activeEditIdx = null;
		let vaultOverlay = null;
		let escHandler = null;
		let activeEditSave = null;
		let activeEditClose = null;
		function loadData() {
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				if (raw) return JSON.parse(raw);
			} catch {}
			return {
				enabled: true,
				secrets: []
			};
		}
		function persistLocalData() {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(secretsData));
			} catch {}
		}
		function saveData() {
			persistLocalData();
			const payload = {
				enabled: secretsData.enabled,
				secrets: secretsData.secrets.map((s) => ({
					name: s.name,
					variable: s.variable,
					...s.value ? { value: s.value } : {},
					note: s.note,
					createdAt: s.createdAt
				}))
			};
			try {
				fetch("/plugins/dsh-passpass/save", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload)
				}).catch(() => {});
			} catch {}
		}
		function maskValue(val, fallback = "••••••••") {
			if (!val) return fallback;
			if (val.length <= 2) return "••";
			if (val.length <= 6) return "•".repeat(val.length);
			return val[0] + "•".repeat(val.length - 2) + val[val.length - 1];
		}
		function now() {
			return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
		}
		const LockSvg = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" width=\"16\" height=\"16\"><rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\" ry=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/></svg>";
		const PlusSvg = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" width=\"14\" height=\"14\"><line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"/><line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"/></svg>";
		const CopySvg = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" width=\"12\" height=\"12\"><rect x=\"9\" y=\"9\" width=\"13\" height=\"13\" rx=\"2\" ry=\"2\"/><path d=\"M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1\"/></svg>";
		const CheckSvg = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" width=\"12\" height=\"12\"><polyline points=\"20 6 9 17 4 12\"/></svg>";
		const EditSvg = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" width=\"12\" height=\"12\"><path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"/><path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"/></svg>";
		const TrashSvg = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" width=\"12\" height=\"12\"><polyline points=\"3 6 5 6 21 6\"/><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"/></svg>";
		const CloseSvg = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" width=\"18\" height=\"18\"><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/></svg>";
		function ensureCleanState() {
			document.querySelectorAll(".dsh-passpass-overlay, .dsh-passpass-edit-modal").forEach((el) => el.remove());
			if (escHandler) {
				document.removeEventListener("keydown", escHandler);
				escHandler = null;
			}
			vaultOverlay = null;
			activeEditDiv = null;
			activeEditIdx = null;
			editDirty = false;
			activeEditSave = null;
			activeEditClose = null;
		}
		function openVault() {
			ensureCleanState();
			const overlay = document.createElement("div");
			overlay.className = "dsh-passpass-overlay";
			overlay.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;animation:dsh-passpass-fadein .2s ease-out";
			overlay.innerHTML = renderVaultModal();
			document.body.appendChild(overlay);
			vaultOverlay = overlay;
			bindVaultEvents(overlay);
			escHandler = (e) => onVaultKeydown(e);
			document.addEventListener("keydown", escHandler);
		}
		function onVaultKeydown(e) {
			if (e.key !== "Escape") return;
			e.preventDefault();
			if (editDirty) {
				if (confirm("有未保存的修改，是否保存？")) activeEditSave?.();
			}
			closeVault();
		}
		function closeVault() {
			if (escHandler) {
				document.removeEventListener("keydown", escHandler);
				escHandler = null;
			}
			document.querySelectorAll(".dsh-passpass-edit-modal").forEach((el) => el.remove());
			const overlay = vaultOverlay;
			if (overlay) overlay.remove();
			vaultOverlay = null;
			activeEditDiv = null;
			activeEditIdx = null;
			editDirty = false;
			activeEditSave = null;
			activeEditClose = null;
		}
		function renderVaultModal() {
			const rows = secretsData.secrets.map((s, i) => {
				const masked = maskValue(s.value, s.masked);
				const notePreview = s.note ? s.note.slice(0, 20) + (s.note.length > 20 ? "…" : "") : "";
				return `<div class="dsh-passpass-row" data-index="${i}">
      <div class="dsh-passpass-row-main">
        <span class="dsh-passpass-row-name">${escapeHtml(s.name)}</span>
        <div class="dsh-passpass-row-meta">
          <code>${escapeHtml(s.variable)}</code>
          <span class="dsh-passpass-row-val">${masked}</span>
          ${s.note ? `<span class="dsh-passpass-row-note">${escapeHtml(notePreview)}</span>` : ""}
        </div>
      </div>
      <div class="dsh-passpass-row-actions">
        <button class="dsh-passpass-btn" data-action="copy" data-index="${i}" title="复制明文">${CopySvg}</button>
        <button class="dsh-passpass-btn" data-action="edit" data-index="${i}" title="编辑">${EditSvg}</button>
        <button class="dsh-passpass-btn" data-action="del" data-index="${i}" title="删除">${TrashSvg}</button>
      </div>
    </div>`;
			}).join("");
			return `<div class="dsh-passpass-modal" data-action-root="vault">
    <div class="dsh-passpass-modal-header">
      <span class="dsh-passpass-modal-title">🔒 密码本</span>
      <button class="dsh-passpass-close-btn" data-action="close" title="关闭">${CloseSvg}</button>
    </div>
    <div class="dsh-passpass-modal-body">
      ${rows.length > 0 ? `<div class="dsh-passpass-list">${rows}</div>` : "<div class=\"dsh-passpass-empty\">暂无条目，点击下方按钮添加</div>"}
      <button class="dsh-passpass-add-btn" data-action="add">${PlusSvg} 新增条目</button>
    </div>
    <div class="dsh-passpass-modal-footer">
      <span class="dsh-passpass-hint">💡 模型只能看到脱敏值（${maskValue("示例值123")}），看不到真实密钥。</span>
    </div>
  </div>`;
		}
		function escapeHtml(s) {
			return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
		}
		function bindVaultEvents(overlay) {
			overlay.addEventListener("click", (e) => {
				const t = e.target.closest("[data-action]");
				if (!t) {
					if (e.target === overlay) closeVault();
					return;
				}
				const action = t.getAttribute("data-action");
				if (action === "close") {
					closeVault();
					return;
				}
				if (action === "add") {
					openEditModal(null, overlay);
					return;
				}
				const idx = parseInt(t.getAttribute("data-index") ?? "-1", 10);
				if (action === "copy") {
					copySecret(idx, t);
					return;
				}
				if (action === "edit") {
					if (idx >= 0) openEditModal(idx, overlay);
					return;
				}
				if (action === "del") {
					delSecret(idx, overlay);
					return;
				}
			});
		}
		function copySecret(idx, btn) {
			if (idx < 0 || idx >= secretsData.secrets.length) return;
			const val = secretsData.secrets[idx].value;
			if (!val) {
				alert("此浏览器没有保存该条目的明文。请点击“编辑”重新录入后再复制。");
				return;
			}
			navigator.clipboard.writeText(val).then(() => {
				btn.innerHTML = CheckSvg;
				btn.style.color = "var(--dsw-alias-state-success-primary, #22c55e)";
				setTimeout(() => {
					btn.innerHTML = CopySvg;
					btn.style.color = "";
				}, 1200);
			}).catch(() => {
				const ta = document.createElement("textarea");
				ta.value = val;
				ta.style.cssText = "position:fixed;left:-9999px";
				document.body.appendChild(ta);
				ta.select();
				document.execCommand("copy");
				document.body.removeChild(ta);
			});
		}
		function delSecret(idx, overlay) {
			if (idx < 0 || idx >= secretsData.secrets.length) return;
			if (!confirm(`确定删除「${secretsData.secrets[idx].name}」？`)) return;
			secretsData.secrets.splice(idx, 1);
			saveData();
			refreshVault(overlay);
		}
		function openEditModal(editIdx, overlay) {
			const isEdit = editIdx !== null;
			const entry = isEdit ? secretsData.secrets[editIdx] : {
				name: "",
				variable: "",
				value: "",
				note: "",
				createdAt: ""
			};
			const editDiv = document.createElement("div");
			editDiv.className = "dsh-passpass-edit-modal";
			editDiv.style.cssText = "position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;animation:dsh-passpass-fadein .2s ease-out";
			editDiv.innerHTML = `<div class="dsh-passpass-edit-box">
    <div class="dsh-passpass-edit-header">
      <span>${isEdit ? "✏️ 编辑条目" : "➕ 新增条目"}</span>
      <button class="dsh-passpass-close-btn" data-edit-action="close">${CloseSvg}</button>
    </div>
    <div class="dsh-passpass-edit-body">
      <label>名字（用于智能体识别）</label>
      <input class="dsh-passpass-input" data-field="name" value="${escapeHtml(entry.name)}" placeholder="如：ARM服务器密钥" />
      <label>变量名（用于工具调用，唯一）</label>
      <input class="dsh-passpass-input" data-field="variable" value="${escapeHtml(entry.variable)}" placeholder="如：ARM_SSH_KEY" />
      <label>值（真实密钥）</label>
      <input class="dsh-passpass-input" data-field="value" type="password" value="${escapeHtml(entry.value)}" placeholder="输入密钥内容" />
      <label>备注（配合信息：用户名/地址/端口/用途）</label>
      <textarea class="dsh-passpass-textarea" data-field="note" placeholder="如：ubuntu@193.122.115.59:22 zsh">${escapeHtml(entry.note)}</textarea>
    </div>
    <div class="dsh-passpass-edit-footer">
      <button class="dsh-passpass-btn-sec" data-edit-action="cancel">取消</button>
      <button class="dsh-passpass-btn-pri" data-edit-action="save">保存</button>
    </div>
  </div>`;
			document.body.appendChild(editDiv);
			const readForm = () => {
				const g = (f) => editDiv.querySelector(`[data-field="${f}"]`)?.value ?? "";
				return {
					name: g("name").trim(),
					variable: g("variable").trim(),
					value: g("value"),
					note: g("note").trim()
				};
			};
			const orig = { ...entry };
			let dirty = false;
			const markDirty = () => {
				const cur = readForm();
				dirty = cur.name !== orig.name.trim() || cur.variable !== orig.variable.trim() || cur.value !== orig.value || cur.note !== orig.note.trim();
				editDirty = dirty;
			};
			editDiv.querySelectorAll("input, textarea").forEach((el) => el.addEventListener("input", markDirty));
			const submit = () => {
				const { name, variable, value, note } = readForm();
				if (!name || !variable || !value) {
					alert("名字、变量名、值不能为空");
					return;
				}
				if (secretsData.secrets.find((s, i) => s.variable === variable && i !== editIdx)) {
					alert(`变量名「${variable}」已存在，请使用不同的变量名`);
					return;
				}
				if (isEdit) {
					const original = secretsData.secrets[editIdx];
					secretsData.secrets[editIdx] = {
						name,
						variable,
						value,
						note,
						createdAt: original.createdAt
					};
				} else secretsData.secrets.push({
					name,
					variable,
					value,
					note,
					createdAt: now()
				});
				saveData();
				teardownEdit();
				refreshVault(overlay);
			};
			const teardownEdit = () => {
				editDiv.remove();
				if (activeEditDiv === editDiv) activeEditDiv = null;
				if (activeEditIdx === editIdx) activeEditIdx = null;
				if (activeEditSave === submit) activeEditSave = null;
				if (activeEditClose === teardownEdit) activeEditClose = null;
				editDirty = false;
				dirty = false;
			};
			const requestClose = () => {
				if (dirty) {
					if (confirm("有未保存的修改，是否保存？")) submit();
					else teardownEdit();
				} else teardownEdit();
			};
			editDiv.addEventListener("click", (e) => {
				if (e.target === editDiv) {
					requestClose();
					return;
				}
				const btn = e.target.closest("[data-edit-action]");
				if (!btn) return;
				const a = btn.getAttribute("data-edit-action");
				if (a === "close" || a === "cancel") requestClose();
				else if (a === "save") submit();
			});
			activeEditDiv = editDiv;
			activeEditIdx = editIdx;
			activeEditSave = submit;
			activeEditClose = teardownEdit;
			editDirty = dirty;
		}
		function refreshVault(overlay) {
			const body = overlay.querySelector(".dsh-passpass-modal-body");
			if (!body) return;
			const rows = secretsData.secrets.map((s, i) => {
				const masked = maskValue(s.value, s.masked);
				const notePreview = s.note ? s.note.slice(0, 20) + (s.note.length > 20 ? "…" : "") : "";
				return `<div class="dsh-passpass-row" data-index="${i}">
      <div class="dsh-passpass-row-main">
        <span class="dsh-passpass-row-name">${escapeHtml(s.name)}</span>
        <div class="dsh-passpass-row-meta">
          <code>${escapeHtml(s.variable)}</code>
          <span class="dsh-passpass-row-val">${masked}</span>
          ${s.note ? `<span class="dsh-passpass-row-note">${escapeHtml(notePreview)}</span>` : ""}
        </div>
      </div>
      <div class="dsh-passpass-row-actions">
        <button class="dsh-passpass-btn" data-action="copy" data-index="${i}" title="复制明文">${CopySvg}</button>
        <button class="dsh-passpass-btn" data-action="edit" data-index="${i}" title="编辑">${EditSvg}</button>
        <button class="dsh-passpass-btn" data-action="del" data-index="${i}" title="删除">${TrashSvg}</button>
      </div>
    </div>`;
			}).join("");
			body.innerHTML = rows.length > 0 ? `<div class="dsh-passpass-list">${rows}</div>
       <button class="dsh-passpass-add-btn" data-action="add">${PlusSvg} 新增条目</button>` : `<div class="dsh-passpass-empty">暂无条目，点击下方按钮添加</div>
       <button class="dsh-passpass-add-btn" data-action="add">${PlusSvg} 新增条目</button>`;
		}
		const inject = ["slots"];
		function apply(ctx) {
			const register = ctx.slots.register.bind(ctx.slots);
			fetch("/plugins/dsh-passpass/list", { cache: "no-store" }).then((r) => r.json()).then((data) => {
				if (data && Array.isArray(data.secrets)) {
					const localByVariable = new Map(secretsData.secrets.map((s) => [s.variable, s]));
					secretsData = {
						enabled: data.enabled !== void 0 ? !!data.enabled : secretsData.enabled,
						secrets: data.secrets.map((remote) => {
							const local = localByVariable.get(remote.variable);
							return {
								name: typeof remote.name === "string" ? remote.name : local?.name || "",
								variable: typeof remote.variable === "string" ? remote.variable : "",
								value: local?.value || "",
								masked: typeof remote.masked === "string" ? remote.masked : "••••••••",
								hasValue: !!remote.hasValue,
								note: typeof remote.note === "string" ? remote.note : local?.note || "",
								createdAt: typeof remote.createdAt === "string" ? remote.createdAt : local?.createdAt || ""
							};
						}).filter((s) => !!s.variable)
					};
					persistLocalData();
					syncLockVisibility();
				}
			}).catch(() => {});
			ctx.effect(() => {
				const style = document.createElement("style");
				style.dataset.plugin = "dsh-passpass";
				style.textContent = `
@keyframes dsh-passpass-fadein{from{opacity:0}to{opacity:1}}
@keyframes dsh-passpass-fadeout{from{opacity:1}to{opacity:0}}
.dsh-passpass-overlay.closing{animation:dsh-passpass-fadeout .18s ease-in forwards}
.dsh-passpass-modal{background:var(--dsw-alias-bg-layer-2,#1c1c1e);border:1px solid var(--dsw-alias-border-l2,#333);border-radius:16px;width:560px;max-width:90vw;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.5);overflow:hidden}
.dsh-passpass-modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--dsw-alias-border-l2,#333)}
.dsh-passpass-modal-title{font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary,#fff)}
.dsh-passpass-close-btn{width:30px;height:30px;border-radius:8px;border:none;background:transparent;cursor:pointer;display:grid;place-items:center;color:var(--dsw-alias-label-tertiary,#999);transition:background .12s}
.dsh-passpass-close-btn:hover{background:var(--dsw-alias-bg-hover,#333);color:var(--dsw-alias-label-primary,#fff)}
.dsh-passpass-modal-body{padding:16px 20px;flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:12px}
.dsh-passpass-list{display:flex;flex-direction:column;gap:8px}
.dsh-passpass-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;background:var(--dsw-alias-bg-layer-3,#2c2c2e);border-radius:10px;transition:background .12s}
.dsh-passpass-row:hover{background:var(--dsw-alias-bg-hover,#333)}
.dsh-passpass-row-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.dsh-passpass-row-name{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-passpass-row-meta{display:flex;align-items:center;gap:8px;font-size:11px}
.dsh-passpass-row-meta code{font-size:10px;color:var(--dsw-alias-brand-primary,#4c78ff);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4c78ff) 12%,transparent);padding:1px 5px;border-radius:3px;white-space:nowrap}
.dsh-passpass-row-val{font-family:monospace;color:var(--dsw-alias-label-tertiary,#999)}
.dsh-passpass-row-note{color:var(--dsw-alias-label-tertiary,#999);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px}
.dsh-passpass-row-actions{display:flex;gap:4px;flex:none}
.dsh-passpass-btn{width:28px;height:28px;border-radius:6px;border:none;background:transparent;cursor:pointer;display:grid;place-items:center;color:var(--dsw-alias-label-tertiary,#999);transition:background .12s,color .12s}
.dsh-passpass-btn:hover{background:var(--dsw-alias-bg-hover,#333);color:var(--dsw-alias-label-primary,#fff)}
.dsh-passpass-del-btn:hover{color:var(--dsw-alias-state-error-primary,#ef4444)}
.dsh-passpass-empty{text-align:center;padding:40px 20px;color:var(--dsw-alias-label-tertiary,#999);font-size:13px}
.dsh-passpass-add-btn{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;border-radius:10px;border:1px dashed var(--dsw-alias-border-l2,#444);background:transparent;cursor:pointer;color:var(--dsw-alias-label-secondary,#ccc);font-size:13px;transition:border-color .12s,color .12s,background .12s}
.dsh-passpass-add-btn:hover{border-color:var(--dsw-alias-brand-primary,#4c78ff);color:var(--dsw-alias-brand-primary,#4c78ff);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4c78ff) 8%,transparent)}
.dsh-passpass-modal-footer{padding:12px 20px;border-top:1px solid var(--dsw-alias-border-l2,#333)}
.dsh-passpass-hint{font-size:11px;color:var(--dsw-alias-label-tertiary,#999)}
.dsh-passpass-edit-modal.closing{animation:dsh-passpass-fadeout .18s ease-in forwards}
.dsh-passpass-edit-box{background:var(--dsw-alias-bg-layer-2,#1c1c1e);border:1px solid var(--dsw-alias-border-l2,#333);border-radius:16px;width:500px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.5);overflow:hidden}
.dsh-passpass-edit-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--dsw-alias-border-l2,#333);font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary,#fff)}
.dsh-passpass-edit-body{display:flex;flex-direction:column;gap:8px;padding:16px 20px}
.dsh-passpass-edit-body label{font-size:12px;color:var(--dsw-alias-label-secondary,#ccc);margin-top:4px}
.dsh-passpass-edit-body label:first-child{margin-top:0}
.dsh-passpass-input,.dsh-passpass-textarea{width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,#444);background:var(--dsw-alias-bg-layer-3,#2c2c2e);color:var(--dsw-alias-label-primary,#fff);font-size:13px;outline:none;transition:border-color .12s;box-sizing:border-box}
.dsh-passpass-input:focus,.dsh-passpass-textarea:focus{border-color:var(--dsw-alias-brand-primary,#4c78ff)}
.dsh-passpass-textarea{min-height:60px;resize:vertical;font-family:inherit}
.dsh-passpass-edit-footer{display:flex;justify-content:flex-end;gap:8px;padding:12px 20px;border-top:1px solid var(--dsw-alias-border-l2,#333)}
.dsh-passpass-btn-pri,.dsh-passpass-btn-sec{padding:7px 18px;border-radius:8px;border:none;cursor:pointer;font-size:13px;transition:background .12s}
.dsh-passpass-btn-pri{background:var(--dsw-alias-brand-primary,#4c78ff);color:#fff}
.dsh-passpass-btn-pri:hover{filter:brightness(1.15)}
.dsh-passpass-btn-sec{background:var(--dsw-alias-bg-layer-3,#2c2c2e);color:var(--dsw-alias-label-secondary,#ccc)}
.dsh-passpass-btn-sec:hover{background:var(--dsw-alias-bg-hover,#333)}
.dsh-passpass-lock-btn{width:24px;height:24px;margin-left:4px;flex:none;border-radius:8px;border:none;background:transparent;cursor:pointer;display:grid;place-items:center;color:var(--dsw-alias-label-tertiary,#999);transition:background .12s,color .12s}
.dsh-passpass-lock-btn:hover{background:var(--dsw-alias-bg-hover,#333);color:var(--dsw-alias-brand-primary,#4c78ff)}
`;
				document.head.appendChild(style);
				return () => style.remove();
			}, "dsh-passpass: styles");
			ctx.effect(() => {
				const tryInject = () => {
					const settingsArea = document.querySelector("[class*=\"hHd-Xa_settingsArea\"]");
					if (!settingsArea) return null;
					if (settingsArea.querySelector(".dsh-passpass-lock-btn")) return true;
					settingsArea.style.display = "flex";
					settingsArea.style.alignItems = "center";
					settingsArea.style.justifyContent = "space-between";
					settingsArea.style.width = "100%";
					const settingsBtn = settingsArea.querySelector("button");
					if (settingsBtn) {
						settingsBtn.style.flex = "1";
						settingsBtn.style.minWidth = "0";
					}
					const btn = document.createElement("button");
					btn.className = "dsh-passpass-lock-btn";
					btn.title = "密码本";
					btn.innerHTML = LockSvg;
					btn.addEventListener("click", (e) => {
						e.stopPropagation();
						openVault();
					});
					settingsArea.appendChild(btn);
					return true;
				};
				if (tryInject()) return;
				const timer = setInterval(() => {
					if (tryInject()) clearInterval(timer);
				}, 500);
				return () => clearInterval(timer);
			}, "dsh-passpass: sidebar lock");
			ctx.slots.inject("settings.plugin.item", () => register({
				name: "settings.plugin.item",
				key: "passpass",
				id: "dsh-passpass",
				order: 90,
				inject: () => ({})
			}, PassPassPluginCard));
		}
		function syncLockVisibility() {
			document.querySelectorAll(".dsh-passpass-lock-btn").forEach((el) => {
				const btn = el;
				btn.style.color = secretsData.enabled ? "var(--dsw-alias-brand-primary,#4c78ff)" : "var(--dsw-alias-label-tertiary,#999)";
			});
		}
		const VERSION = "0826-0.1.0-rc.2";
		const REPO_URL = "https://github.com/ideasir/dsh-passpass";
		const LockSvg14 = "<svg viewBox=\"0 0 14 14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"2\" y=\"7\" width=\"10\" height=\"6\" rx=\"1.5\"/><path d=\"M4.5 7V5a2.5 2.5 0 0 1 5 0v2\"/></svg>";
		function PassPassPluginCard() {
			const [open, setOpen] = react.useState(false);
			const [enabled, setEnabled] = react.useState(secretsData.enabled);
			const [feedback, setFeedback] = react.useState(null);
			const toggle = () => {
				const newVal = !enabled;
				secretsData.enabled = newVal;
				saveData();
				setEnabled(newVal);
				syncLockVisibility();
			};
			return react.createElement("li", { className: "dsh-mm-card" }, react.createElement("button", {
				className: "dsh-mm-head",
				onClick: () => setOpen((v) => !v)
			}, react.createElement("span", { className: "dsh-mm-head-text" }, react.createElement("div", { className: "dsh-mm-name-row" }, react.createElement("span", {
				className: "dsh-mm-title",
				style: {
					display: "inline-flex",
					alignItems: "center",
					gap: 6
				}
			}, react.createElement("span", { dangerouslySetInnerHTML: { __html: LockSvg } }), "PassPass"), react.createElement("span", { className: "dsh-mm-version-badge" }, VERSION)), react.createElement("span", { className: "dsh-mm-desc" }, "密码本。管理敏感凭据，值脱敏显示，模型不可见明文。")), react.createElement("span", { className: "dsh-mm-btns" }, react.createElement("a", {
				className: "dsh-mm-btn-link",
				href: REPO_URL,
				target: "_blank",
				rel: "noreferrer",
				onClick: (e) => e.stopPropagation(),
				title: "打开 GitHub 仓库"
			}, "ideasir"), react.createElement("button", {
				className: "dsh-mm-btn-uninstall",
				onClick: (e) => {
					e.stopPropagation();
					if (confirm("确定卸载 PassPass 插件？")) {
						setFeedback("已卸载（重启后生效）");
						setTimeout(() => setFeedback(null), 3e3);
					}
				},
				title: "卸载插件"
			}, "卸载"), react.createElement("button", {
				className: "dsh-mm-btn-update",
				style: { color: "var(--dsw-alias-label-tertiary)" },
				onClick: (e) => e.stopPropagation(),
				title: "当前已是最新版本"
			}, "已最新"), react.createElement(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				size: "sm",
				onClick: (e) => {
					e.stopPropagation();
				}
			}, "智能检测"), react.createElement("span", {
				className: "dsh-mm-chevron" + (open ? " dsh-mm-chevron-open" : ""),
				style: { transform: open ? "rotate(180deg)" : "none" }
			}, react.createElement(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14)))), open && react.createElement("div", { className: "dsh-mm-body" }, feedback && react.createElement("p", { style: {
				margin: 0,
				fontSize: 13,
				color: feedback.startsWith("已") ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-state-error-primary)"
			} }, feedback), react.createElement("div", { className: "dsh-mm-master" }, react.createElement("button", {
				type: "button",
				role: "switch",
				"aria-checked": enabled,
				onClick: toggle,
				style: {
					flex: "none",
					position: "relative",
					width: 44,
					height: 24,
					borderRadius: 999,
					border: "none",
					cursor: "pointer",
					padding: 0,
					background: enabled ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-border-l3)",
					transition: "background .18s cubic-bezier(0.4, 0, 0.2, 1)",
					boxShadow: enabled ? "inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-state-success-primary) 40%, transparent)" : "none"
				}
			}, react.createElement("span", { style: {
				position: "absolute",
				top: 3,
				left: enabled ? 23 : 3,
				width: 18,
				height: 18,
				borderRadius: 999,
				background: "#fff",
				boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
				transition: "left .2s cubic-bezier(0.34, 1.56, 0.64, 1)"
			} })), react.createElement("div", {}, react.createElement("div", { className: "dsh-mm-master-label" }, enabled ? "PassPass 已开启" : "PassPass 已关闭"), react.createElement("div", { className: "dsh-mm-master-note" }, enabled ? "AI 可以调用 resolve_secret 工具获取脱敏值" : "关闭后 AI 无法调用密码本工具"))), react.createElement("button", {
				onClick: openVault,
				style: {
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: 8,
					width: "100%",
					padding: "10px 0",
					borderRadius: 10,
					border: "none",
					background: "var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary))",
					color: "var(--dsw-alias-label-primary-inverted,#fff)",
					cursor: "pointer",
					fontSize: 13,
					fontWeight: 600,
					transition: "filter .12s, background .12s"
				},
				onMouseEnter: (e) => e.target.style.background = "color-mix(in srgb, var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary)) 90%, #000)",
				onMouseLeave: (e) => e.target.style.background = ""
			}, react.createElement("span", {
				dangerouslySetInnerHTML: { __html: LockSvg14 },
				style: { display: "inline-flex" }
			}), "打开密码本")));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map