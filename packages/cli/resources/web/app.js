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
  function renderSessions(data) {
    const signature = JSON.stringify([data.sessions, data.sessionId, data.busy]);
    if (signature === sessionSignature) return;
    sessionSignature = signature;
    const list = document.createDocumentFragment();
    for (const session of data.sessions) {
      const button = node("button", session.summary || "未命名会话", session.id === data.sessionId ? "selected" : "");
      button.title = session.summary || "未命名会话";
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
    else if (!data.configured)
      notice("尚未配置模型。请在终端运行 cropcode，使用 /login 配置供应商和 API Key，然后刷新此页。");
    else if (data.earlierMessages) notice("当前显示最近 200 条消息，完整历史保存在本地会话记录。");
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
  }
  $("composer").onsubmit = async (event) => {
    event.preventDefault();
    const text = $("prompt").value.trim();
    if (!text || $("send").disabled) return;
    const draft = $("prompt").value;
    forceScroll = true;
    if (await action("/api/prompt", { text, planMode: $("plan-mode").checked })) {
      if ($("prompt").value === draft) $("prompt").value = "";
      saveDraft();
      $("prompt").focus();
    }
  };
  $("prompt").onkeydown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      if (!$("send").disabled) $("composer").requestSubmit();
    }
  };
  function saveDraft() {
    try {
      window.sessionStorage.setItem("cropcode-web-draft", $("prompt").value);
    } catch {
      /* Storage can be disabled. */
    }
  }
  $("prompt").oninput = saveDraft;
  try {
    $("prompt").value = window.sessionStorage.getItem("cropcode-web-draft") || "";
  } catch {
    /* Optional. */
  }
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
  $("toggle-sessions").onclick = () => {
    const expanded = document.body.classList.toggle("show-sessions");
    $("toggle-sessions").setAttribute("aria-expanded", String(expanded));
  };
  window.addEventListener("hashchange", () => {
    if (!new window.URLSearchParams(window.location.hash.slice(1)).has("token")) return;
    events?.close();
    connection(false);
    void connect();
  });
  void connect();
})();
