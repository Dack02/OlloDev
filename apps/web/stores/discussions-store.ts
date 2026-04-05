import { create } from "zustand";
import type { Discussion } from "@ollo-dev/shared/types";

export type StatusFilter = "all" | "open" | "closed" | "archived";

interface DiscussionsState {
  discussions: Discussion[];
  activeDiscussionId: string | null;
  statusFilter: StatusFilter;
  selectedIds: Set<string>;
  setDiscussions: (discussions: Discussion[]) => void;
  mergeDiscussions: (discussions: Discussion[]) => void;
  setActiveDiscussion: (id: string | null) => void;
  addDiscussion: (d: Discussion) => void;
  updateDiscussion: (id: string, updates: Partial<Discussion>) => void;
  setStatusFilter: (f: StatusFilter) => void;
  toggleSelected: (id: string) => void;
  clearSelected: () => void;
  selectAll: (ids: string[]) => void;
}

export const useDiscussionsStore = create<DiscussionsState>((set) => ({
  discussions: [],
  activeDiscussionId: null,
  statusFilter: "all",
  selectedIds: new Set(),

  setDiscussions: (discussions) => set({ discussions }),

  mergeDiscussions: (incoming) =>
    set((state) => {
      const ids = new Set(incoming.map((d) => d.id));
      const kept = state.discussions.filter((d) => !ids.has(d.id));
      return { discussions: [...kept, ...incoming] };
    }),

  setActiveDiscussion: (id) => set({ activeDiscussionId: id }),

  addDiscussion: (d) =>
    set((state) => ({
      discussions: [d, ...state.discussions],
    })),

  updateDiscussion: (id, updates) =>
    set((state) => ({
      discussions: state.discussions.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    })),

  setStatusFilter: (f) => set({ statusFilter: f }),

  toggleSelected: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),

  clearSelected: () => set({ selectedIds: new Set() }),

  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
}));
