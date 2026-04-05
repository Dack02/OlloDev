import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SidebarMode = "open" | "collapsed" | "auto";

interface SidebarState {
  mode: SidebarMode;
  isHovered: boolean;
  setMode: (mode: SidebarMode) => void;
  setHovered: (hovered: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      mode: "open",
      isHovered: false,
      setMode: (mode) => set({ mode }),
      setHovered: (hovered) => set({ isHovered: hovered }),
    }),
    { name: "sidebar-mode" }
  )
);

/** Derived: whether the sidebar should render in expanded state */
export function getIsExpanded(mode: SidebarMode, isHovered: boolean): boolean {
  if (mode === "open") return true;
  if (mode === "collapsed") return false;
  return isHovered; // auto
}
