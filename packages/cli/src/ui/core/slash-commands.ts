// The slash-command registry lives in core (single source for every surface);
// this shim keeps existing deep imports inside the CLI working.
export {
  BUILTIN_SLASH_COMMANDS,
  buildSlashCommands,
  filterSlashCommands,
  findExactSlashCommand,
  forSurface,
  formatSlashCommandDescription,
  formatSlashCommandLabel,
} from "@yuanyuanma03/cropcode-core";
export type {
  SlashCommandItem,
  SlashCommandKind,
  SlashCommandSurface,
  SlashCommandWebAction,
} from "@yuanyuanma03/cropcode-core";
