// ---------------------------------------------------------------------------
// OrganizerAgentButton – toolbar entry point for the Organizer Agent
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Robot } from '@phosphor-icons/react';
import { OrganizerAgentPanel } from '@/components/ai/OrganizerAgentPanel';
import type { AgentContext } from '@/types/agent';

interface OrganizerAgentButtonProps {
  context: AgentContext;
}

export function OrganizerAgentButton({ context }: OrganizerAgentButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        variant="outline"
        className="gap-2 flex-shrink-0"
        title="Open Organizer Agent"
      >
        <Robot size={20} weight="regular" />
        <span className="hidden lg:inline">Agent</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-[420px] sm:max-w-[420px] p-0 flex flex-col"
        >
          {/* Visually hidden header for accessibility */}
          <SheetHeader className="sr-only">
            <SheetTitle>Organizer Agent</SheetTitle>
            <SheetDescription>
              AI-powered assistant for your personal organizer
            </SheetDescription>
          </SheetHeader>

          <OrganizerAgentPanel context={context} />
        </SheetContent>
      </Sheet>
    </>
  );
}
