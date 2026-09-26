/** Offline design fixtures. Nothing in this package runs tools or contacts a model. */
export type Scene = "home" | "task" | "permission" | "files" | "settings" | "terminal";
export type PreviewState = "ready" | "loading" | "empty" | "error";
export type Theme = "light" | "dark";
export type TaskStatus = "ready" | "waiting" | "done" | "cancelled";

export const scenes: { id: Scene; label: string }[] = [
  { id: "home", label: "项目首页" },
  { id: "task", label: "任务对话" },
  { id: "permission", label: "等待授权" },
  { id: "files", label: "文件与变更" },
  { id: "settings", label: "设置" },
  { id: "terminal", label: "终端界面" },
];
export const projects = [
  { name: "RiceGrow", path: "~/Research/RiceGrow", description: "水稻生长与甲烷排放模型", initial: "R" },
  { name: "CropMath", path: "~/Research/CropMath", description: "作物试验数据与科研绘图", initial: "C" },
];
export const tasks = [
  { id: "methane", title: "检查甲烷模块的水分响应", time: "刚刚", project: 0 },
  { id: "weather", title: "整理气象数据的缺测值", time: "2 小时前", project: 0 },
  { id: "plot", title: "绘制不同处理的产量对比", time: "昨天", project: 1 },
];
export const files = [
  {
    path: "src/model/methane.py",
    kind: "Python",
    content:
      'def moisture_factor(water_filled_pore_space):\n    """Convert water fraction to the model response."""\n    saturation = min(1.0, max(0.0, water_filled_pore_space))\n    return saturation ** 2\n\n\ndef methane_flux(carbon, temperature, moisture):\n    response = moisture_factor(moisture)\n    return carbon * temperature * response\n',
  },
  {
    path: "tests/test_methane.py",
    kind: "Python",
    content:
      "from model.methane import moisture_factor\n\n\ndef test_saturated_soil():\n    assert moisture_factor(1.0) == 1.0\n\n\ndef test_dry_soil():\n    assert moisture_factor(0.0) == 0.0\n",
  },
  {
    path: "data/weather_2025.csv",
    kind: "CSV",
    content:
      "date,temperature_c,rainfall_mm\n2025-06-01,24.8,0.0\n2025-06-02,25.1,12.4\n2025-06-03,23.6,8.2\n2025-06-04,26.2,0.0\n",
  },
  {
    path: "README.md",
    kind: "Markdown",
    content:
      "# RiceGrow\n\n水稻生长与甲烷排放模拟。\n\n## 模型输入\n\n- 日尺度气象数据\n- 土壤碳含量与水分\n- 试验管理措施\n\n本目录与文件内容均为设计演示数据。\n",
  },
];
export const diff = [
  { type: "context", text: "def moisture_factor(water_filled_pore_space):" },
  { type: "remove", text: "    return water_filled_pore_space ** 2" },
  { type: "add", text: "    saturation = min(1.0, max(0.0, water_filled_pore_space))" },
  { type: "add", text: "    return saturation ** 2" },
];
