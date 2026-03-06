export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  /** Preview swatch color (oklch for light mode) */
  swatch: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "neutral",
    name: "Neutral",
    description: "Clean grayscale, zero chroma",
    swatch: "oklch(0.205 0 0)",
  },
  {
    id: "zinc",
    name: "Zinc",
    description: "Cool gray with subtle blue undertone",
    swatch: "oklch(0.21 0.006 285.885)",
  },
  {
    id: "slate",
    name: "Slate",
    description: "Blue-gray, professional",
    swatch: "oklch(0.21 0.034 264.665)",
  },
  {
    id: "stone",
    name: "Stone",
    description: "Warm gray with earthy undertone",
    swatch: "oklch(0.216 0.006 56.043)",
  },
  {
    id: "blue",
    name: "Blue",
    description: "Modern indigo-blue",
    swatch: "oklch(0.51 0.23 277)",
  },
  {
    id: "green",
    name: "Green",
    description: "Pistachio, light and fresh",
    swatch: "oklch(0.80 0.13 145)",
  },
  {
    id: "yellow",
    name: "Yellow",
    description: "Warm sunny yellow",
    swatch: "oklch(0.852 0.199 91.936)",
  },
  {
    id: "orange",
    name: "Orange",
    description: "Vivid traffic orange",
    swatch: "oklch(0.76 0.20 50)",
  },
];

export type ColorThemeId = (typeof THEME_PRESETS)[number]["id"];
