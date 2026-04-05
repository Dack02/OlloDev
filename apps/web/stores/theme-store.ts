import { create } from "zustand";
import { persist } from "zustand/middleware";

export const COLOR_THEMES = [
  { key: "blue", label: "Blue", light: "#3b82f6", dark: "#6b9eff" },
  { key: "emerald", label: "Emerald", light: "#10b981", dark: "#34d399" },
  { key: "violet", label: "Violet", light: "#8b5cf6", dark: "#a78bfa" },
  { key: "rose", label: "Rose", light: "#f43f5e", dark: "#fb7185" },
  { key: "amber", label: "Amber", light: "#f59e0b", dark: "#fbbf24" },
  { key: "slate", label: "Slate", light: "#64748b", dark: "#94a3b8" },
] as const;

export type ColorThemeKey = (typeof COLOR_THEMES)[number]["key"];

interface ThemeState {
  colorTheme: ColorThemeKey;
  setColorTheme: (theme: ColorThemeKey) => void;
}

function applyThemeAttribute(theme: ColorThemeKey) {
  if (typeof document === "undefined") return;
  if (theme === "blue") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      colorTheme: "blue",
      setColorTheme: (theme) => {
        applyThemeAttribute(theme);
        set({ colorTheme: theme });
      },
    }),
    {
      name: "ollo-color-theme",
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeAttribute(state.colorTheme);
      },
    },
  ),
);
