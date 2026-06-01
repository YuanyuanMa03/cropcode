# Plugins, Skills & Marketplace

CropCode provides a flexible, multi-layered extension system. You can freely choose how to obtain and manage skills — from one-click marketplace installs to fully custom hand-written skills.

---

## Quick Comparison

| Method | Best For | Setup |
|--------|----------|-------|
| **Marketplace** | Team sharing, curated collections | `cropcode marketplace add <url>` |
| **Custom Skill** | Personal workflows, project-specific logic | Drop a `SKILL.md` into `~/.agents/skills/` |
| **Community Hub** | Discovering skills from the community | Browse online, then install via marketplace or manual copy |
| **Git Clone** | Using any public skill repo directly | `git clone` + point marketplace at local path |

---

## 1. Skill System Basics

A **skill** is a Markdown file (`SKILL.md`) that teaches CropCode how to perform a specific task. Skills are loaded into the conversation context and guide the AI's behavior.

### Skill File Structure

```
~/.agents/skills/
  my-skill/
    SKILL.md          # Required: skill definition
  another-skill/
    SKILL.md
```

Or per-project:

```
your-project/
  .agents/
    skills/
      project-skill/
        SKILL.md
```

### SKILL.md Format

Every skill starts with YAML frontmatter followed by Markdown content:

```markdown
---
name: my-skill
description: One-line description of what this skill does
license: MIT
---

# My Skill

## When to Use

Describe when this skill should be triggered.

## Instructions

Step-by-step instructions for the AI to follow.

## Examples

Concrete examples of inputs and expected outputs.
```

**Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier, used in `/skill-name` slash command |
| `description` | Yes | One-line summary shown in skill list |
| `license` | No | License identifier |

### Built-in Skills

CropCode ships with several built-in skills in `templates/skills/`:

| Skill | Purpose |
|-------|---------|
| `karpathy-guidelines` | Behavioral guidelines to reduce common LLM coding mistakes |
| `plan-and-execute` | Structured planning before implementation |
| `agent-drift-guard` | Prevents AI from drifting off-task |

These are automatically available. You can disable any skill in settings:

```json
{
  "disabledSkills": ["karpathy-guidelines"]
}
```

### Using Skills

- Type `/` in the prompt to see all available skills
- Type `/skills` to browse and select from the skill list
- Skills can also be auto-triggered based on their `description` field

---

## 2. Writing Your Own Skills

Creating a custom skill is the simplest way to extend CropCode. No marketplace, no installation — just a Markdown file.

### Step 1: Create the Directory

```bash
mkdir -p ~/.agents/skills/my-custom-skill
```

### Step 2: Write SKILL.md

```markdown
---
name: rice-analysis
description: Standardized rice yield data analysis workflow
---

# Rice Yield Analysis

## When to Use

Use this skill when the user asks to analyze rice yield data,
perform ANOVA on field experiment results, or generate yield reports.

## Workflow

1. Read the data file (CSV/Excel)
2. Check for missing values and outliers (±3σ)
3. Perform ANOVA using the linear model
4. Run Tukey HSD for multiple comparison
5. Generate publication-ready tables and figures

## Output Format

- ANOVA table in markdown
- Mean separation with letter notation (a, ab, b, ...)
- Box plot or bar chart with error bars
```

### Step 3: Use It

Restart CropCode (or start a new session with `/new`), then type `/` to see your skill in the list.

### Per-Project Skills

For project-specific workflows, place skills in your project directory:

```bash
mkdir -p your-project/.agents/skills/data-pipeline
# Write your-project/.agents/skills/data-pipeline/SKILL.md
```

These skills are only available when working in that project.

### Skill Writing Tips

- **Be specific** — Vague instructions lead to inconsistent results
- **Include examples** — Show the AI what good output looks like
- **Define scope** — Tell the AI when to use this skill AND when NOT to
- **Keep it focused** — One skill = one workflow. Split complex tasks into multiple skills

---

## 3. Marketplace System

The marketplace system lets you distribute and install skills from Git repositories. Any Git repo containing a `marketplace.json` manifest can serve as a marketplace.

### Creating a Marketplace

#### Step 1: Prepare Your Repository

```
my-marketplace/
  marketplace.json        # Required: manifest file
  skills/
    rice-analysis/
      SKILL.md
    soil-report/
      SKILL.md
    weather-viz/
      SKILL.md
```

#### Step 2: Write marketplace.json

```json
{
  "name": "agri-skills",
  "description": "Agricultural research skills for CropCode",
  "plugins": [
    {
      "name": "rice-analysis",
      "description": "Rice yield data analysis and ANOVA",
      "path": "skills/rice-analysis"
    },
    {
      "name": "soil-report",
      "description": "Soil nutrient analysis and reporting",
      "path": "skills/soil-report"
    },
    {
      "name": "weather-viz",
      "description": "Weather data visualization",
      "path": "skills/weather-viz"
    }
  ]
}
```

