export interface ThemePreset {
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

export interface CustomColors {
  primary: string;
  accent: string;
  background: string;
}

export interface BackgroundImage {
  url: string;
  opacity: number;
}
