// ---------------------------------------------------------------------------
// AIConfigPanel – privacy & configuration UX (Phase 1)
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkle, Info } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiService } from '@/lib/ai-service';
import { clearAllSuggestions } from '@/lib/ai-storage';
import type { AIConfig, AIMode } from '@/types/ai';
import { toast } from 'sonner';

interface AIConfigPanelProps {
  /** Called after the config is saved so the parent can re-render AI-aware UI */
  onConfigChange?: (config: AIConfig) => void;
}

const MODE_OPTIONS: { value: AIMode; label: string; description: string }[] = [
  {
    value: 'off',
    label: 'Disabled',
    description: 'No AI features are active. All existing data is unaffected.',
  },
  {
    value: 'mock',
    label: 'Demo (Mock)',
    description:
      'Uses local demo suggestions. No data leaves your device. Great for trying AI features.',
  },
];

export function AIConfigPanel({ onConfigChange }: AIConfigPanelProps) {
  const [config, setConfig] = useState<AIConfig>(aiService.currentConfig);
  const [showPrivacyNote, setShowPrivacyNote] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleModeChange = (mode: AIMode) => {
    setConfig((prev) => ({ ...prev, mode }));
    setIsDirty(true);
  };

  const handlePrivacyToggle = () => {
    setConfig((prev) => ({ ...prev, privacyAccepted: !prev.privacyAccepted }));
    setIsDirty(true);
  };

  const handleSave = () => {
    aiService.configure(config);
    onConfigChange?.(aiService.currentConfig);
    setIsDirty(false);
    toast.success('AI settings saved');
  };

  const handleClearData = () => {
    clearAllSuggestions();
    toast.success('All AI suggestions cleared');
  };

  const selectedOption = MODE_OPTIONS.find((o) => o.value === config.mode);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkle size={18} className="text-primary" weight="fill" />
        <h3 className="font-semibold text-foreground">AI Configuration</h3>
        <Badge
          variant={config.mode === 'off' ? 'outline' : 'default'}
          className="text-xs"
        >
          {selectedOption?.label ?? config.mode}
        </Badge>
      </div>

      {/* Mode selector */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground mb-1">AI Provider</legend>
        {MODE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
              config.mode === option.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted/50'
            }`}
          >
            <input
              type="radio"
              name="ai-mode"
              value={option.value}
              checked={config.mode === option.value}
              onChange={() => handleModeChange(option.value)}
              className="mt-0.5 accent-primary"
            />
            <div>
              <span className="text-sm font-medium text-foreground">{option.label}</span>
              <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
            </div>
          </label>
        ))}
      </fieldset>

      {/* Privacy notice */}
      <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
        <button
          className="flex items-center gap-2 text-sm font-medium text-foreground w-full text-left"
          onClick={() => setShowPrivacyNote((v) => !v)}
          type="button"
        >
          <Info size={15} className="text-muted-foreground shrink-0" />
          Privacy & Data
          <span className="ml-auto text-xs text-muted-foreground">
            {showPrivacyNote ? 'Hide' : 'Show'}
          </span>
        </button>
        <AnimatePresence>
          {showPrivacyNote && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-muted-foreground space-y-1"
            >
              <p>
                In <strong>Demo</strong> mode, all AI processing happens locally in your
                browser. No personal data is transmitted to any external service.
              </p>
              <p>
                Future provider modes (e.g. OpenAI) will send anonymised context snippets
                to a third-party API. You must explicitly accept this before those modes
                become available.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {config.mode !== 'off' && (
          <label className="flex items-center gap-2 text-sm cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={config.privacyAccepted}
              onChange={handlePrivacyToggle}
              className="accent-primary"
            />
            <span className="text-foreground">
              I understand how my data is used by the selected AI provider.
            </span>
          </label>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearData}
          className="text-xs text-muted-foreground"
          type="button"
        >
          Clear saved suggestions
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!isDirty}
          type="button"
        >
          Save
        </Button>
      </div>
    </div>
  );
}
