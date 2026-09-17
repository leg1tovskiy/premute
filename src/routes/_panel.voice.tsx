import { createFileRoute } from "@tanstack/react-router";
import { VoiceView } from "@/components/voice-view";
import { RequireCap } from "@/lib/panel";

export const Route = createFileRoute("/_panel/voice")({
  component: () => (
    <RequireCap cap="canVoice">
      <VoiceView />
    </RequireCap>
  ),
});
