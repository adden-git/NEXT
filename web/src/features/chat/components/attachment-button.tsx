import { PromptInputButton, usePromptInputAttachments } from "@ai-elements";
import { PaperclipIcon } from "@/components/nexus-icons";

export function AttachmentButton() {
  const attachments = usePromptInputAttachments();

  return (
    <PromptInputButton onClick={() => attachments.openFileDialog()}>
      <PaperclipIcon className="size-4" />
    </PromptInputButton>
  );
}
