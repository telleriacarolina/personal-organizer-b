import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Palette, Check, Trash, Upload } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { BackgroundImage } from '@/types';
import { useStoredMediaUrl } from '@/hooks/useStoredMediaUrl';
import {
  createMediaId,
  deleteMedia,
  formatPersistenceIssue,
  hasLegacyBackgroundImagePayload,
  migrateLegacyBackgroundImage,
  saveMedia,
} from '@/lib/persistence';

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

interface CustomColors {
  primary: string;
  accent: string;
  background: string;
}
import { usePersistentState } from '@/hooks/usePersistentState';
import { stateRepositories } from '@/lib/persistence';
import { applyBackgroundImage, applyCustomColors, applyTheme } from '@/lib/theme-service';
import type { BackgroundImage, CustomColors, ThemePreset } from '@/types/theme';

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
  const [selectedTheme, setSelectedTheme] = useLocalStorageState<string>('organizer-theme', 'Warm Terracotta');
  const [customColors, setCustomColors] = useLocalStorageState<CustomColors | null>('organizer-custom-colors', null);
  const [backgroundImage, setBackgroundImage] = useLocalStorageState<BackgroundImage | null>('organizer-bg-image', null);
  const { url: resolvedBackgroundUrl, isMissing: isBackgroundMissing } = useStoredMediaUrl({
    mediaId: backgroundImage?.mediaId,
    fallbackUrl: backgroundImage?.url ?? null,
  });
  const [selectedTheme, setSelectedTheme] = usePersistentState(stateRepositories.theme, 'Warm Terracotta');
  const [customColors, setCustomColors] = usePersistentState(stateRepositories.customColors, null);
  const [backgroundImage, setBackgroundImage] = usePersistentState(stateRepositories.backgroundImage, null);
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);
  const [localPrimary, setLocalPrimary] = useState('#7a5c3d');
  const [localAccent, setLocalAccent] = useState('#ae6745');
  const [localBg, setLocalBg] = useState('#f2ede5');
  const [opacity, setOpacity] = useState(backgroundImage?.opacity || 30);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (customColors) {
      setLocalPrimary(customColors.primary);
      setLocalAccent(customColors.accent);
      setLocalBg(customColors.background);
    }
  }, [customColors]);

  const applyTheme = (theme: ThemePreset) => {
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--${cssVar}`, value);
    });
  };

  const applyCustomColors = (colors: CustomColors) => {
    const root = document.documentElement;
    const primaryOklch = hexToOklch(colors.primary);
    const accentOklch = hexToOklch(colors.accent);
    const bgOklch = hexToOklch(colors.background);

    root.style.setProperty('--primary', primaryOklch);
    root.style.setProperty('--accent', accentOklch);
    root.style.setProperty('--background', bgOklch);
  };

  const applyBackgroundImage = (image: BackgroundImage | null, resolvedUrl: string | null) => {
    const appContainer = document.querySelector('.min-h-screen');
    if (appContainer instanceof HTMLElement) {
      if (image && resolvedUrl) {
        appContainer.style.backgroundImage = `url(${resolvedUrl})`;
        appContainer.style.backgroundSize = 'cover';
        appContainer.style.backgroundPosition = 'center';
        appContainer.style.backgroundAttachment = 'fixed';
        appContainer.style.position = 'relative';
        
        let overlay = appContainer.querySelector('.bg-overlay') as HTMLElement;
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.className = 'bg-overlay';
          overlay.style.position = 'fixed';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100%';
          overlay.style.height = '100%';
          overlay.style.backgroundColor = 'var(--background)';
          overlay.style.zIndex = '-1';
          overlay.style.pointerEvents = 'none';
          appContainer.appendChild(overlay);
        }
        overlay.style.opacity = (image.opacity / 100).toString();
      } else {
        appContainer.style.backgroundImage = '';
        const overlay = appContainer.querySelector('.bg-overlay');
        if (overlay) {
          overlay.remove();
        }
      }
    }
  };

  useEffect(() => {
    applyBackgroundImage(backgroundImage, resolvedBackgroundUrl);
  }, [backgroundImage, resolvedBackgroundUrl]);

  const handleThemeSelect = (themeName: string) => {
    const theme = themePresets.find((t) => t.name === themeName);
    if (theme) {
      setSelectedTheme(themeName);
      setCustomColors(null);
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
      } else if (customColors) {
        applyCustomColors(customColors);
      }
    }
    setPreviewTheme(null);
  };

  const handleApplyCustomColors = () => {
    const colors: CustomColors = {
      primary: localPrimary,
      accent: localAccent,
      background: localBg,
    };
    setCustomColors(colors);
    setSelectedTheme('custom');
    applyCustomColors(colors);
    toast.success('Custom colors applied!');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be smaller than 5MB');
        return;
      }

      const nextMediaId = createMediaId('theme-background');
      const previousMediaId = backgroundImage?.mediaId;

      try {
        await saveMedia({ id: nextMediaId, kind: 'theme-background', blob: file });
        setBackgroundImage({
          mediaId: nextMediaId,
          opacity,
        });
        toast.success('Background image uploaded!');
        if (previousMediaId) {
          void deleteMedia(previousMediaId).catch(() => {
            toast.error('Background image changed, but the previous stored image could not be cleaned up.');
          });
        }
      } catch {
        toast.error('Could not save background image. Please try again.');
      } finally {
        e.target.value = '';
      }
    }
  };

  const handleOpacityChange = (value: number[]) => {
    const newOpacity = value[0];
    setOpacity(newOpacity);
    if (backgroundImage) {
      setBackgroundImage((current) => current ? { ...current, opacity: newOpacity } : current);
    }
  };

  const handleRemoveImage = async () => {
    try {
      if (backgroundImage?.mediaId) {
        await deleteMedia(backgroundImage.mediaId);
      }
      setBackgroundImage(null);
      toast.success('Background image removed');
    } catch {
      toast.error('Could not remove background image. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClosePreview();
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Palette size={24} weight="duotone" className="sm:w-7 sm:h-7" />
            Theme Customization
          </DialogTitle>
          <DialogDescription className="text-sm">
            Personalize your organizer with preset themes, custom colors, or background images
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="presets" className="mt-4 sm:mt-6">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="presets" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Theme Presets</span>
              <span className="sm:hidden">Themes</span>
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Custom Colors</span>
              <span className="sm:hidden">Custom</span>
            </TabsTrigger>
            <TabsTrigger value="background" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Background Image</span>
              <span className="sm:hidden">Image</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="mt-4 sm:mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                      relative p-3 sm:p-4 rounded-lg border-2 transition-all text-left
                      ${isSelected ? 'border-primary shadow-lg scale-[1.02]' : 'border-border hover:border-primary/50 hover:shadow-md'}
                    `}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-primary text-primary-foreground rounded-full p-1">
                        <Check size={14} weight="bold" className="sm:w-4 sm:h-4" />
                      </div>
                    )}
                    
                    <div className="flex gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                      <div 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-md border border-border"
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      <div 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-md border border-border"
                        style={{ backgroundColor: theme.colors.accent }}
                      />
                      <div 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-md border border-border"
                        style={{ backgroundColor: theme.colors.card }}
                      />
                    </div>

                    <h3 className="font-semibold text-base sm:text-lg mb-1">{theme.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{theme.description}</p>
                    
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
                <strong>Tip:</strong> Hover over a theme to preview it, or click to apply it permanently.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="mt-6">
            <div className="space-y-6">
              <div className="grid gap-6">
                <div className="space-y-3">
                  <Label htmlFor="primary-color" className="text-base font-medium">
                    Primary Color
                  </Label>
                  <div className="flex gap-3 items-center">
                    <Input
                      id="primary-color"
                      type="color"
                      value={localPrimary}
                      onChange={(e) => setLocalPrimary(e.target.value)}
                      className="w-20 h-12 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={localPrimary}
                      onChange={(e) => setLocalPrimary(e.target.value)}
                      placeholder="#7a5c3d"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Used for buttons and important UI elements
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="accent-color" className="text-base font-medium">
                    Accent Color
                  </Label>
                  <div className="flex gap-3 items-center">
                    <Input
                      id="accent-color"
                      type="color"
                      value={localAccent}
                      onChange={(e) => setLocalAccent(e.target.value)}
                      className="w-20 h-12 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={localAccent}
                      onChange={(e) => setLocalAccent(e.target.value)}
                      placeholder="#ae6745"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Used for highlights and interactive elements
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="bg-color" className="text-base font-medium">
                    Background Color
                  </Label>
                  <div className="flex gap-3 items-center">
                    <Input
                      id="bg-color"
                      type="color"
                      value={localBg}
                      onChange={(e) => setLocalBg(e.target.value)}
                      className="w-20 h-12 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={localBg}
                      onChange={(e) => setLocalBg(e.target.value)}
                      placeholder="#f2ede5"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Main background color of the application
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleApplyCustomColors} className="flex-1 gap-2">
                  <Check size={18} />
                  Apply Custom Colors
                </Button>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Custom colors will override the selected theme preset. You can use the color picker or enter hex codes directly.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="background" className="mt-6">
            <div className="space-y-6">
              {backgroundImage ? (
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden border-2 border-border">
                    <img 
                      src={resolvedBackgroundUrl ?? ''} 
                      alt="Background preview" 
                      className="w-full h-48 object-cover"
                    />
                    <div 
                      className="absolute inset-0 bg-background pointer-events-none"
                      style={{ opacity: backgroundImage.opacity / 100 }}
                    />
                  </div>
                  {isBackgroundMissing && (
                    <p className="text-sm text-destructive">The saved background image is unavailable.</p>
                  )}

                  <div className="space-y-3">
                    <Label htmlFor="opacity-slider" className="text-base font-medium">
                      Background Opacity: {opacity}%
                    </Label>
                    <Slider
                      id="opacity-slider"
                      value={[opacity]}
                      onValueChange={handleOpacityChange}
                      min={0}
                      max={90}
                      step={5}
                      className="w-full"
                    />
                    <p className="text-sm text-muted-foreground">
                      Adjust how much the background shows through
                    </p>
                  </div>

                  <Button 
                    onClick={handleRemoveImage} 
                    variant="destructive" 
                    className="w-full gap-2"
                  >
                    <Trash size={18} />
                    Remove Background Image
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-12 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-muted/50 transition-all"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 rounded-full bg-primary/10">
                        <Upload size={32} className="text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-medium mb-1">
                          Upload Background Image
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Click to select an image (max 5MB)
                        </p>
                      </div>
                    </div>
                  </button>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Tip:</strong> Choose a subtle image that won't distract from your content. You can adjust the opacity after uploading.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function ThemeCustomizationButton() {
  const [open, setOpen] = useState(false);
  const [selectedTheme] = useLocalStorageState<string>('organizer-theme', 'Warm Terracotta');
  const [customColors] = useLocalStorageState<CustomColors | null>('organizer-custom-colors', null);
  const [backgroundImage, setBackgroundImage] = useLocalStorageState<BackgroundImage | null>('organizer-bg-image', null);
  const { url: resolvedBackgroundUrl } = useStoredMediaUrl({
    mediaId: backgroundImage?.mediaId,
    fallbackUrl: backgroundImage?.url ?? null,
  });
  const migrationErrorShownRef = useRef(false);
  const [selectedTheme] = usePersistentState(stateRepositories.theme, 'Warm Terracotta');
  const [customColors] = usePersistentState(stateRepositories.customColors, null);
  const [backgroundImage] = usePersistentState(stateRepositories.backgroundImage, null);

  useEffect(() => {
    if (customColors) {
      applyCustomColors(customColors);
    } else {
      const theme = themePresets.find((t) => t.name === selectedTheme);
      if (theme) {
        applyTheme(theme);
      }
    }
  }, [selectedTheme, customColors]);

  useEffect(() => {
    if (backgroundImage && resolvedBackgroundUrl) {
      const appContainer = document.querySelector('.min-h-screen');
      if (appContainer instanceof HTMLElement) {
        appContainer.style.backgroundImage = `url(${resolvedBackgroundUrl})`;
        appContainer.style.backgroundSize = 'cover';
        appContainer.style.backgroundPosition = 'center';
        appContainer.style.backgroundAttachment = 'fixed';
        appContainer.style.position = 'relative';
        
        let overlay = appContainer.querySelector('.bg-overlay') as HTMLElement;
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.className = 'bg-overlay';
          overlay.style.position = 'fixed';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100%';
          overlay.style.height = '100%';
          overlay.style.backgroundColor = 'var(--background)';
          overlay.style.zIndex = '-1';
          overlay.style.pointerEvents = 'none';
          appContainer.appendChild(overlay);
        }
        overlay.style.opacity = (backgroundImage.opacity / 100).toString();
      }
    } else {
      const appContainer = document.querySelector('.min-h-screen');
      if (appContainer instanceof HTMLElement) {
        appContainer.style.backgroundImage = '';
        const overlay = appContainer.querySelector('.bg-overlay');
        if (overlay) {
          overlay.remove();
        }
      }
    }
  }, [backgroundImage, resolvedBackgroundUrl]);

  useEffect(() => {
    if (!hasLegacyBackgroundImagePayload(backgroundImage)) {
      return;
    }

    let cancelled = false;

    void (async () => {
      if (!backgroundImage) return;
      const migration = await migrateLegacyBackgroundImage(backgroundImage);
      if (cancelled) return;

      if (migration.migrated) {
        setBackgroundImage(migration.value);
      }

      if (migration.issue && !migrationErrorShownRef.current) {
        migrationErrorShownRef.current = true;
        toast.error(`${formatPersistenceIssue(migration.issue)} Original image was kept.`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [backgroundImage, setBackgroundImage]);
    applyBackgroundImage(backgroundImage);
  }, [backgroundImage]);

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={() => setOpen(true)}
        className="gap-2 flex-1 sm:flex-initial"
      >
        <Palette size={18} weight="duotone" className="sm:w-5 sm:h-5" />
        <span className="hidden sm:inline">Customize Theme</span>
        <span className="sm:hidden">Theme</span>
      </Button>
      
      <ThemeCustomization open={open} onOpenChange={setOpen} />
    </>
  );
}
