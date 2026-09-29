import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.js";
import { Button } from "@/components/ui/button.js";
import { useFeedbackStore } from "@/feedback/feedbackStore.js";
import type { IFeedbackService } from "@zcode/services";
import type { IPlatformService } from "@zcode/shared";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";
import { CROPCODE_ISSUES_URL } from "@/lib/productDocs.js";

export function FeedbackCenter({
  platform,
}: {
  feedbackService?: IFeedbackService;
  platform: IPlatformService;
}) {
  const open = useFeedbackStore((state) => state.open || state.featureRequestOpen);
  const close = useFeedbackStore((state) => state.close);
  const { intl } = useZCodeIntl();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{intl.formatMessage({ id: "research.feedback.title" })}</DialogTitle>
          <DialogDescription>
            {intl.formatMessage({ id: "research.feedback.description" })}
          </DialogDescription>
        </DialogHeader>
        <Button
          onClick={() => {
            void platform.openExternal(CROPCODE_ISSUES_URL);
            close();
          }}
        >
          {intl.formatMessage({ id: "research.feedback.open" })}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
