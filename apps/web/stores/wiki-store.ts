import { create } from "zustand";
import type { WikiSpace, WikiPage } from "@ollo-dev/shared/types";

interface WikiState {
  spaces: WikiSpace[];
  activeSpaceId: string | null;
  pages: WikiPage[];
  activePageId: string | null;
  setSpaces: (spaces: WikiSpace[]) => void;
  setActiveSpace: (id: string | null) => void;
  setPages: (pages: WikiPage[]) => void;
  setActivePage: (id: string | null) => void;
}

export const useWikiStore = create<WikiState>((set) => ({
  spaces: [],
  activeSpaceId: null,
  pages: [],
  activePageId: null,

  setSpaces: (spaces) => set({ spaces }),

  setActiveSpace: (id) => set({ activeSpaceId: id, pages: [], activePageId: null }),

  setPages: (pages) => set({ pages }),

  setActivePage: (id) => set({ activePageId: id }),
}));
