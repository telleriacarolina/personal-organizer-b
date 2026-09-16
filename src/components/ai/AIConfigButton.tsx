// ---------------------------------------------------------------------------
// AIConfigButton – toolbar entry point for AI configuration (Phase 1)
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sparkle } from '@phosphor-icons/react';
import { AIConfigPanel } from '@/components/ai/AIConfigPanel';
import { aiService } from '@/lib/ai-service';
import type { AIConfig } from '@/types/ai';

export function AIConfigButton() {
  const [open, setOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(() => aiService.isEnabled);

  const handleConfigChange = (_config: AIConfig) => {
    setIsEnabled(aiService.isEnabled);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        variant={isEnabled ? 'default' : 'outline'}
        className="gap-2 flex-shrink-0"
        title="Configure AI suggestions"
      >
        <Sparkle size={20} weight={isEnabled ? 'fill' : 'regular'} />
        <span className="hidden lg:inline">AI</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkle size={18} className="text-primary" weight="fill" />
              AI Features
            </DialogTitle>
            <DialogDescription>
              Enable AI-powered suggestions for your organizer widgets. Your data
              stays on your device unless you choose an external provider.
            </DialogDescription>
          </DialogHeader>
          <AIConfigPanel onConfigChange={handleConfigChange} />
        </DialogContent>
      </Dialog>
    </>
  );
}
