"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth-context";
import { useThemeStore } from "@/stores/theme-store";

function ThemeInitializer() {
  const colorTheme = useThemeStore((s) => s.colorTheme);

  useEffect(() => {
    if (colorTheme === "blue") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = colorTheme;
    }
  }, [colorTheme]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <ThemeInitializer />
      <Toaster richColors position="bottom-right" />
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
