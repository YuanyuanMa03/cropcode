export const CLI_COMMAND_NAME = "cropcode";
export const CLI_PROCESS_NAME = "cropcode-cli";

interface ProcessTitleTarget {
  title: string;
}

export const setCliProcessTitle = (
  target: ProcessTitleTarget = process,
): void => {
  target.title = CLI_PROCESS_NAME;
};
