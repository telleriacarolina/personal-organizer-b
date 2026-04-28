import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Palette, Check } from '@phosphor-icons/react';
import { useKV } from '@github/spark/hooks';
import { toast } from 'sonner';

interface ThemePreset {
  name: string;
  description: string;
  colors: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    accent: string;
    accentForeground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    success: string;
    successForeground: string;
  };
}

const themePresets: ThemePreset[] = [
  {
    name: 'Warm Terracotta',
    description: 'Earthy and creative',
    colors: {
      background: 'oklch(0.95 0.02 85)',
      foreground: 'oklch(0.25 0.02 35)',
      card: 'oklch(0.85 0.04 75)',
      cardForeground: 'oklch(0.25 0.02 35)',
      primary: 'oklch(0.48 0.12 35)',
      primaryForeground: 'oklch(1 0 0)',
      secondary: 'oklch(0.85 0.04 75)',
      secondaryForeground: 'oklch(0.25 0.02 35)',
      muted: 'oklch(0.88 0.03 80)',
      mutedForeground: 'oklch(0.45 0.02 35)',
      accent: 'oklch(0.68 0.18 25)',
      accentForeground: 'oklch(0.25 0.02 35)',
      border: 'oklch(0.78 0.03 75)',
      success: 'oklch(0.72 0.08 145)',
      successForeground: 'oklch(0.25 0.02 35)',
    },
  },
  {
    name: 'Ocean Blues',
    description: 'Calm and focused',
    colors: {
      background: 'oklch(0.96 0.01 240)',
      foreground: 'oklch(0.20 0.03 240)',
      card: 'oklch(0.88 0.03 240)',
      cardForeground: 'oklch(0.20 0.03 240)',
      primary: 'oklch(0.50 0.15 240)',
      primaryForeground: 'oklch(1 0 0)',
      secondary: 'oklch(0.88 0.03 240)',
      secondaryForeground: 'oklch(0.20 0.03 240)',
      muted: 'oklch(0.92 0.02 240)',
      mutedForeground: 'oklch(0.48 0.03 240)',
      accent: 'oklch(0.65 0.20 200)',
      accentForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.80 0.02 240)',
      success: 'oklch(0.70 0.12 160)',
      successForeground: 'oklch(0.98 0 0)',
    },
  },
  {
    name: 'Forest Green',
    description: 'Natural and grounding',
    colors: {
      background: 'oklch(0.95 0.02 140)',
      foreground: 'oklch(0.22 0.03 140)',
      card: 'oklch(0.86 0.04 140)',
      cardForeground: 'oklch(0.22 0.03 140)',
      primary: 'oklch(0.45 0.12 140)',
      primaryForeground: 'oklch(1 0 0)',
      secondary: 'oklch(0.86 0.04 140)',
      secondaryForeground: 'oklch(0.22 0.03 140)',
      muted: 'oklch(0.90 0.03 140)',
      mutedForeground: 'oklch(0.46 0.03 140)',
      accent: 'oklch(0.70 0.15 80)',
      accentForeground: 'oklch(0.22 0.03 140)',
      border: 'oklch(0.78 0.03 140)',
      success: 'oklch(0.68 0.14 145)',
      successForeground: 'oklch(0.98 0 0)',
    },
  },
  {
    name: 'Sunset Purple',
    description: 'Creative and energetic',
    colors: {
      background: 'oklch(0.96 0.02 310)',
      foreground: 'oklch(0.24 0.04 310)',
      card: 'oklch(0.88 0.04 310)',
      cardForeground: 'oklch(0.24 0.04 310)',
      primary: 'oklch(0.52 0.18 310)',
      primaryForeground: 'oklch(1 0 0)',
      secondary: 'oklch(0.88 0.04 310)',
      secondaryForeground: 'oklch(0.24 0.04 310)',
      muted: 'oklch(0.92 0.03 310)',
      mutedForeground: 'oklch(0.48 0.04 310)',
      accent: 'oklch(0.68 0.22 20)',
      accentForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.80 0.03 310)',
      success: 'oklch(0.72 0.10 150)',
      successForeground: 'oklch(0.24 0.04 310)',
    },
  },
  {
    name: 'Monochrome',
    description: 'Clean and minimal',
    colors: {
      background: 'oklch(0.98 0 0)',
      foreground: 'oklch(0.15 0 0)',
      card: 'oklch(0.92 0 0)',
      cardForeground: 'oklch(0.15 0 0)',
      primary: 'oklch(0.25 0 0)',
      primaryForeground: 'oklch(0.98 0 0)',
      secondary: 'oklch(0.92 0 0)',
      secondaryForeground: 'oklch(0.15 0 0)',
      muted: 'oklch(0.94 0 0)',
      mutedForeground: 'oklch(0.50 0 0)',
      accent: 'oklch(0.35 0 0)',
      accentForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.85 0 0)',
      success: 'oklch(0.55 0 0)',
      successForeground: 'oklch(0.98 0 0)',
    },
  },
  {
    name: 'Midnight Dark',
    description: 'Dark and sophisticated',
    colors: {
      background: 'oklch(0.18 0.02 240)',
      foreground: 'oklch(0.95 0 0)',
      card: 'oklch(0.24 0.02 240)',
      cardForeground: 'oklch(0.95 0 0)',
      primary: 'oklch(0.65 0.20 240)',
      primaryForeground: 'oklch(0.98 0 0)',
      secondary: 'oklch(0.30 0.02 240)',
      secondaryForeground: 'oklch(0.95 0 0)',
      muted: 'oklch(0.28 0.02 240)',
      mutedForeground: 'oklch(0.65 0 0)',
      accent: 'oklch(0.70 0.25 200)',
      accentForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.35 0.02 240)',
      success: 'oklch(0.68 0.15 160)',
      successForeground: 'oklch(0.98 0 0)',
    },
  },
];

