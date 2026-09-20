/* Local browser client. Model and tool output are rendered as text, never HTML. */
(() => {
  const $ = (id) => document.getElementById(id);
  let state = null;
  let connected = false;
  let submitting = false;
  let events;
  let sessionSignature = "";
  let permissionSignature = "";
  let questionSignature = "";
  let forceScroll = false;
  const messageNodes = new Map();

  // Composer trigger pipeline: "/" opens commands, "@" opens project file references.
  // Keyboard arbitration follows the combobox pattern: focus stays in the editor and
  // arrow/enter/tab/escape are intercepted while the menu is open, always IME-guarded.
  // The command list itself comes from the shared registry via /api/commands; this
  // table only maps registry action ids to local handlers.
  const commandActions = {
    "toggle-plan": () => {
      $("plan-mode").checked = !$("plan-mode").checked;
      notice($("plan-mode").checked ? "已开启 Plan 规划模式。" : "已关闭 Plan 规划模式。");
    },
    "new-session": () => {
      forceScroll = true;
      void action("/api/session", { target: null });
    },
    continue: () => submitCommandText("/continue"),
    interrupt: () => {
      if (state?.busy) void action("/api/interrupt", {});
      else notice("当前没有正在执行的任务。", true);
    },
  };
  let commandRegistry = [];
  const menu = { open: false, mode: null, token: null, items: [], highlighted: 0 };
  let filesGeneration = 0;
  let filesTimer = 0;

  function submitCommandText(text) {
    if (!connected || !state) return;
    if (state.busy) {
      notice("当前任务正在执行，请先停止或等待完成。", true);
      return;
    }
    if (!state.configured) {
      notice("尚未配置模型。请在终端运行 cropcode，通过 /login 配置后刷新此页。", true);
      return;
    }
    forceScroll = true;
    void action("/api/prompt", { text, planMode: $("plan-mode").checked });
  }

  // ---- Model settings plane: providers, write-only key, model discovery ----
  let settingsOpened = false;

  function closeSettings() {
    $("settings").hidden = true;
  }
  async function openSettings() {
    settingsOpened = true;
    $("settings").hidden = false;
    $("settings-body").replaceChildren(node("p", "正在读取配置…", "muted"));
    try {
      const [summary, providers] = await Promise.all([request("/api/settings"), request("/api/settings/providers")]);
      if (!$("settings").hidden) renderSettings(summary, (providers.providers || []).slice());
    } catch (error) {
      $("settings-body").replaceChildren(node("p", error.message, "muted"));
    }
  }
  function renderSettings(summary, providers) {
    const body = $("settings-body");
    body.replaceChildren();
    const form = node("form");
    const selected = { providerId: summary.providerId, model: summary.model };
    const field = (text, control) => {
      const label = node("label", undefined, "settings-field");
      label.append(node("span", text), control);
      return label;
    };

    form.append(
      node(
        "p",
        "当前:" + summary.providerLabel + " · " + summary.model + (summary.configured ? "" : "(尚未配置密钥)"),
        "muted"
      )
    );

    const modelSelect = node("select");
    const keyInput = node("input");
    const keyHint = node("small", "", "muted");
    keyInput.type = "password";
    keyInput.autocomplete = "new-password";
    keyInput.placeholder = "API Key";
    const think = node("input");
    think.type = "checkbox";
    think.checked = summary.thinkingEnabled === true;
    const effort = node("select");
    for (const [value, label] of [
      ["low", "低"],
      ["high", "高"],
      ["max", "最高"],
    ]) {
      const option = node("option", label);
      option.value = value;
      effort.append(option);
    }
    effort.value = ["low", "high", "max"].includes(summary.reasoningEffort) ? summary.reasoningEffort : "high";

    function fillModels(models, preferred) {
      modelSelect.replaceChildren();
      const seen = new Set();
      const list = [...models];
      if (preferred && !list.some((model) => model.id === preferred)) list.unshift({ id: preferred });
      for (const model of list) {
        if (seen.has(model.id)) continue;
        seen.add(model.id);
        const option = node("option", model.label || model.id + (model.unknown ? "(接口发现)" : ""));
        option.value = model.id;
        modelSelect.append(option);
      }
      if (preferred && seen.has(preferred)) modelSelect.value = preferred;
      else if (modelSelect.firstChild) modelSelect.value = modelSelect.firstChild.value;
    }
    function updateKeyHint() {
      if (selected.providerId === summary.providerId && summary.configured)
        keyHint.textContent = "留空保持当前密钥不变。";
      else keyHint.textContent = "必填:获取地址见供应商说明。";
    }

    const cards = node("div", undefined, "provider-cards");
    for (const provider of providers) {
      const card = node(
        "button",
        undefined,
        "provider-card" + (provider.id === selected.providerId ? " selected" : "")
      );
      card.type = "button";
      card.append(node("strong", provider.label), node("small", provider.models.length + " 个预设模型"));
      card.onclick = () => {
        selected.providerId = provider.id;
        // Re-picking the current provider keeps the active model; switching picks its default.
        selected.model =
          provider.id === summary.providerId && provider.models.some((model) => model.id === summary.model)
            ? summary.model
            : provider.models[0]?.id || "";
        for (const other of Array.from(cards.children)) other.classList.remove("selected");
        card.classList.add("selected");
        fillModels(provider.models, selected.model);
        updateKeyHint();
      };
      cards.append(card);
    }

    const currentProvider = providers.find((provider) => provider.id === summary.providerId);
    fillModels(currentProvider?.models || [], summary.model);
    updateKeyHint();

    const discover = node("button", "拉取模型列表");
    discover.type = "button";
    discover.onclick = async () => {
      discover.disabled = true;
      discover.textContent = "正在拉取…";
      try {
        const data = await request("/api/settings/models");
        if (data.models?.length) fillModels(data.models, modelSelect.value);
        else notice("供应商未返回模型列表。", true);
      } catch (error) {
        notice(error.message, true);
      }
      discover.disabled = false;
      discover.textContent = "拉取模型列表";
    };

    const modelRow = node("div", undefined, "settings-row");
    modelRow.append(modelSelect, discover);
    const thinkRow = node("div", undefined, "settings-row settings-inline");
    thinkRow.append(think, document.createTextNode("启用思考(reasoning)"));
    const actions = node("div", undefined, "settings-actions");
    const save = node("button", "保存并启用", "primary");
    save.type = "submit";
    actions.append(save);
    const keyWrap = node("div", undefined, "settings-key");
    keyWrap.append(keyInput, keyHint);

    form.append(
      cards,
      field("模型", modelRow),
      field("API Key(只写,不回显)", keyWrap),
      thinkRow,
      field("思考力度", effort),
      actions
    );
    form.onsubmit = async (event) => {
      event.preventDefault();
      if (!selected.providerId || !modelSelect.value) {
        notice("请选择供应商与模型。", true);
        return;
      }
      save.disabled = true;
      try {
        const result = await request("/api/settings/provider", {
          providerId: selected.providerId,
          apiKey: keyInput.value,
          model: modelSelect.value,
          thinkingEnabled: think.checked,
          reasoningEffort: effort.value,
          sessionId: state?.sessionId ?? null,
        });
        notice("模型配置已更新。");
        closeSettings();
        render(await request("/api/state"));
        $("model").textContent = result.providerLabel + " · " + result.model;
      } catch (error) {
        notice(error.message, true);
      }
      save.disabled = false;
    };
    body.append(form);
  }

  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function notice(text, isError = false) {
    $("notice").hidden = !text;
    $("notice").textContent = text;
    $("notice").className = isError ? "notice error" : "notice";
  }
  function connection(value) {
    connected = value;
    $("connection-label").textContent = value ? "本地连接" : "连接已断开";
    $("connection-dot").classList.toggle("offline", !value);
    controls();
  }
  async function request(path, body) {
    const response = await fetch(
      path,
      body === undefined
        ? {}
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
    );
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || "请求失败");
      error.status = response.status;
      throw error;
    }
    return data;
  }
  async function action(path, values) {
    if (submitting || !connected || !state) return false;
    submitting = true;
    controls();
    try {
      await request(path, { ...values, sessionId: state.sessionId });
      render(await request("/api/state"));
      return true;
    } catch (error) {
      notice(error.message, true);
      return false;
    } finally {
      submitting = false;
      controls();
    }
  }
  function controls() {
    const ready = connected && state;
    $("prompt").disabled = !ready || !state.configured;
    if ($("prompt").disabled) closeMenu();
    $("send").disabled = !ready || !state.configured || state.busy || submitting || state.status === "ask_permission";
    $("stop").hidden = !state?.busy;
    $("stop").disabled = !ready || submitting;
    $("new-session").disabled = !ready || state.busy || submitting;
    $("plan-mode").disabled = !ready || state.busy || submitting;
    $("implement-plan").disabled = !ready || state.busy || submitting;
    for (const button of $("permissions").querySelectorAll("button"))
      button.disabled = !ready || state.busy || submitting;
    for (const button of $("questions").querySelectorAll("button"))
      button.disabled = !ready || state.busy || submitting;
  }
  function inline(parent, text) {
    // A small text-only Markdown subset: emphasis and inline code. No HTML/URL evaluation.
    const pieces = text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g);
    for (const piece of pieces) {
      if (piece.startsWith("`") && piece.endsWith("`")) parent.append(node("code", piece.slice(1, -1)));
      else if (piece.startsWith("**") && piece.endsWith("**")) parent.append(node("strong", piece.slice(2, -2)));
      else parent.append(document.createTextNode(piece));
    }
  }
  function markdown(text) {
    const fragment = document.createDocumentFragment();
    const parts = text.split(/(```[^\n]*\n[\s\S]*?(?:```|$))/g);
    for (const part of parts) {
      if (!part) continue;
      if (part.startsWith("```")) {
        const code = part.slice(part.indexOf("\n") + 1).replace(/```$/, "");
        const pre = node("pre");
        pre.append(node("code", code));
        fragment.append(pre);
      } else {
        for (const paragraph of part.split(/\n\s*\n/)) {
          if (!paragraph.trim()) continue;
          const heading = paragraph.match(/^(#{1,4})\s+([^\n]+)$/);
          const block = node(heading ? "h" + Math.min(heading[1].length + 1, 4) : "p");
          inline(block, heading ? heading[2] : paragraph);
          fragment.append(block);
        }
      }
    }
    return fragment;
  }
  function messageView(message) {
    if (message.role === "tool" || message.thinking || message.role === "system") {
      const details = node("details", undefined, "tool-card");
      let title = message.thinking ? "思考摘要" : message.role === "system" ? "任务信息" : "工具结果";
      if (message.role === "tool") {
        try {
          const result = JSON.parse(message.content);
          title = (result.ok === false ? "执行失败 · " : "工具 · ") + (result.name || "结果");
          if (result.ok === false) details.open = true;
        } catch {
          /* Plain-text tool results are also valid. */
        }
      }
      details.append(node("summary", title), node("pre", message.content));
      if (message.truncated) details.append(node("p", "显示内容已截断，完整结果保存在本地会话记录。", "muted"));
      return details;
    }
    const article = node("article", undefined, "message " + message.role);
    article.append(node("div", message.role === "user" ? "你" : "CropCode", "message-label"));
    const content = node("div", undefined, "prose");
    if (message.role === "user") content.textContent = message.content;
    else content.append(markdown(message.content));
    article.append(content);
    const copy = node("button", "复制", "copy-button");
    copy.type = "button";
    copy.title = "复制这条消息";
    copy.onclick = () => {
      const clipboard = window.navigator.clipboard;
      if (!clipboard) {
        notice("当前浏览器不支持一键复制，请手动选择文本。", true);
        return;
      }
      clipboard.writeText(message.content || "").then(
        () => {
          copy.textContent = "已复制";
          window.setTimeout(() => {
            copy.textContent = "复制";
          }, 1600);
        },
        () => notice("复制失败，请手动选择文本复制。", true)
      );
    };
    article.append(copy);
    if (message.truncated) article.append(node("p", "显示内容已截断，完整结果保存在本地会话记录。", "muted"));
    return article;
  }
  function renderMessages(data) {
    const keep = new Set();
    for (const message of data.messages) {
      keep.add(message.id);
      const signature = JSON.stringify(message);
      const previous = messageNodes.get(message.id);
      if (previous?.signature === signature) continue;
      const element = messageView(message);
      if (previous) {
        element.open = previous.element.open;
        previous.element.replaceWith(element);
      } else $("messages").append(element);
      messageNodes.set(message.id, { element, signature });
    }
    for (const [id, item] of messageNodes) {
      if (!keep.has(id)) {
        item.element.remove();
        messageNodes.delete(id);
      }
    }
    // The persisted user message replaces its temporary ID after a turn completes.
    // Reconcile order as well as content so it stays before the assistant reply.
    let cursor = $("messages").firstChild;
    for (const message of data.messages) {
      const element = messageNodes.get(message.id).element;
      if (element !== cursor) $("messages").insertBefore(element, cursor);
      cursor = element.nextSibling;
    }
    $("welcome").hidden = data.messages.length > 0 || data.busy;
    $("live").hidden = !data.live?.text;
    $("live-content").textContent = data.live?.text || "";
    $("process-output").hidden = !data.output;
    $("output-content").textContent = data.output || "";
  }
  function relativeTime(value) {
    const time = Date.parse(value);
    if (!Number.isFinite(time)) return "";
    const minutes = Math.round((Date.now() - time) / 60000);
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return minutes + " 分钟前";
    const hours = Math.round(minutes / 60);
    if (hours < 24) return hours + " 小时前";
    const days = Math.round(hours / 24);
    if (days < 7) return days + " 天前";
    return new Date(time).toLocaleDateString();
  }
  function renderSessions(data) {
    const signature = JSON.stringify([data.sessions, data.sessionId, data.busy]);
    if (signature === sessionSignature) return;
    sessionSignature = signature;
    const list = document.createDocumentFragment();
    for (const session of data.sessions) {
      const button = node("button", undefined, session.id === data.sessionId ? "selected" : "");
      button.title = session.summary || "未命名会话";
      button.append(
        node("span", session.summary || "未命名会话", "session-summary"),
        node("span", relativeTime(session.updateTime), "session-time")
      );
      button.disabled = data.busy;
      button.onclick = () => {
        forceScroll = true;
        void action("/api/session", { target: session.id }).then((ok) => {
          if (ok) {
            document.body.classList.remove("show-sessions");
            $("toggle-sessions").setAttribute("aria-expanded", "false");
          }
        });
      };
      list.append(button);
    }
    if (!data.sessions.length) list.append(node("p", "从一次对话开始。", "muted"));
    $("sessions").replaceChildren(list);
  }
  function renderPermissions(data) {
    const signature = JSON.stringify([data.sessionId, data.status, data.permissions, data.busy]);
    if (signature === permissionSignature) return;
    permissionSignature = signature;
    const panel = $("permissions");
    panel.hidden = data.status !== "ask_permission" || !data.permissions.length || data.busy;
    if (panel.hidden) return;
    panel.replaceChildren(node("h3", "这一步需要你的确认"), node("p", "以下授权仅适用于列出的这批工具调用。"));
    for (const permission of data.permissions) {
      panel.append(
        node("strong", permission.name),
        node("pre", permission.command),
        node("p", permission.description || permission.scopes.join(" · "))
      );
    }
    for (const [decision, label] of [
      ["allow", "允许本次"],
      ["deny", "拒绝本次"],
    ]) {
      const button = node("button", label, decision === "allow" ? "primary" : "");
      button.onclick = () =>
        action("/api/permission", { decision, toolCallIds: data.permissions.map((item) => item.toolCallId) });
      panel.append(button);
    }
  }
  function renderQuestions(data) {
    const signature = JSON.stringify([data.sessionId, data.question, data.busy]);
    if (signature === questionSignature) return;
    questionSignature = signature;
    const panel = $("questions");
    panel.hidden = !data.question || data.busy;
    if (panel.hidden) return;
    const form = node("form");
    panel.replaceChildren(node("h3", "补充信息，再继续"), form);
    for (const [index, question] of data.question.questions.entries()) {
      const field = node("fieldset");
      field.append(node("legend", question.question));
      for (const option of question.options) {
        const label = node("label");
        const input = node("input");
        input.type = question.multiSelect ? "checkbox" : "radio";
        input.name = "question-" + index;
        input.value = option.label;
        label.append(
          input,
          document.createTextNode(option.label + (option.description ? " — " + option.description : ""))
        );
        field.append(label);
      }
      const other = node("textarea");
      other.rows = 1;
      other.maxLength = 2000;
      other.placeholder = "也可以填写自己的答案";
      other.setAttribute("aria-label", question.question + "：补充答案");
      field.append(other);
      form.append(field);
    }
    const button = node("button", "提交回答", "primary");
    button.type = "submit";
    form.append(button);
    form.onsubmit = (event) => {
      event.preventDefault();
      const answers = Array.from(form.querySelectorAll("fieldset")).map((field, index) => {
        const selected = Array.from(field.querySelectorAll("input:checked")).map((input) => input.value);
        const other = field.querySelector("textarea").value.trim();
        if (other) selected.push(other);
        return { question: data.question.questions[index].question, answer: selected.join("；") };
      });
      if (answers.some((answer) => !answer.answer)) {
        notice("请为每个问题选择或填写答案。", true);
        return;
      }
      void action("/api/prompt", {
        text: answers.map((item) => item.question + "\n回答：" + item.answer).join("\n\n"),
        planMode: data.planMode,
      });
    };
  }
  function render(data) {
    const conversation = $("conversation");
    const atBottom = conversation.scrollHeight - conversation.scrollTop - conversation.clientHeight < 100;
    const changedSession = state && state.sessionId !== data.sessionId;
    if (changedSession) {
      messageNodes.clear();
      $("messages").replaceChildren();
    }
    if (!state || changedSession || state.planMode !== data.planMode) $("plan-mode").checked = data.planMode;
    state = data;
    $("project-name").textContent = data.projectRoot.split(/[\\/]/).filter(Boolean).at(-1) || data.projectRoot;
    $("project-name").title = data.projectRoot;
    $("model").textContent = data.provider + " · " + data.model;
    $("model").title = data.projectRoot;
    $("usage").textContent = data.tokens == null ? "" : data.tokens.toLocaleString() + " tokens";
    const labels = {
      completed: "本轮已完成",
      interrupted: "已停止，可继续对话",
      failed: "本轮执行失败",
      waiting_for_user: "等待补充信息",
      ask_permission: "等待权限确认",
      permission_denied: "已拒绝权限",
    };
    $("activity").textContent = data.busy ? data.progress?.label || "正在处理任务" : labels[data.status] || "准备就绪";
    $("activity-dot").classList.toggle("offline", data.busy);
    if (data.error || data.failReason) notice(data.error || data.failReason, true);
    else if (!data.configured) {
      notice("尚未配置模型:点击下方供应商信息或自动弹出的面板完成配置。");
      if (!settingsOpened && $("settings").hidden) void openSettings();
    } else if (data.earlierMessages) notice("当前显示最近 200 条消息，完整历史保存在本地会话记录。");
    else notice("");
    renderSessions(data);
    renderMessages(data);
    renderPermissions(data);
    renderQuestions(data);
    $("plan-ready").hidden = !data.proposedPlan;
    controls();
    if (atBottom || changedSession || forceScroll) {
      conversation.scrollTop = conversation.scrollHeight;
      forceScroll = false;
    }
    $("jump-latest").hidden = conversation.scrollHeight - conversation.scrollTop - conversation.clientHeight < 100;
  }
  function tokenAtCaret() {
    const input = $("prompt");
    const caret = input.selectionStart;
    if (caret === null || caret !== input.selectionEnd) return null;
    const text = input.value;
    const leading = text.slice(0, caret).match(/\S*$/)[0];
    const start = caret - leading.length;
    const token = leading + text.slice(caret).match(/^\S*/)[0];
    // A trigger must start a word: "user@host" and pasted URLs never open a menu.
    if (!token || (start > 0 && !/\s/.test(text[start - 1]))) return null;
    if (token.startsWith("/")) return { mode: "slash", query: token.slice(1), start, end: start + token.length };
    if (token.startsWith("@") && !token.startsWith('@"'))
      return { mode: "mention", query: token.slice(1), start, end: start + token.length };
    return null;
  }
  function closeMenu() {
    if (!menu.open && menuList().hidden) return;
    if (filesTimer) window.clearTimeout(filesTimer);
    filesGeneration++;
    menu.open = false;
    menu.mode = null;
    menu.token = null;
    menu.items = [];
    menu.highlighted = 0;
    const list = menuList();
    list.hidden = true;
    list.replaceChildren();
    $("prompt").removeAttribute("aria-expanded");
  }
  function menuList() {
    return $("trigger-menu");
  }
  function pickable(item) {
    return item && (item.kind === "command" || item.kind === "file");
  }
  function renderMenuItems(items) {
    menu.items = items;
    menu.highlighted = Math.min(menu.highlighted, Math.max(items.length - 1, 0));
    const list = menuList();
    const rows = items.map((item, index) => {
      const row = node("div", undefined, "trigger-option" + (index === menu.highlighted ? " highlighted" : ""));
      row.setAttribute("role", "option");
      if (index === menu.highlighted) row.setAttribute("aria-selected", "true");
      if (item.kind === "command") {
        row.append(node("span", "/" + item.name, "option-label"), node("span", item.description, "option-desc"));
      } else if (item.kind === "file") {
        const clean = item.path.endsWith("/") ? item.path.slice(0, -1) : item.path;
        const slash = clean.lastIndexOf("/");
        const base = (clean.slice(slash + 1) || clean) + (item.type === "directory" ? "/" : "");
        row.append(node("span", base, "option-label"), node("span", clean.slice(0, slash + 1), "option-desc"));
      } else {
        row.classList.add("static");
        row.append(
          node(
            "span",
            item.kind === "pending" ? "正在搜索文件…" : item.kind === "empty" ? "没有匹配的文件" : "文件搜索暂不可用",
            "option-desc"
          )
        );
      }
      if (pickable(item)) {
        row.onclick = () => pickMenuItem(index);
        row.onmouseenter = () => {
          if (menu.highlighted !== index) {
            menu.highlighted = index;
            highlightMenu();
          }
        };
      }
      return row;
    });
    // The card owns a non-scrolling footer; only the option list scrolls.
    let viewport = list.querySelector(".trigger-scroll");
    if (!viewport) {
      viewport = node("div", undefined, "trigger-scroll");
      // The fade hint disappears once the viewport reaches the final row.
      viewport.onscroll = () => {
        list.dataset.overflow = viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight ? "1" : "0";
      };
      const footer = node("div", undefined, "trigger-footer");
      footer.setAttribute("aria-hidden", "true");
      for (const [keys, label] of [
        [["↑", "↓"], "选择"],
        [["↵"], "确认"],
        [["esc"], "关闭"],
      ]) {
        const group = node("span");
        for (const key of keys) group.append(node("span", key, "key"));
        group.append(document.createTextNode(" " + label));
        footer.append(group);
      }
      list.replaceChildren(viewport, footer);
    }
    viewport.replaceChildren(...rows);
    list.hidden = false;
    list.dataset.overflow = viewport.scrollHeight > viewport.clientHeight ? "1" : "0";
    $("prompt").setAttribute("aria-expanded", "true");
  }
  function highlightMenu() {
    menuList()
      .querySelectorAll(".trigger-option")
      .forEach((row, index) => {
        const on = index === menu.highlighted;
        row.classList.toggle("highlighted", on);
        if (on) row.setAttribute("aria-selected", "true");
        else row.removeAttribute("aria-selected");
      });
    menuList().querySelectorAll(".trigger-option")[menu.highlighted]?.scrollIntoView({ block: "nearest" });
  }
  function consumeMenuToken() {
    const input = $("prompt");
    if (!menu.token) return;
    const text = input.value;
    let end = menu.token.end;
    if (text[end] === " ") end++;
    input.value = text.slice(0, menu.token.start) + text.slice(end);
    input.setSelectionRange(menu.token.start, menu.token.start);
    saveDraft();
    autosize();
  }
  function insertMention(path) {
    const input = $("prompt");
    const mention = /[\s"]/.test(path) ? '@"' + path.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"' : "@" + path;
    const text = input.value;
    const start = menu.token ? menu.token.start : (input.selectionStart ?? text.length);
    let end = menu.token ? menu.token.end : start;
    if (text[end] === " ") end++;
    input.value = text.slice(0, start) + mention + " " + text.slice(end);
    const caret = start + mention.length + 1;
    input.setSelectionRange(caret, caret);
    saveDraft();
    autosize();
    closeMenu();
    input.focus();
  }
  function pickMenuItem(index) {
    const item = menu.items[index];
    if (!pickable(item)) return;
    if (item.kind === "command") {
      consumeMenuToken();
      closeMenu();
      $("prompt").focus();
      item.run();
    } else {
      insertMention(item.path);
    }
  }
  function refreshMenu() {
    const input = $("prompt");
    if (input.disabled) {
      closeMenu();
      return;
    }
    const found = tokenAtCaret();
    if (!found) {
      closeMenu();
      return;
    }
    const modeChanged = menu.mode !== found.mode;
    menu.token = found;
    menu.open = true;
    menu.mode = found.mode;
    if (modeChanged) menu.highlighted = 0;
    if (found.mode === "slash") {
      const query = found.query.toLowerCase();
      const items = commandRegistry
        .filter((command) => command.name.includes(query) && commandActions[command.action])
        .map((command) => ({
          kind: "command",
          name: command.name,
          description: command.description,
          run: commandActions[command.action],
        }));
      if (!items.length) {
        closeMenu();
        return;
      }
      renderMenuItems(items);
      return;
    }
    if (modeChanged) renderMenuItems([{ kind: "pending" }]);
    if (filesTimer) window.clearTimeout(filesTimer);
    const generation = ++filesGeneration;
    const query = found.query;
    filesTimer = window.setTimeout(async () => {
      try {
        const data = await request("/api/files", { query, sessionId: state?.sessionId });
        if (generation !== filesGeneration || !menu.open || menu.mode !== "mention") return;
        const items = (data.items || []).map((entry) => ({ kind: "file", path: entry.path, type: entry.type }));
        renderMenuItems(items.length ? items : [{ kind: "empty" }]);
      } catch {
        if (generation === filesGeneration && menu.open && menu.mode === "mention")
          renderMenuItems([{ kind: "error" }]);
      }
    }, 120);
  }
  $("composer").onsubmit = async (event) => {
    event.preventDefault();
    const text = $("prompt").value.trim();
    if (!text || $("send").disabled) return;
    closeMenu();
    const draft = $("prompt").value;
    forceScroll = true;
    if (await action("/api/prompt", { text, planMode: $("plan-mode").checked })) {
      if ($("prompt").value === draft) $("prompt").value = "";
      saveDraft();
      autosize();
      $("prompt").focus();
    }
  };
  $("prompt").onkeydown = (event) => {
    if (menu.open && menu.items.length && !event.isComposing) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const count = menu.items.length;
        const delta = event.key === "ArrowDown" ? 1 : -1;
        menu.highlighted = (menu.highlighted + delta + count) % count;
        highlightMenu();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        if (pickable(menu.items[menu.highlighted])) pickMenuItem(menu.highlighted);
        else closeMenu();
        return;
      }
      if (event.key === "Enter" && pickable(menu.items[menu.highlighted])) {
        event.preventDefault();
        pickMenuItem(menu.highlighted);
        return;
      }
    }
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      if (!$("send").disabled) $("composer").requestSubmit();
    }
  };
  function autosize() {
    const input = $("prompt");
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 200) + "px";
  }
  function saveDraft() {
    try {
      window.sessionStorage.setItem("cropcode-web-draft", $("prompt").value);
    } catch {
      /* Storage can be disabled. */
    }
  }
  $("prompt").oninput = () => {
    saveDraft();
    autosize();
    refreshMenu();
  };
  try {
    $("prompt").value = window.sessionStorage.getItem("cropcode-web-draft") || "";
  } catch {
    /* Optional. */
  }
  autosize();
  document.addEventListener("pointerdown", (event) => {
    if (menu.open && event.target !== $("prompt") && !menuList().contains(event.target)) closeMenu();
  });
  $("new-session").onclick = () => {
    forceScroll = true;
    void action("/api/session", { target: null });
  };
  $("stop").onclick = () => action("/api/interrupt", {});
  $("implement-plan").onclick = () => action("/api/prompt", { text: "实现此方案，并验证实际结果。", planMode: false });
  for (const button of document.querySelectorAll("[data-prompt]")) {
    button.onclick = () => {
      $("prompt").value = button.dataset.prompt;
      saveDraft();
      $("prompt").focus();
    };
  }
  async function connect() {
    try {
      const token = new window.URLSearchParams(window.location.hash.slice(1)).get("token");
      if (token) {
        await request("/api/connect", { token });
        window.history.replaceState(null, "", "/");
      }
      render(await request("/api/state"));
      commandRegistry = (await request("/api/commands")).commands || [];
      connection(true);
      events = new window.EventSource("/api/events");
      events.addEventListener("state", (event) => {
        connection(true);
        render(JSON.parse(event.data));
      });
      events.onerror = async () => {
        connection(false);
        $("activity").textContent = "连接中断，正在尝试恢复…";
        try {
          await request("/api/state");
        } catch (error) {
          if (error.status === 401 || error.status === 403) {
            events.close();
            notice(error.message, true);
          }
        }
      };
    } catch (error) {
      connection(false);
      notice(error.message, true);
    }
  }
  $("model").onclick = () => void openSettings();
  $("settings-close").onclick = closeSettings;
  $("settings").onclick = (event) => {
    if (event.target === $("settings")) closeSettings();
  };
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("settings").hidden) {
      event.preventDefault();
      closeSettings();
    }
  });
  $("toggle-sessions").onclick = () => {
    const expanded = document.body.classList.toggle("show-sessions");
    $("toggle-sessions").setAttribute("aria-expanded", String(expanded));
  };
  $("conversation").addEventListener("scroll", () => {
    const el = $("conversation");
    $("jump-latest").hidden = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  });
  $("jump-latest").onclick = () => {
    forceScroll = true;
    $("conversation").scrollTo({ top: $("conversation").scrollHeight, behavior: "smooth" });
  };
  window.addEventListener("hashchange", () => {
    if (!new window.URLSearchParams(window.location.hash.slice(1)).has("token")) return;
    events?.close();
    connection(false);
    void connect();
  });
  void connect();
})();
