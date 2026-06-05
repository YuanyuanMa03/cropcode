import { execFileSync, execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";
import ejs from "ejs";
import type { SessionMessage } from "./session";
import { findGitBashPath, resolveShellPath } from "./common/shell-utils";
import { supportsMultimodal } from "./common/model-capabilities";

const COMPACT_PROMPT_BASE = `Your task is to create a detailed summary of the conversation so far, paying close attention to the user's explicit requests and your previous actions.
This summary should be thorough in capturing technical details, code patterns, and architectural decisions that would be essential for continuing development work without losing context.

Before providing your final summary, wrap your analysis in <analysis> tags to organize your thoughts and ensure you've covered all necessary points. In your analysis process:

1. Chronologically analyze each message and section of the conversation. For each section thoroughly identify:
   - The user's explicit requests and intents
   - Your approach to addressing the user's requests
   - Key decisions, technical concepts and code patterns
   - Specific details like:
     - file names
     - full code snippets
     - function signatures
     - file edits
  - Errors that you ran into and how you fixed them
  - Pay special attention to specific user feedback that you received, especially if the user told you to do something differently.
2. Double-check for technical accuracy and completeness, addressing each required element thoroughly.

Your summary should include the following sections:

1. Primary Request and Intent: Capture all of the user's explicit requests and intents in detail
2. Key Technical Concepts: List all important technical concepts, technologies, and frameworks discussed.
3. Files and Code Sections: Enumerate specific files and code sections examined, modified, or created. Pay special attention to the most recent messages and include full code snippets where applicable and include a summary of why this file read or edit is important.
4. Errors and fixes: List all errors that you ran into, and how you fixed them. Pay special attention to specific user feedback that you received, especially if the user told you to do something differently.
5. Problem Solving: Document problems solved and any ongoing troubleshooting efforts.
6. All user messages: List ALL user messages that are not tool results. These are critical for understanding the users' feedback and changing intent.
6. Pending Tasks: Outline any pending tasks that you have explicitly been asked to work on.
7. Current Work: Describe in detail precisely what was being worked on immediately before this summary request, paying special attention to the most recent messages from both user and assistant. Include file names and code snippets where applicable.
8. Optional Next Step: List the next step that you will take that is related to the most recent work you were doing. IMPORTANT: ensure that this step is DIRECTLY in line with the user's most recent explicit requests, and the task you were working on immediately before this summary request. If your last task was concluded, then only list next steps if they are explicitly in line with the users request. Do not start on tangential requests or really old requests that were already completed without confirming with the user first.
                       If there is a next step, include direct quotes from the most recent conversation showing exactly what task you were working on and where you left off. This should be verbatim to ensure there's no drift in task interpretation.

Here's an example of how your output should be structured:

<example>
<analysis>
[Your thought process, ensuring all points are covered thoroughly and accurately]
</analysis>

<summary>
1. Primary Request and Intent:
   [Detailed description]

2. Key Technical Concepts:
   - [Concept 1]
   - [Concept 2]
   - [...]

3. Files and Code Sections:
   - [File Name 1]
      - [Summary of why this file is important]
      - [Summary of the changes made to this file, if any]
      - [Important Code Snippet]
   - [File Name 2]
      - [Important Code Snippet]
   - [...]

4. Errors and fixes:
    - [Detailed description of error 1]:
      - [How you fixed the error]
      - [User feedback on the error if any]
    - [...]

5. Problem Solving:
   [Description of solved problems and ongoing troubleshooting]

6. All user messages: 
    - [Detailed non tool use user message]
    - [...]

7. Pending Tasks:
   - [Task 1]
   - [Task 2]
   - [...]

8. Current Work:
   [Precise description of current work]

9. Optional Next Step:
   [Optional Next step to take]

</summary>`;

const SYSTEM_PROMPT_BASE = `# CropCode — AI 编程助手

你是 CropCode，一个专业的 AI 编程助手。你帮助用户完成编程、调试、重构和代码审查任务。

## 核心原则

1. **先理解，再行动**：在修改代码前，先阅读相关文件理解上下文。不要盲改。
2. **最小改动**：只做任务要求的修改，不要顺便重构或添加无关功能。
3. **数据驱动**：基于代码和事实给出建议，不凭空猜测。不确定时明确说明。
4. **中文优先**：用中文与用户交流，技术术语保留英文。

## 工具使用策略

### 文件操作优先级
- **读取文件** → 用 Read 工具（不要用 cat/head/tail）
- **编辑文件** → 用 Edit 工具（不要用 sed/awk）
- **创建文件** → 用 Write 工具（不要用 echo/cat）
- **搜索代码** → 用 bash + rg（ripgrep），比 grep 快得多
- **查看 JSON** → 用 bash + jq

### 编码工作流
1. 修改代码前，先 Read 相关文件理解上下文
2. 用 Edit 做精确替换，不要用 Write 重写整个文件
3. 修改后运行 typecheck 和测试验证
4. 如果修改了多个相关文件，确保它们之间的一致性

### 并行执行
- 独立的读取操作可以并行执行（同时调用多个 Read）
- 有依赖的操作必须串行（先 mkdir，再 cp）
- 用 && 链接有依赖的 bash 命令

## 安全边界

- 不要执行 rm -rf / 或类似的危险命令
- 不要修改 .git 目录内容
- 不要在代码中硬编码 API 密钥或密码
- 不要执行用户没有明确要求的破坏性操作
- 执行 git push/force-push 前先确认

## 编码规范

- 遵循项目现有的代码风格和约定
- 不要在代码中添加不必要的注释（代码应该自解释）
- 优先编辑现有文件，而不是创建新文件
- 不要添加超出任务要求的功能或抽象

## 错误处理

- 如果工具调用失败，分析错误原因再重试
- 不要无限重试同一个失败的操作
- 遇到权限问题时，告知用户而不是尝试绕过
- 如果任务超出你的能力范围，明确告知用户

## 重要限制

- 严禁编造任何非编程相关的 URL
- 对于编程链接，仅限使用用户提供的上下文或你确定的官方文档主域名
- 不要猜测文件路径或函数名，先确认它们存在`;

type PromptToolOptions = {
  model?: string;
  webSearchEnabled?: boolean;
};

const DEFAULT_SKILL_TEMPLATES = ["agent-drift-guard.md", "plan-and-execute.md", "karpathy-guidelines.md"];

function readToolDocs(extensionRoot: string, options: PromptToolOptions = {}): string {
  const toolsDir = path.join(extensionRoot, "templates", "tools");
  if (!fs.existsSync(toolsDir)) {
    return "";
  }

  const entries = fs.readdirSync(toolsDir);
  const docs = entries
    .filter((entry) => entry.endsWith(".md") || entry.endsWith(".md.ejs"))
    .sort()
    .map((entry) => {
      const fullPath = path.join(toolsDir, entry);
      try {
        const template = fs.readFileSync(fullPath, "utf8");
        const content = entry.endsWith(".ejs")
          ? ejs.render(template, { supportsMultimodal: supportsMultimodal(options.model ?? "") })
          : template;
        return content.trim();
      } catch {
        return "";
      }
    })
    .filter((content) => content.length > 0);

  return docs.join("\n\n");
}

function readDefaultSkillDocs(extensionRoot: string): Array<{ name: string; content: string }> {
  const skillsDir = path.join(extensionRoot, "templates", "skills");
  return DEFAULT_SKILL_TEMPLATES.map((entry) => {
    const fullPath = path.join(skillsDir, entry);
    try {
      return {
        name: path.basename(entry, ".md"),
        content: fs.readFileSync(fullPath, "utf8").trim(),
      };
    } catch {
      return null;
    }
  }).filter((skill): skill is { name: string; content: string } => Boolean(skill?.content));
}

export function getDefaultSkillPrompt(): string {
  const skillDocs = readDefaultSkillDocs(getExtensionRoot());
  if (skillDocs.length === 0) {
    return "";
  }

  const blocks = skillDocs.map(
    (skill) => `<${skill.name}-skill>
${skill.content}
</${skill.name}-skill>`
  );
  return `Use the skill documents below to assist the user:\n${blocks.join("\n\n")}`;
}

function getCurrentDateAndModelPrompt(model?: string): string {
  const date = new Date();
  let prompt = `今天是${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日。随着对话的进行，时间在流逝。`;
  prompt += model ? `\n当前LLM模型为${model}，对话中可通过/model命令切换模型。` : "";
  return prompt;
}

export function getSystemPrompt(_projectRoot: string, options: PromptToolOptions = {}): string {
  const toolDocs = readToolDocs(getExtensionRoot(), options);
  const basePrompt = toolDocs ? `${SYSTEM_PROMPT_BASE}\n\n# Available Tools\n\n${toolDocs}` : SYSTEM_PROMPT_BASE;
  return basePrompt;
}

export function getCompactPrompt(sessionMessages: SessionMessage[]): string {
  const jsonl = sessionMessages
    .map((message) =>
      JSON.stringify({
        id: message.id,
        role: message.role,
        content: message.content,
        contentParams: message.contentParams,
        messageParams: message.messageParams,
        createTime: message.createTime,
      })
    )
    .join("\n");
  return `${COMPACT_PROMPT_BASE}\n\nconversation below:\n\n\`\`\`jsonl\n${jsonl}\n\`\`\``;
}

export function getRuntimeContext(projectRoot: string, model?: string): string {
  const uname = getUnameInfo();
  const shellPath = getShellPathInfo();
  const shellModeOpts = process.platform === "win32" ? { "shell mode": "git-bash" } : {};
  const runtimeVersions = getRuntimeVersionInfo();
  const env = {
    "root path": projectRoot,
    pwd: projectRoot,
    homedir: os.homedir(),
    "system info": uname,
    "shell path": shellPath,
    ...shellModeOpts,
    ...runtimeVersions,
    "command installed": {
      ripgrep: checkToolInstalled("rg"),
      jq: checkToolInstalled("jq"),
    },
  };
  return `${getCurrentDateAndModelPrompt(model)}

# Local Workspace Environment

\`\`\`json
${JSON.stringify(env, null, 2)}
\`\`\``;
}

function checkToolInstalled(tool: string): boolean {
  try {
    if (process.platform === "win32") {
      const bashPath = findGitBashPath();
      execFileSync(bashPath, ["-lc", `command -v ${shellSingleQuote(tool)}`], {
        encoding: "utf8",
        stdio: "ignore",
        windowsHide: true,
      });
      return true;
    }
    execSync(`command -v ${tool}`, { encoding: "utf8", stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function getShellPathInfo(): string {
  try {
    return resolveShellPath();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, "'\"'\"'")}'`;
}

function getRuntimeVersionInfo(): Record<string, string> {
  const versions: Record<string, string> = {};
  const pythonVersion = getCommandVersion("python3", ["--version"]);
  const nodeVersion = getCommandVersion("node", ["--version"]);

  if (pythonVersion) {
    versions["python3 version"] = pythonVersion.replace(/^Python\s+/i, "");
  }
  if (nodeVersion) {
    versions["node version"] = nodeVersion;
  }

  return versions;
}

function getCommandVersion(command: string, args: string[]): string | null {
  try {
    const commandText = [command, ...args].map(shellSingleQuote).join(" ");
    if (process.platform === "win32") {
      return execFileSync(findGitBashPath(), ["-lc", `${commandText} 2>&1`], {
        encoding: "utf8",
        windowsHide: true,
      }).trim();
    }
    return execSync(`${commandText} 2>&1`, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function getUnameInfo(): string {
  try {
    if (process.platform === "win32") {
      return execFileSync(findGitBashPath(), ["-lc", "uname -a"], {
        encoding: "utf8",
        windowsHide: true,
      }).trim();
    }
    return execSync("uname -a", { encoding: "utf8" }).trim();
  } catch {
    return `${os.type()} ${os.release()} ${os.arch()}`;
  }
}

function getExtensionRoot(): string {
  // Prefer `__dirname` which is always available in the CJS bundle output.
  // Fall back to `import.meta.url` for ESM test environments (tsx --test).
  if (typeof __dirname !== "undefined") {
    return path.resolve(__dirname, "..");
  }

  const currentFilePath = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFilePath), "..");
}

export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
      additionalProperties?: boolean;
    };
  };
};

export function getTools(_options: PromptToolOptions = {}, externalTools: ToolDefinition[] = []): ToolDefinition[] {
  const tools: ToolDefinition[] = [
    {
      type: "function",
      function: {
        name: "bash",
        description: "Execute shell commands in a persistent bash session.",
        parameters: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "The shell command to execute",
            },
            description: {
              type: "string",
              description:
                'Clear, concise description of what this command does in active voice. Never use words like "complex" or "risk" in the description - just describe what it does.',
            },
          },
          required: ["command"],
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "AskUserQuestion",
        description:
          "When the task has ambiguities or multiple implementation approaches, use this tool to pause execution and ask the user a question to get clarification or make a decision.",
        parameters: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              description: "Questions to present to the user. Usually only one question is needed at a time.",
              items: {
                type: "object",
                properties: {
                  question: {
                    type: "string",
                    description: "The question to ask the user.",
                  },
                  multiSelect: {
                    type: "boolean",
                    description: "Whether the user may choose multiple options.",
                  },
                  options: {
                    type: "array",
                    description: "A list of predefined options for the user to choose from.",
                    items: {
                      type: "object",
                      properties: {
                        label: {
                          type: "string",
                          description: "The display text for the option.",
                        },
                        description: {
                          type: "string",
                          description:
                            "A detailed explanation or hint about this option to help the user understand what happens if they choose it.",
                        },
                      },
                      required: ["label"],
                    },
                  },
                },
                required: ["question", "options"],
              },
            },
          },
          required: ["questions"],
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "UpdatePlan",
        description:
          "Update the current task plan. The plan argument must be the complete markdown task list to show as the latest progress state.",
        parameters: {
          type: "object",
          properties: {
            plan: {
              type: "string",
              description:
                "The complete markdown task list, including task status markers such as [ ], [>], [x], and optional notes.",
            },
            explanation: {
              type: "string",
              description: "Optional short reason for changing the plan.",
            },
          },
          required: ["plan"],
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "read",
        description: "Read files from the filesystem (text, images, PDFs, notebooks).",
        parameters: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "UNIX-style path to file",
            },
            offset: {
              type: "number",
              description: "Line number to start reading from",
            },
            limit: {
              type: "number",
              description: "Number of lines to read",
            },
            pages: {
              type: "string",
              description: 'Page range for PDF files (e.g., "1-5", "3", "10-20"). Only applicable to PDF files.',
            },
          },
          required: ["file_path"],
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "write",
        description: "Create files or overwrite them with a complete string payload. Prefer edit for existing files.",
        parameters: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "Absolute path to file",
            },
            content: {
              type: "string",
              description: "Complete file content as a single string. Serialize JSON documents before writing.",
            },
          },
          required: ["file_path", "content"],
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "edit",
        description: "Perform scoped string replacements in files.",
        parameters: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "Absolute path to file. Optional when snippet_id is provided.",
            },
            snippet_id: {
              type: "string",
              description:
                "Snippet id returned by the Read or Edit tool to scope the search range after a partial read.",
            },
            old_string: {
              type: "string",
              description: "Exact text to replace inside the file or snippet scope",
            },
            new_string: {
              type: "string",
              description: "Replacement text (must differ from old_string)",
            },
            replace_all: {
              type: "boolean",
              description: "Replace all occurences of old_string (default false)",
              default: false,
            },
            expected_occurrences: {
              type: "number",
              description: "Expected number of matches, especially useful as a safety check with replace_all",
            },
          },
          required: ["old_string", "new_string"],
          additionalProperties: false,
        },
      },
    },
  ];

  tools.push({
    type: "function",
    function: {
      name: "WebSearch",
      description: "Perform web searching using a natural language query.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "A search query phrased as a clear, specific natural language question or statement that includes key context.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  });

  for (const tool of externalTools) {
    tools.push(tool);
  }

  // Sort alphabetically for prompt cache stability (same order = cache hit)
  tools.sort((a, b) => a.function.name.localeCompare(b.function.name));

  return tools;
}
