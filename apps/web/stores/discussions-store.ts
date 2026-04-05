import { create } from "zustand";
import type { Discussion } from "@ollo-dev/shared/types";

interface DiscussionsState {
  discussions: Discussion[];
  activeDiscussionId: string | null;
  setDiscussions: (discussions: Discussion[]) => void;
  setActiveDiscussion: (id: string | null) => void;
  addDiscussion: (d: Discussion) => void;
  updateDiscussion: (id: string, updates: Partial<Discussion>) => void;
}

export const useDiscussionsStore = create<DiscussionsState>((set) => ({
  discussions: [],
  activeDiscussionId: null,

  setDiscussions: (discussions) => set({ discussions }),

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
}));
