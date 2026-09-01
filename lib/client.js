window.__ModuleLoader__.load({
	id: "dsh-verypass",
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
		/** dsh-verypass — 密码本插件
		* 折叠面板 → 大按钮「打开密码本」→ 弹窗
		* 开关启用/禁用 → 侧边栏小锁图标
		* 条目：名字、变量、值、备注
		* 值脱敏显示，模型不可见明文
		*/
		const STORAGE_KEY = "dsh-verypass-data";
		let secretsData = loadData();
		let editDirty = false;
		let activeEditDiv = null;
		let activeEditIdx = null;
		let vaultOverlay = null;
		let escHandler = null;
		let activeEditSave = null;
		let activeEditClose = null;
		function loadData() {
			if (!localStorage.getItem("dsh-verypass-data")) {
				const legacy = localStorage.getItem("dsh-passpass-data");
				if (legacy) localStorage.setItem("dsh-verypass-data", legacy);
			}
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
					project: s.project,
					variable: s.variable,
					prefix: s.prefix,
					...s.value ? { value: s.value } : {},
					note: s.note,
					createdAt: s.createdAt
				}))
			};
			try {
				fetch("/plugins/dsh-verypass/save", {
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
			document.querySelectorAll(".dsh-verypass-overlay, .dsh-verypass-edit-modal").forEach((el) => el.remove());
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
			overlay.className = "dsh-verypass-overlay";
			overlay.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;animation:dsh-verypass-fadein .2s ease-out";
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
			document.querySelectorAll(".dsh-verypass-edit-modal").forEach((el) => el.remove());
			const overlay = vaultOverlay;
			if (overlay) overlay.remove();
			vaultOverlay = null;
			activeEditDiv = null;
			activeEditIdx = null;
			editDirty = false;
			activeEditSave = null;
			activeEditClose = null;
		}
		function escapeHtml(s) {
			return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
		}
		/** 把文字注入 DSH 输入框（React 虚拟 DOM 兼容） */
		function injectIntoInput(v) {
			const ta = document.querySelector("textarea[data-phase]");
			if (!ta) return false;
			try {
				const tracker = ta._valueTracker;
				if (tracker) tracker.setValue("");
				const protoSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
				if (protoSetter) {
					protoSetter.call(ta, v);
					ta.dispatchEvent(new Event("input", { bubbles: true }));
				} else ta.value = v;
				const syncBackdrop = () => {
					const cont = ta.parentElement;
					const backdrop = cont ? [...cont.querySelectorAll("*")].find((el) => el.className && String(el.className).includes("backdrop")) : null;
					if (backdrop && backdrop.textContent !== v) {
						if (tracker) tracker.setValue("");
						if (protoSetter) {
							protoSetter.call(ta, v);
							ta.dispatchEvent(new Event("input", { bubbles: true }));
						}
					}
				};
				setTimeout(syncBackdrop, 100);
				setTimeout(syncBackdrop, 500);
			} catch {
				ta.value = v;
			}
			ta.focus();
			try {
				ta.setSelectionRange(v.length, v.length);
			} catch {}
			return true;
		}
		/** 一个「变量列表」展开按钮的 SVG（列表图标） */
		const ListSvg = "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" width=\"12\" height=\"12\"><line x1=\"8\" y1=\"6\" x2=\"21\" y2=\"6\"/><line x1=\"8\" y1=\"12\" x2=\"21\" y2=\"12\"/><line x1=\"8\" y1=\"18\" x2=\"21\" y2=\"18\"/><line x1=\"3\" y1=\"6\" x2=\"3.01\" y2=\"6\"/><line x1=\"3\" y1=\"12\" x2=\"3.01\" y2=\"12\"/><line x1=\"3\" y1=\"18\" x2=\"3.01\" y2=\"18\"/></svg>";
		/** 按项目分组：返回 { project, entries: SecretEntry[] }[]，project 空归入「默认」。 */
		function groupByProject() {
			const map = /* @__PURE__ */ new Map();
			for (const s of secretsData.secrets) {
				const p = s.project || "默认";
				const arr = map.get(p) || [];
				arr.push(s);
				map.set(p, arr);
			}
			return Array.from(map.entries()).map(([project, entries]) => ({
				project,
				entries
			})).sort((a, b) => a.project === "默认" ? 1 : b.project === "默认" ? -1 : a.project.localeCompare(b.project));
		}
		/** 渲染「按项目分组」的列表 HTML（主弹窗与刷新共用）。
		*  每个项目只渲染一张卡片（用该项目的第一条作代表条目）；
		*  多 Key 时在代表变量名后加一个列表图标，点击弹出「变量↔Key」表格。 */
		function renderVaultListHtml() {
			const cardsHtml = groupByProject().map((g) => {
				const head = g.entries[0];
				const multi = g.entries.length > 1;
				const masked = maskValue(head.value, head.masked);
				const notePreview = head.note ? head.note.slice(0, 20) + (head.note.length > 20 ? "…" : "") : "";
				const idx = secretsData.secrets.indexOf(head);
				return `<div class="dsh-verypass-row" data-project="${escapeHtml(g.project)}" data-index="${idx}">
      <div class="dsh-verypass-row-main">
        <span class="dsh-verypass-row-name">${escapeHtml(g.project)}${multi ? ` <span class="dsh-verypass-keycount">${g.entries.length} Key</span>` : ""}</span>
        <div class="dsh-verypass-row-meta">
          <code>${escapeHtml(head.variable)}</code>
          ${multi ? `<button class="dsh-verypass-btn dsh-verypass-varlist" data-action="varlist" data-project="${escapeHtml(g.project)}" title="查看该项目全部变量与 Key">${ListSvg}</button>` : ""}
          <span class="dsh-verypass-row-val">${masked}</span>
          ${head.note ? `<span class="dsh-verypass-row-note">${escapeHtml(notePreview)}</span>` : ""}
        </div>
      </div>
      <div class="dsh-verypass-row-actions">
        <button class="dsh-verypass-btn" data-action="copy" data-index="${idx}" title="复制明文">${CopySvg}</button>
        <button class="dsh-verypass-btn" data-action="edit" data-index="${idx}" title="编辑">${EditSvg}</button>
        <button class="dsh-verypass-btn" data-action="del" data-index="${idx}" title="删除">${TrashSvg}</button>
      </div>
    </div>`;
			}).join("");
			return cardsHtml.length > 0 ? `<div class="dsh-verypass-list">${cardsHtml}</div>` : "<div class=\"dsh-verypass-empty\">暂无条目，点击下方按钮添加</div>";
		}
		function renderVaultModal() {
			return `<div class="dsh-verypass-modal" data-action-root="vault">
    <div class="dsh-verypass-modal-header">
      <span class="dsh-verypass-modal-title">🔒 密码本</span>
      <button class="dsh-verypass-close-btn" data-action="close" title="关闭">${CloseSvg}</button>
    </div>
    <div class="dsh-verypass-modal-body">
      ${renderVaultListHtml()}
      <button class="dsh-verypass-add-btn" data-action="add">${PlusSvg} 新增条目</button>
    </div>
    <div class="dsh-verypass-modal-footer">
      <span class="dsh-verypass-hint">💡 模型只能看到脱敏值（${maskValue("示例值123")}），看不到真实密钥。同一项目多个 Key 用变量列表按钮查看。</span>
    </div>
  </div>`;
		}
		/** 展开一个项目的「变量↔Key」表格弹窗：表格里每行是「变量名 ↔ Key（脱敏）」。 */
		function openVarlist(project) {
			const entries = secretsData.secrets.filter((s) => (s.project || "默认") === project);
			if (entries.length === 0) return;
			const el = document.createElement("div");
			el.className = "dsh-verypass-varlist-modal";
			el.style.cssText = "position:fixed;inset:0;z-index:2147483002;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;animation:dsh-verypass-fadein .18s ease-out";
			const rows = entries.map((s) => `<tr>
    <td class="dsh-verypass-td-var"><code>${escapeHtml(s.variable)}</code></td>
    <td class="dsh-verypass-td-key">${maskValue(s.value, s.masked)}</td>
  </tr>`).join("");
			el.innerHTML = `<div class="dsh-verypass-varlist-box">
    <div class="dsh-verypass-edit-header">
      <span>📋 ${escapeHtml(project)} · 变量与 Key（${entries.length}）</span>
      <button class="dsh-verypass-close-btn" data-varlist-action="close">${CloseSvg}</button>
    </div>
    <div class="dsh-verypass-varlist-body">
      <table class="dsh-verypass-table">
        <thead><tr><th>变量名</th><th>Key</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
			document.body.appendChild(el);
			el.addEventListener("click", (e) => {
				if (e.target === el) {
					el.remove();
					return;
				}
				if (e.target.closest("[data-varlist-action]")) el.remove();
			});
		}
		/** 密码本统计弹窗：总条目数 + 按项目分组统计。 */
		function openStats() {
			ensureCleanState();
			const el = document.createElement("div");
			el.className = "dsh-verypass-stats-modal";
			el.style.cssText = "position:fixed;inset:0;z-index:2147483002;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;animation:dsh-verypass-fadein .18s ease-out";
			const secrets = secretsData.secrets;
			const total = secrets.length;
			const byProject = /* @__PURE__ */ new Map();
			for (const s of secrets) {
				const p = s.project || "默认";
				byProject.set(p, (byProject.get(p) || 0) + 1);
			}
			const rows = [...byProject.entries()].sort((a, b) => a[0] === "默认" ? 1 : b[0] === "默认" ? -1 : a[0].localeCompare(b[0])).map(([project, count]) => `<tr>
      <td class="dsh-verypass-td-var"><code>${escapeHtml(project)}</code></td>
      <td class="dsh-verypass-td-key">${count} 条</td>
    </tr>`).join("");
			el.innerHTML = `<div class="dsh-verypass-stats-box">
    <div class="dsh-verypass-edit-header">
      <span>🔍 密码本统计</span>
      <button class="dsh-verypass-close-btn" data-stats-action="close">${CloseSvg}</button>
    </div>
    <div class="dsh-verypass-stats-body">
      <div class="dsh-verypass-stats-total">共 ${total} 条密码</div>
      ${total > 0 ? `<table class="dsh-verypass-table">
        <thead><tr><th>项目</th><th>数量</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>` : "<div class=\"dsh-verypass-stats-empty\">密码本为空，还没有任何条目。</div>"}
    </div>
  </div>`;
			document.body.appendChild(el);
			el.addEventListener("click", (e) => {
				if (e.target === el) {
					el.remove();
					return;
				}
				if (e.target.closest("[data-stats-action]")) el.remove();
			});
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
				if (action === "varlist") {
					openVarlist(t.getAttribute("data-project") || "");
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
				project: "",
				variable: "",
				prefix: "",
				value: "",
				note: "",
				createdAt: ""
			};
			const editDiv = document.createElement("div");
			editDiv.className = "dsh-verypass-edit-modal";
			editDiv.style.cssText = "position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;animation:dsh-verypass-fadein .2s ease-out";
			editDiv.innerHTML = `<div class="dsh-verypass-edit-box">
    <div class="dsh-verypass-edit-header">
      <span>${isEdit ? "编辑条目" : "新增条目"}</span>
      <button class="dsh-verypass-close-btn" data-edit-action="close">${CloseSvg}</button>
    </div>
    <div class="dsh-verypass-edit-body">
      <label>项目（同一项目的多个 Key 会合并成一组）</label>
      <input class="dsh-verypass-input" data-field="project" value="${escapeHtml(entry.project)}" placeholder="如：Agnes API（留空归入默认）" />
      <label>名字（用于智能体识别）</label>
      <input class="dsh-verypass-input" data-field="name" value="${escapeHtml(entry.name)}" placeholder="如：Agnes 密钥 1" />
      <label>变量名（用于工具调用，唯一；留空自动生成）</label>
      <input class="dsh-verypass-input" data-field="variable" value="${escapeHtml(entry.variable)}" placeholder="留空则自动生成，如：AGNES_KEY_01" />
      <label>值（真实密钥）</label>
      <input class="dsh-verypass-input" data-field="value" type="password" value="${escapeHtml(entry.value)}" placeholder="输入密钥内容" />
      <label>备注（配合信息：用户名/地址/端口/用途）</label>
      <textarea class="dsh-verypass-textarea" data-field="note" placeholder="如：Agnes API 多 Key 池，换行轮询备用">${escapeHtml(entry.note)}</textarea>
    </div>
    <div class="dsh-verypass-edit-footer">
      <span class="dsh-verypass-edit-hint" data-hint></span>
      <button class="dsh-verypass-btn-sec" data-edit-action="cancel">取消</button>
      <button class="dsh-verypass-btn-pri" data-edit-action="save">保存</button>
    </div>
  </div>`;
			document.body.appendChild(editDiv);
			const readForm = () => {
				const g = (f) => editDiv.querySelector(`[data-field="${f}"]`)?.value ?? "";
				return {
					name: g("name").trim(),
					project: g("project").trim(),
					variable: g("variable").trim(),
					value: g("value"),
					note: g("note").trim()
				};
			};
			const genVariable = (form) => {
				if (form.variable) return form.variable;
				let p = form.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
				if (!p) p = "KEY";
				let n = secretsData.secrets.filter((s) => s.variable.startsWith(p + "_") || s.variable === p).length + 1;
				let cand = `${p}_${String(n).padStart(2, "0")}`;
				while (secretsData.secrets.some((s, i) => s.variable === cand && i !== editIdx)) {
					n++;
					cand = `${p}_${String(n).padStart(2, "0")}`;
				}
				return cand;
			};
			const varInput = editDiv.querySelector("[data-field=\"variable\"]");
			const hintEl = editDiv.querySelector("[data-hint]");
			const updateHint = () => {
				const f = readForm();
				if (!f.variable && f.name) hintEl.textContent = `将自动生成变量名：${genVariable(f)}`;
				else hintEl.textContent = "";
			};
			varInput.addEventListener("input", () => {
				if (!varInput.value) updateHint();
			});
			const orig = { ...entry };
			let dirty = false;
			const markDirty = () => {
				const cur = readForm();
				dirty = cur.name !== orig.name.trim() || cur.project !== orig.project.trim() || cur.variable !== orig.variable.trim() || cur.value !== orig.value || cur.note !== orig.note.trim();
				editDirty = dirty;
			};
			editDiv.querySelectorAll("input, textarea").forEach((el) => el.addEventListener("input", markDirty));
			const submit = () => {
				const form = readForm();
				const name = form.name;
				if (!name || !form.value) {
					alert("名字、值不能为空");
					return;
				}
				const variable = genVariable(form);
				const project = form.project;
				if (secretsData.secrets.find((s, i) => s.variable === variable && i !== editIdx)) {
					alert(`变量名「${variable}」已存在，请换一个名字或手动填写变量名`);
					return;
				}
				if (isEdit) {
					const original = secretsData.secrets[editIdx];
					secretsData.secrets[editIdx] = {
						name,
						project,
						variable,
						prefix: "",
						value: form.value,
						note: form.note,
						createdAt: original.createdAt
					};
				} else secretsData.secrets.push({
					name,
					project,
					variable,
					prefix: "",
					value: form.value,
					note: form.note,
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
			const body = overlay.querySelector(".dsh-verypass-modal-body");
			if (!body) return;
			body.innerHTML = `${renderVaultListHtml()}
    <button class="dsh-verypass-add-btn" data-action="add">${PlusSvg} 新增条目</button>`;
		}
		const inject = ["slots"];
		function apply(ctx) {
			const register = ctx.slots.register.bind(ctx.slots);
			fetch("/plugins/dsh-verypass/list", { cache: "no-store" }).then((r) => r.json()).then((data) => {
				if (data && Array.isArray(data.secrets)) {
					const localByVariable = new Map(secretsData.secrets.map((s) => [s.variable, s]));
					secretsData = {
						enabled: data.enabled !== void 0 ? !!data.enabled : secretsData.enabled,
						secrets: data.secrets.map((remote) => {
							const local = localByVariable.get(remote.variable);
							return {
								name: typeof remote.name === "string" ? remote.name : local?.name || "",
								project: typeof remote.project === "string" ? remote.project : local?.project || "",
								variable: typeof remote.variable === "string" ? remote.variable : "",
								prefix: typeof remote.prefix === "string" ? remote.prefix : local?.prefix || "",
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
				style.dataset.plugin = "dsh-verypass";
				style.textContent = `
/* ── 统一卡片 CSS（dsh-mm-* 类，每插件自带一份，不依赖其他插件） ── */
.dsh-mm-card{list-style:none;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-3,#fff);transition:border-color .16s,background .16s;overflow:hidden}
.dsh-mm-card:hover{border-color:var(--dsw-alias-label-dimmed,#9ca3af)}
.dsh-mm-card-open{background:var(--dsw-alias-bg-layer-2,#fff);border-color:var(--dsw-alias-label-dimmed,#9ca3af)}
.dsh-mm-head{width:100%;appearance:none;border:0;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:12px}
.dsh-mm-head:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4c78ff);outline-offset:-2px}
.dsh-mm-head-text{display:flex;flex-direction:column;gap:2px;min-width:0}
.dsh-mm-name-row{display:flex;align-items:center;gap:6px}
.dsh-mm-title{font-size:14px;line-height:20px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dsh-mm-version-badge{font-size:11px;line-height:16px;font-weight:500;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:0 8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.dsh-mm-desc{font-size:12px;line-height:17px;color:var(--dsw-alias-label-tertiary)}
.dsh-mm-btns{display:flex;align-items:center;gap:6px;flex-shrink:0}
.dsh-mm-btn-link{font-size:12px;line-height:18px;font-weight:500;color:var(--dsw-alias-label-secondary);text-decoration:none;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:2px 10px;white-space:nowrap;transition:color .12s,border-color .12s,background .12s}
.dsh-mm-btn-uninstall{font-size:12px;line-height:18px;font-weight:500;color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,transparent);border-radius:999px;padding:2px 10px;cursor:pointer;white-space:nowrap;transition:background .12s,border-color .12s}
.dsh-mm-btn-update{font-size:12px;line-height:18px;font-weight:500;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:2px 10px;cursor:pointer;white-space:nowrap;transition:background .12s,border-color .12s}
.dsh-mm-chevron{color:var(--dsw-alias-label-tertiary);transition:transform .14s ease-in-out}
.dsh-mm-body{padding:12px 14px;border-top:1px solid var(--dsw-alias-border-l2)}
@keyframes dsh-verypass-fadein{from{opacity:0}to{opacity:1}}
@keyframes dsh-verypass-fadeout{from{opacity:1}to{opacity:0}}
.dsh-verypass-overlay.closing{animation:dsh-verypass-fadeout .18s ease-in forwards}
.dsh-verypass-modal{background:var(--dsw-alias-bg-layer-2,#1c1c1e);border:1px solid var(--dsw-alias-border-l2,#333);border-radius:16px;width:560px;max-width:90vw;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px var(--dsw-alias-shadow, rgba(0,0,0,0.35));overflow:hidden}
.dsh-verypass-modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--dsw-alias-border-l2,#333)}
.dsh-verypass-modal-title{font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary,#fff)}
.dsh-verypass-close-btn{width:30px;height:30px;border-radius:8px;border:none;background:transparent;cursor:pointer;display:grid;place-items:center;color:var(--dsw-alias-label-tertiary,#999);transition:background .12s}
.dsh-verypass-close-btn:hover{background:var(--dsw-alias-bg-hover,#333);color:var(--dsw-alias-label-primary,#fff)}
.dsh-verypass-modal-body{padding:16px 20px;flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:12px}
.dsh-verypass-list{display:flex;flex-direction:column;gap:8px}
.dsh-verypass-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;background:var(--dsw-alias-bg-layer-3,#2c2c2e);border-radius:10px;transition:background .12s}
.dsh-verypass-row:hover{background:var(--dsw-alias-bg-hover,#333)}
.dsh-verypass-row-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.dsh-verypass-row-name{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-verypass-row-meta{display:flex;align-items:center;gap:8px;font-size:11px}
.dsh-verypass-row-meta code{font-size:10px;color:var(--dsw-alias-brand-primary,#4c78ff);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4c78ff) 12%,transparent);padding:1px 5px;border-radius:3px;white-space:nowrap}
.dsh-verypass-row-val{font-family:monospace;color:var(--dsw-alias-label-tertiary,#999)}
.dsh-verypass-row-note{color:var(--dsw-alias-label-tertiary,#999);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px}
.dsh-verypass-row-actions{display:flex;gap:4px;flex:none}
.dsh-verypass-btn{width:28px;height:28px;border-radius:6px;border:none;background:transparent;cursor:pointer;display:grid;place-items:center;color:var(--dsw-alias-label-tertiary,#999);transition:background .12s,color .12s}
.dsh-verypass-btn:hover{background:var(--dsw-alias-bg-hover,#333);color:var(--dsw-alias-label-primary,#fff)}
.dsh-verypass-del-btn:hover{color:var(--dsw-alias-state-error-primary,#ef4444)}
.dsh-verypass-empty{text-align:center;padding:40px 20px;color:var(--dsw-alias-label-tertiary,#999);font-size:13px}
.dsh-verypass-add-btn{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;border-radius:10px;border:1px dashed var(--dsw-alias-border-l2,#444);background:transparent;cursor:pointer;color:var(--dsw-alias-label-secondary,#ccc);font-size:13px;transition:border-color .12s,color .12s,background .12s}
.dsh-verypass-add-btn:hover{border-color:var(--dsw-alias-brand-primary,#4c78ff);color:var(--dsw-alias-brand-primary,#4c78ff);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4c78ff) 8%,transparent)}
.dsh-verypass-modal-footer{padding:12px 20px;border-top:1px solid var(--dsw-alias-border-l2,#333)}
.dsh-verypass-hint{font-size:11px;color:var(--dsw-alias-label-tertiary,#999)}
/* 设置卡片展开区的状态容器：开关在左，说明文字在右，放进带边框的容器 */
.dsh-verypass-status-card{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2,#333);border-radius:10px;background:var(--dsw-alias-bg-layer-3,#2c2c2e);transition:border-color .12s,background .12s}
.dsh-verypass-status-card:hover{border-color:var(--dsw-alias-border-l1,#444)}
.dsh-verypass-status-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.dsh-verypass-status-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary,#fff)}
.dsh-verypass-status-note{font-size:12px;color:var(--dsw-alias-label-tertiary,#999);line-height:1.45}
.dsh-verypass-edit-modal.closing{animation:dsh-verypass-fadeout .18s ease-in forwards}
.dsh-verypass-edit-box{background:var(--dsw-alias-bg-layer-2,#1c1c1e);border:1px solid var(--dsw-alias-border-l2,#333);border-radius:16px;width:500px;max-width:90vw;box-shadow:0 20px 60px var(--dsw-alias-shadow, rgba(0,0,0,0.35));overflow:hidden}
.dsh-verypass-edit-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--dsw-alias-border-l2,#333);font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary,#fff)}
.dsh-verypass-edit-body{display:flex;flex-direction:column;gap:8px;padding:16px 20px}
.dsh-verypass-edit-body label{font-size:12px;color:var(--dsw-alias-label-secondary,#ccc);margin-top:4px}
.dsh-verypass-edit-body label:first-child{margin-top:0}
.dsh-verypass-input,.dsh-verypass-textarea{width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,#444);background:var(--dsw-alias-bg-layer-3,#2c2c2e);color:var(--dsw-alias-label-primary,#fff);font-size:13px;outline:none;transition:border-color .12s;box-sizing:border-box}
.dsh-verypass-input:focus,.dsh-verypass-textarea:focus{border-color:var(--dsw-alias-brand-primary,#4c78ff)}
.dsh-verypass-textarea{min-height:60px;resize:vertical;font-family:inherit}
.dsh-verypass-edit-footer{display:flex;justify-content:flex-end;gap:8px;padding:12px 20px;border-top:1px solid var(--dsw-alias-border-l2,#333)}
.dsh-verypass-edit-hint{flex:1;font-size:11px;color:var(--dsw-alias-brand-primary,#4c78ff);align-self:center}
.dsh-verypass-btn-pri,.dsh-verypass-btn-sec{padding:7px 18px;border-radius:8px;border:none;cursor:pointer;font-size:13px;transition:background .12s}
.dsh-verypass-btn-pri{background:var(--dsw-alias-brand-primary,#4c78ff);color:var(--dsw-alias-label-primary-inverted,#fff)}
.dsh-verypass-btn-pri:hover{filter:brightness(1.15)}
.dsh-verypass-btn-sec{background:var(--dsw-alias-bg-layer-3,#2c2c2e);color:var(--dsw-alias-label-secondary,#ccc)}
.dsh-verypass-btn-sec:hover{background:var(--dsw-alias-bg-hover,#333)}
.dsh-verypass-lock-btn{width:24px;height:24px;margin-left:4px;flex:none;border-radius:8px;border:none;background:transparent;cursor:pointer;display:grid;place-items:center;color:var(--dsw-alias-label-tertiary,#999);transition:background .12s,color .12s}
.dsh-verypass-lock-btn:hover{background:var(--dsw-alias-bg-hover,#333);color:var(--dsw-alias-brand-primary,#4c78ff)}
.dsh-verypass-keycount{font-size:11px;font-weight:400;color:var(--dsw-alias-label-tertiary,#999);margin-left:6px;background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4c78ff) 12%,transparent);padding:0 6px;border-radius:4px}
.dsh-verypass-varlist-modal .dsh-verypass-varlist-box{background:var(--dsw-alias-bg-layer-2,#1c1c1e);border:1px solid var(--dsw-alias-border-l2,#333);border-radius:16px;width:480px;max-width:90vw;box-shadow:0 20px 60px var(--dsw-alias-shadow, rgba(0,0,0,0.35));overflow:hidden}
.dsh-verypass-varlist-body{padding:12px 20px;max-height:60vh;overflow-y:auto}
.dsh-verypass-table{width:100%;border-collapse:collapse;font-size:12px}
.dsh-verypass-table th{padding:8px 10px;text-align:left;font-weight:600;color:var(--dsw-alias-label-secondary,#ccc);border-bottom:1px solid var(--dsw-alias-border-l2,#333)}
.dsh-verypass-table td{padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l3,#2a2a2a)}
.dsh-verypass-td-var{width:50%}
.dsh-verypass-td-var code{font-size:11px;color:var(--dsw-alias-brand-primary,#4c78ff);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4c78ff) 12%,transparent);padding:1px 5px;border-radius:3px}
.dsh-verypass-td-key{font-family:monospace;color:var(--dsw-alias-label-tertiary,#999)}
.dsh-verypass-stats-modal .dsh-verypass-stats-box{background:var(--dsw-alias-bg-layer-2,#1c1c1e);border:1px solid var(--dsw-alias-border-l2,#333);border-radius:16px;width:420px;max-width:90vw;box-shadow:0 20px 60px var(--dsw-alias-shadow, rgba(0,0,0,0.35));overflow:hidden}
.dsh-verypass-stats-body{padding:16px 20px;display:flex;flex-direction:column;gap:12px}
.dsh-verypass-stats-total{font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary,#fff);text-align:center}
.dsh-verypass-stats-empty{text-align:center;padding:20px 0;color:var(--dsw-alias-label-tertiary,#999);font-size:13px}
`;
				document.head.appendChild(style);
				return () => style.remove();
			}, "dsh-verypass: styles");
			ctx.effect(() => {
				const tryInject = () => {
					const settingsArea = document.querySelector("[class*=\"hHd-Xa_settingsArea\"]");
					if (!settingsArea) return null;
					settingsArea.querySelectorAll(".dsh-passpass-lock-btn").forEach((el) => el.remove());
					if (settingsArea.querySelector(".dsh-verypass-lock-btn")) return true;
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
					btn.className = "dsh-verypass-lock-btn";
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
			}, "dsh-verypass: sidebar lock");
			ctx.slots.inject("settings.plugin.item", () => register({
				name: "settings.plugin.item",
				key: "verypass",
				id: "dsh-verypass",
				priority: 210,
				inject: () => ({})
			}, VeryPassPluginCard));
		}
		function syncLockVisibility() {
			document.querySelectorAll(".dsh-verypass-lock-btn").forEach((el) => {
				const btn = el;
				btn.style.color = secretsData.enabled ? "var(--dsw-alias-brand-primary,#4c78ff)" : "var(--dsw-alias-label-tertiary,#999)";
			});
		}
		const VERSION = "0901-0.1.2-alpha.3";
		const REPO_URL = "https://github.com/ideasir/dsh-verypass";
		const LockSvg14 = "<svg viewBox=\"0 0 14 14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"2\" y=\"7\" width=\"10\" height=\"6\" rx=\"1.5\"/><path d=\"M4.5 7V5a2.5 2.5 0 0 1 5 0v2\"/></svg>";
		function VeryPassPluginCard() {
			const [open, setOpen] = react.useState(false);
			const [enabled, setEnabled] = react.useState(secretsData.enabled);
			const [feedback, setFeedback] = react.useState(null);
			const [hasUpdate, setHasUpdate] = react.useState(false);
			const [checking, setChecking] = react.useState(false);
			react.useEffect(() => {
				let alive = true;
				fetch("/plugins/dsh-verypass/update", { cache: "no-store" }).then((r) => r.json()).then((d) => {
					if (alive && d?.ok) setHasUpdate(!!d.hasUpdate);
				}).catch(() => {});
				return () => {
					alive = false;
				};
			}, []);
			const checkUpdate = () => {
				if (checking) return;
				setChecking(true);
				fetch("/plugins/dsh-verypass/update", { cache: "no-store" }).then((r) => r.json()).then((d) => {
					if (d?.ok) setHasUpdate(!!d.hasUpdate);
				}).catch(() => {}).finally(() => setChecking(false));
			};
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
			}, react.createElement("span", { dangerouslySetInnerHTML: { __html: LockSvg } }), "VeryPass"), react.createElement("span", { className: "dsh-mm-version-badge" }, VERSION)), react.createElement("span", { className: "dsh-mm-desc" }, "管理敏感凭证的密码本。")), react.createElement("span", { className: "dsh-mm-btns" }, react.createElement("a", {
				className: "dsh-mm-btn-link",
				href: REPO_URL,
				target: "_blank",
				rel: "noreferrer",
				onClick: (e) => e.stopPropagation(),
				title: "打开 GitHub 仓库",
				onMouseEnter: (e) => {
					e.currentTarget.style.color = "var(--dsw-alias-brand-primary)";
					e.currentTarget.style.borderColor = "var(--dsw-alias-brand-primary)";
				},
				onMouseLeave: (e) => {
					e.currentTarget.style.color = "var(--dsw-alias-label-secondary)";
					e.currentTarget.style.borderColor = "var(--dsw-alias-border-l2)";
				}
			}, "ideasir"), react.createElement("button", {
				type: "button",
				className: "dsh-mm-btn-uninstall",
				onClick: (e) => {
					e.stopPropagation();
					if (confirm("确定卸载 VeryPass 插件？")) {
						setFeedback("已卸载（重启后生效）");
						setTimeout(() => setFeedback(null), 3e3);
					}
				},
				title: "卸载插件",
				onMouseEnter: (e) => {
					e.currentTarget.style.background = "color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent)";
				},
				onMouseLeave: (e) => {
					e.currentTarget.style.background = "var(--dsw-alias-bg-layer-1)";
				}
			}, "卸载"), react.createElement("button", {
				type: "button",
				className: "dsh-mm-btn-update",
				onClick: (e) => {
					e.stopPropagation();
					if (hasUpdate) injectIntoInput("更新当前插件为最新版本");
					else checkUpdate();
				},
				title: hasUpdate ? "发现新版本，点击后会在输入框生成更新提示词" : checking ? "检测中…" : "当前已是最新版本（点击重新检查）",
				style: {
					color: hasUpdate ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-label-tertiary)",
					border: `1px solid ${hasUpdate ? "color-mix(in srgb, var(--dsw-alias-state-success-primary) 45%, transparent)" : "var(--dsw-alias-border-l2)"}`
				},
				onMouseEnter: (e) => {
					e.currentTarget.style.background = "color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)";
				},
				onMouseLeave: (e) => {
					e.currentTarget.style.background = "var(--dsw-alias-bg-layer-1)";
				}
			}, checking ? "检测中…" : hasUpdate ? "有更新" : "已最新"), react.createElement("button", {
				type: "button",
				className: "dsh-mm-btn-update",
				style: {
					color: "var(--dsw-alias-label-secondary)",
					cursor: "pointer"
				},
				onClick: (e) => {
					e.stopPropagation();
					openStats();
				},
				title: "密码本统计",
				onMouseEnter: (e) => {
					e.currentTarget.style.color = "var(--dsw-alias-brand-primary)";
					e.currentTarget.style.borderColor = "var(--dsw-alias-brand-primary)";
				},
				onMouseLeave: (e) => {
					e.currentTarget.style.color = "var(--dsw-alias-label-secondary)";
					e.currentTarget.style.borderColor = "var(--dsw-alias-border-l2)";
				}
			}, "智能检测"), react.createElement("span", {
				className: "dsh-mm-chevron" + (open ? " dsh-mm-chevron-open" : ""),
				style: { transform: open ? "rotate(180deg)" : "none" }
			}, react.createElement(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14)))), open && react.createElement("div", { className: "dsh-mm-body" }, feedback && react.createElement("p", { style: {
				margin: 0,
				fontSize: 13,
				color: feedback.startsWith("已") ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-state-error-primary)"
			} }, feedback), react.createElement("div", { className: "dsh-verypass-status-card" }, react.createElement("button", {
				type: "button",
				role: "switch",
				"aria-checked": enabled,
				onClick: toggle,
				className: "dsh-verypass-switch",
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
					transition: "background .18s cubic-bezier(0.4, 0, 0.2, 1)"
				}
			}, react.createElement("span", { style: {
				position: "absolute",
				top: 3,
				left: enabled ? 23 : 3,
				width: 18,
				height: 18,
				borderRadius: 999,
				background: "var(--dsw-alias-label-primary-inverted)",
				boxShadow: "var(--dsw-alias-shadow, 0 1px 3px rgba(0,0,0,0.3))",
				transition: "left .2s cubic-bezier(0.34, 1.56, 0.64, 1)"
			} })), react.createElement("div", { className: "dsh-verypass-status-info" }, react.createElement("div", { className: "dsh-verypass-status-title" }, enabled ? "VeryPass 已开启" : "VeryPass 已关闭"), react.createElement("div", { className: "dsh-verypass-status-note" }, enabled ? "AI 可以调用 resolve_secret 工具获取脱敏值" : "关闭后 AI 无法调用密码本工具"))), react.createElement("button", {
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
					marginTop: 12,
					background: "var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary))",
					color: "var(--dsw-alias-label-primary-inverted,#fff)",
					cursor: "pointer",
					fontSize: 13,
					fontWeight: 600,
					transition: "filter .12s"
				},
				onMouseEnter: (e) => e.target.style.filter = "brightness(1.1)",
				onMouseLeave: (e) => e.target.style.filter = ""
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