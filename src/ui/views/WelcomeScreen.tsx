import React, { useMemo, useState } from "react";
import { Box, Text } from "ink";
import * as os from "node:os";
import path from "node:path";
import type { SkillInfo } from "../../session";
import type { ResolvedCropcodeSettings } from "../../settings";
import { buildSlashCommands, formatSlashCommandDescription } from "../core/slash-commands";
import { getActiveProviderLabel, getActiveModelLabel } from "../../common/providers";
import { ThemedGradient, THEME_COLORS } from "./ThemedGradient";
import { AsciiLogo } from "../../AsciiArt";
import { useAppContext } from "../contexts";

type WelcomeScreenProps = {
  projectRoot: string;
  settings: ResolvedCropcodeSettings;
  skills: SkillInfo[];
  width: number;
  totalTokens: number;
};

const TITLE_PANEL_WIDTH = 70;
const PANEL_CONTENT_HEIGHT = 10;

const AGRICULTURAL_TIPS = [
  {
    label: "📊 田间数据分析",
    description: "粘贴 CSV/Excel 数据，让 CropCode 清洗、统计分析并可视化产量、土壤、气象数据",
  },
  { label: "🔬 作物模型开发", description: "辅助编写 DSSAT、APSIM、WOFOST 等作物生长模型代码与参数调优" },
  { label: "🛰️ 遥感影像处理", description: "编写 NDVI、LAI 等植被指数计算脚本，处理 Sentinel/Landsat 数据" },
  { label: "🧪 试验设计", description: "生成随机区组、裂区、拉丁方等田间试验设计代码与统计分析脚本" },
  { label: "📈 数据可视化", description: "用 matplotlib/ggplot2 绘制生长曲线、热力图、箱线图等科研图表" },
  { label: "🐍 自动化脚本", description: "自动化数据采集、批处理、定时任务等重复性科研工作" },
  { label: "📄 论文图表", description: "生成符合期刊要求的高清图表、表格和统计报告" },
  { label: "🧬 基因组分析", description: "辅助编写 GWAS、QTL 定位、群体遗传学分析流程代码" },
];

const KEYBOARD_SHORTCUT_TIPS = [
  { label: "Enter", description: "发送消息" },
  { label: "Shift+Enter", description: "换行" },
  { label: "Ctrl+V", description: "粘贴剪贴板图片" },
  { label: "Esc", description: "中断当前生成" },
  { label: "/", description: "打开技能/命令菜单" },
  { label: "Ctrl+D", description: "退出 CropCode" },
];

export function WelcomeScreen({
  projectRoot,
  settings,
  skills,
  width,
  totalTokens,
}: WelcomeScreenProps): React.ReactElement {
  const { version } = useAppContext();
  const tips = useMemo(() => buildWelcomeTips(skills), [skills]);
  const [tipIndex] = useState(() => randomTipIndex(tips.length));
  const compact = width < TITLE_PANEL_WIDTH + 42;
  const cwd = formatHomeRelativePath(projectRoot);
  const tip = tips[Math.min(tipIndex, Math.max(0, tips.length - 1))] ?? tips[0];
  const panelWidth = compact ? undefined : Math.min(width, 72);

  return (
    <Box flexDirection="column" marginY={1}>
      <Box flexDirection="column" width={panelWidth}>
        <Box flexDirection="column" paddingX={1}>
          <Box flexDirection="column" justifyContent="center" paddingX={1}>
            <Box justifyContent="center" width={compact ? undefined : TITLE_PANEL_WIDTH}>
              <ThemedGradient>{AsciiLogo}</ThemedGradient>
            </Box>
          </Box>

          <Box
            borderStyle={"round"}
            borderColor={THEME_COLORS.primary}
            flexDirection="column"
            flexGrow={1}
            height={compact ? undefined : PANEL_CONTENT_HEIGHT}
            marginTop={compact ? 1 : 0}
            paddingX={1}
          >
            <Box flexGrow={1} marginBottom={compact ? 1 : 0}>
              <Text color={THEME_COLORS.primary}>{">"}_ </Text>
              <Text color={THEME_COLORS.primary} bold>
                CropCode
              </Text>
              <Text color="gray"> (v{version || "unknown"})</Text>
              <Text color={THEME_COLORS.gold}> 🌾 AI Coding Agent</Text>
            </Box>
            {!compact ? <Text color="gray"> 面向农业科研，助力田间试验、作物模型与数据分析 ⚡</Text> : null}
            {!compact ? <Text> </Text> : null}
            <SettingRow label="服务商" value={getActiveProviderLabel()} />
            <SettingRow label="模型" value={getActiveModelLabel() || settings.model} />
            <SettingRow
              label="思考"
              value={settings.thinkingEnabled ? `深度思考 · ${settings.reasoningEffort}` : "关闭"}
            />
            <SettingRow label="技能" value={`${skills.filter((s) => s.isLoaded).length} 已加载`} />
            {totalTokens > 0 ? <SettingRow label="Tokens" value={formatTokenCount(totalTokens)} /> : null}
            <SettingRow label="目录" value={cwd} />
          </Box>
        </Box>
      </Box>

      <Box flexDirection="column" width={panelWidth} paddingX={1}>
        {tip ? (
          <Box marginTop={1}>
            <Text dimColor>
              🌱 Tip: {tip.label} — {tip.description}
            </Text>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

function SettingRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <Box flexDirection="row">
      <Box width={12}>
        <Text color={THEME_COLORS.secondary}>{label}</Text>
      </Box>
      <Box flexGrow={1} justifyContent="flex-end">
        <Text>{value}</Text>
      </Box>
    </Box>
  );
}

export function formatHomeRelativePath(value: string, home = os.homedir()): string {
  const normalizedValue = path.resolve(value);
  const normalizedHome = path.resolve(home);
  const relative = path.relative(normalizedHome, normalizedValue);

  if (relative === "") {
    return "~";
  }
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
    return `~${path.sep}${relative}`;
  }
  return normalizedValue;
}

export function buildWelcomeTips(skills: SkillInfo[]): Array<{ label: string; description: string }> {
  const slashTips = buildSlashCommands(skills)
    .filter((item) => item.kind !== "skill" || item.skill?.isLoaded)
    .map((item) => ({
      label: item.label,
      description: formatSlashCommandDescription(item.description),
    }));

  return [...AGRICULTURAL_TIPS, ...KEYBOARD_SHORTCUT_TIPS, ...slashTips];
}

function randomTipIndex(length: number): number {
  return length > 0 ? Math.floor(Math.random() * length) : 0;
}

function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return String(tokens);
}