interface ThemeCustomizationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ThemeCustomization({ open, onOpenChange }: ThemeCustomizationProps) {
  const [selectedTheme, setSelectedTheme] = useKV<string>('organizer-theme', 'Warm Terracotta');
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);

  const applyTheme = (theme: ThemePreset) => {
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--${cssVar}`, value);
    });
  };

  const handleThemeSelect = (themeName: string) => {
    const theme = themePresets.find((t) => t.name === themeName);
    if (theme) {
      setSelectedTheme(themeName);
      applyTheme(theme);
      toast.success(`${themeName} theme applied!`);
    }
  };

  const handlePreview = (themeName: string) => {
    const theme = themePresets.find((t) => t.name === themeName);
    if (theme) {
      setPreviewTheme(themeName);
      applyTheme(theme);
    }
  };

  const handleClosePreview = () => {
    if (previewTheme && previewTheme !== selectedTheme) {
      const currentTheme = themePresets.find((t) => t.name === selectedTheme);
      if (currentTheme) {
        applyTheme(currentTheme);
      }
    }
    setPreviewTheme(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClosePreview();
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Palette size={28} weight="duotone" />
            Theme Customization
          </DialogTitle>
          <DialogDescription>
            Choose a color theme that matches your style and workflow
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {themePresets.map((theme) => {
            const isSelected = selectedTheme === theme.name;
            const isPreviewing = previewTheme === theme.name;
            
            return (
              <button
                key={theme.name}
                onClick={() => handleThemeSelect(theme.name)}
                onMouseEnter={() => handlePreview(theme.name)}
                onMouseLeave={handleClosePreview}
                className={`
                  relative p-4 rounded-lg border-2 transition-all text-left
                  ${isSelected ? 'border-primary shadow-lg scale-[1.02]' : 'border-border hover:border-primary/50 hover:shadow-md'}
                `}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-1">
                    <Check size={16} weight="bold" />
                  </div>
                )}
                
                <div className="flex gap-2 mb-3">
                  <div 
                    className="w-10 h-10 rounded-md border border-border"
                    style={{ backgroundColor: theme.colors.primary }}
                  />
                  <div 
                    className="w-10 h-10 rounded-md border border-border"
                    style={{ backgroundColor: theme.colors.accent }}
                  />
                  <div 
                    className="w-10 h-10 rounded-md border border-border"
                    style={{ backgroundColor: theme.colors.card }}
                  />
                </div>

                <h3 className="font-semibold text-lg mb-1">{theme.name}</h3>
                <p className="text-sm text-muted-foreground">{theme.description}</p>
                
                {isPreviewing && !isSelected && (
                  <div className="mt-2 text-xs text-primary font-medium">
                    Previewing...
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Hover over a theme to preview it, or click to apply it permanently. Your theme preference is saved automatically.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ThemeCustomizationButton() {
  const [open, setOpen] = useState(false);
  const [selectedTheme] = useKV<string>('organizer-theme', 'Warm Terracotta');

  useEffect(() => {
    const theme = themePresets.find((t) => t.name === selectedTheme);
    if (theme) {
      const root = document.documentElement;
      Object.entries(theme.colors).forEach(([key, value]) => {
        const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        root.style.setProperty(`--${cssVar}`, value);
      });
    }
  }, [selectedTheme]);

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Palette size={20} weight="duotone" />
        Customize Theme
      </Button>
      
      <ThemeCustomization open={open} onOpenChange={setOpen} />
    </>
  );
}