#### Step 3: Push to GitHub

```bash
cd my-marketplace
git init
git add .
git commit -m "Initial marketplace"
git remote add origin https://github.com/yourname/agri-skills.git
git push -u origin main
```

### Installing from a Marketplace

```bash
# 1. Register the marketplace
cropcode marketplace add https://github.com/yourname/agri-skills.git

# 2. Browse available plugins
cropcode marketplace list

# 3. Install a plugin
cropcode plugin install rice-analysis@agri-skills

# 4. Verify installation
cropcode plugin list
```

### Managing Marketplaces

```bash
# List all registered marketplaces
cropcode marketplace list

# Remove a marketplace (also uninstalls its plugins)
cropcode marketplace remove agri-skills
```

### Managing Plugins

```bash
# List installed plugins
cropcode plugin list

# Install a specific plugin
cropcode plugin install <plugin-name>@<marketplace-name>

# Remove a plugin
cropcode plugin remove <plugin-name>
```

### Using Local Directories

You can also use a local directory as a marketplace — useful for development or private skills:

```bash
# Absolute path
cropcode marketplace add /path/to/my-marketplace

# Relative path
cropcode marketplace add ./my-marketplace

# Home directory
cropcode marketplace add ~/my-marketplace
```

### Using Specific Branches

```bash
cropcode marketplace add https://github.com/yourname/agri-skills.git --ref develop
```

---

## 4. Community Skill Hubs

The CropCode skill ecosystem is open — anyone can create and share skills. Here are ways to discover community skills:

### GitHub Search

Search GitHub for CropCode skills:

```
"marketplace.json" "plugins" cropcode
```

Or search for specific skill topics:

```
SKILL.md "name:" "description:" path:skills
```

### Nature Skills (Example)

A curated collection of agricultural and environmental science skills:

```bash
# Register the marketplace
cropcode marketplace add https://github.com/Yuan1z0825/nature-skills.git

# Browse available skills
cropcode marketplace list

# Install skills you need
cropcode plugin install <skill-name>@nature-skills
```

### Creating Your Own Hub

Organizations can maintain internal skill hubs:

1. Create a private Git repository
2. Add `marketplace.json` with your curated skills
3. Team members register it as a marketplace
4. Skills are version-controlled and shareable

```bash
# Team member setup
cropcode marketplace add https://github.com/your-org/cropcode-skills.git
cropcode plugin install rice-protocol@cropcode-skills
```

---

## 5. TUI Commands

Inside the CropCode interactive session:

| Command | Description |
|---------|-------------|
| `/` | Open slash command menu — shows all skills and built-in commands |
| `/skills` | Browse and select from available skills |
| `/marketplace` | View registered marketplaces and available plugins |
| `/plugin` | View installed plugins |

---

## 6. Data Storage

| What | Where |
|------|-------|
| User skills | `~/.agents/skills/*/SKILL.md` |
| Project skills | `<project>/.agents/skills/*/SKILL.md` |
| Settings | `~/.cropcode/settings.json` |
| Marketplace registry | `~/.cropcode/settings.json` (marketplaces section) |
| Installed plugins | `~/.cropcode/plugins/cache/` |
| Plugin skills (linked) | `~/.agents/skills/` (symlinked from cache) |

---

## 7. Security

- **Path traversal protection** — Plugin sources cannot escape the marketplace directory
- **Symlink safety** — Symbolic links are skipped during plugin installation
- **Ownership check** — Only plugin-owned files are removed during uninstall
- **Local paths** — Absolute and relative paths are resolved and validated

---

## 8. FAQ

**Q: Can I use skills from Claude Code / other AI coding tools?**

Yes. Any `SKILL.md` file following the format above works. The skill system is Markdown-based and portable.

**Q: Do I need a marketplace to use skills?**

No. You can manually create skills in `~/.agents/skills/` or `<project>/.agents/skills/`. The marketplace is optional — it's just a convenient way to distribute and install skills.

**Q: Can I disable a skill without removing it?**

Yes. Add the skill name to `disabledSkills` in your settings:

```json
{
  "disabledSkills": ["unwanted-skill"]
}
```

**Q: Can a marketplace contain non-skill files?**

Yes. A marketplace is just a Git repo with a `marketplace.json`. You can include documentation, scripts, data files, or anything else alongside your skills.

**Q: How do I update a plugin?**

Remove and reinstall:

```bash
cropcode plugin remove <name>
cropcode plugin install <name>@<marketplace>
```

Or re-register the marketplace to pull the latest version:

```bash
cropcode marketplace remove <name>
cropcode marketplace add <url>
cropcode plugin install <name>@<marketplace>
```
