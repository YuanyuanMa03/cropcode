import React, { useMemo, useState } from "react";
import { Box, Text } from "ink";
import * as os from "node:os";
import path from "node:path";
import type { SkillInfo } from "../../session";
import type { ResolvedDeepcodingSettings } from "../../settings";
import { buildSlashCommands, formatSlashCommandDescription } from "../core/slash-commands";
import { getActiveProviderLabel, getActiveModelLabel } from "../../common/providers";
import { ThemedGradient, THEME_COLORS } from "./ThemedGradient";
import { AsciiLogo } from "../../AsciiArt";
import { useAppContext } from "../contexts";

type WelcomeScreenProps = {
  projectRoot: string;
  settings: ResolvedDeepcodingSettings;
  skills: SkillInfo[];
  width: number;
  totalTokens: number;
};

const TITLE_PANEL_WIDTH = 70;
const PANEL_CONTENT_HEIGHT = 10;

const AGRICULTURAL_TIPS = [
  { label: "📊 Data Analysis", description: "Paste CSV data and ask CropCode to clean, analyze and visualize" },
  { label: "🔬 Code Review", description: "Ask CropCode to review your code for bugs and improvements" },
  { label: "🧪 Testing", description: "Generate unit tests for your functions with edge cases" },
  { label: "📄 Documentation", description: "Generate README, API docs, and inline comments" },
  { label: "🔧 Debugging", description: "Paste an error message and get step-by-step fix guidance" },
  { label: "📈 Visualization", description: "Create plots and charts from your data with matplotlib/ggplot" },
  { label: "🐍 Scripting", description: "Automate repetitive tasks with Python or Shell scripts" },
  { label: "📐 Refactoring", description: "Improve code structure while preserving behavior" },
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
            {!compact ? <Text color="gray"> 为农业研究者打造，但能力远不止于此 ⚡</Text> : null}
            {!compact ? <Text> </Text> : null}
            <SettingRow label="Provider" value={getActiveProviderLabel()} />
            <SettingRow label="Model" value={getActiveModelLabel() || settings.model} />
            <SettingRow label="Thinking" value={settings.thinkingEnabled ? `${settings.reasoningEffort}` : "off"} />
            <SettingRow label="Skills" value={`${skills.filter((s) => s.isLoaded).length} loaded`} />
            {totalTokens > 0 ? <SettingRow label="Total Tokens" value={formatTokenCount(totalTokens)} /> : null}
            <SettingRow label="CWD" value={cwd} />
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

  return [...AGRICULTURAL_TIPS, ...slashTips];
}

function randomTipIndex(length: number): number {
  return length > 0 ? Math.floor(Math.random() * length) : 0;
}

function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return String(tokens);
}
