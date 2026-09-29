import { ArrowUpRight, FileSearch, FlaskConical, ChartNoAxesCombined } from "lucide-react";
import { cn } from "@/components/lib/utils.js";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";

const researchActions = [
  { id: "structure", icon: FileSearch },
  { id: "inputs", icon: FlaskConical },
  { id: "results", icon: ChartNoAxesCombined },
] as const;

export function ConversationDraftEmptyState({
  className,
  onChoosePrompt,
}: {
  className?: string;
  onChoosePrompt: (prompt: string) => void;
}) {
  const { intl } = useZCodeIntl();
  return (
    <section
      className={cn("research-start w-full pb-7", className)}
      aria-labelledby="research-start-title"
    >
      <p className="mb-3 text-ui-sm font-medium text-brand">
        {intl.formatMessage({ id: "research.workspace" })}
      </p>
      <h1
        id="research-start-title"
        className="text-[28px] font-semibold leading-snug tracking-tight text-foreground"
      >
        {intl.formatMessage({ id: "research.start.title" })}
      </h1>
      <p className="mt-3 max-w-xl text-ui-base leading-7 text-foreground-subtle">
        {intl.formatMessage({ id: "research.start.description" })}
      </p>
      <div
        className="mt-6 flex flex-col gap-1"
        aria-label={intl.formatMessage({ id: "research.actions" })}
      >
        {researchActions.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            data-testid={`research-action-${id}`}
            onClick={() => onChoosePrompt(intl.formatMessage({ id: `research.${id}.prompt` }))}
            className="group flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-brand"
          >
            <Icon className="size-[18px] shrink-0 text-brand" aria-hidden="true" />
            <span className="flex-1 text-ui-base font-medium text-foreground">
              {intl.formatMessage({ id: `research.${id}.title` })}
            </span>
            <span className="hidden text-ui-sm text-foreground-subtle sm:block">
              {intl.formatMessage({ id: `research.${id}.detail` })}
            </span>
            <ArrowUpRight className="size-4 text-foreground-subtle" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
