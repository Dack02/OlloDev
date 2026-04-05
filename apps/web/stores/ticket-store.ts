import { create } from "zustand";
import type { Discussion } from "@ollo-dev/shared/types";

interface TicketState {
  tickets: Discussion[];
  activeTicketId: string | null;
  filters: { status?: string; priority?: string; assignee_id?: string };
  setTickets: (tickets: Discussion[]) => void;
  setActiveTicket: (id: string | null) => void;
  setFilters: (filters: Partial<TicketState["filters"]>) => void;
  addTicket: (ticket: Discussion) => void;
  updateTicket: (id: string, updates: Partial<Discussion>) => void;
}

export const useTicketStore = create<TicketState>((set) => ({
  tickets: [],
  activeTicketId: null,
  filters: {},

  setTickets: (tickets) => set({ tickets }),

  setActiveTicket: (id) => set({ activeTicketId: id }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  addTicket: (ticket) =>
    set((state) => ({
      tickets: [ticket, ...state.tickets],
    })),

  updateTicket: (id, updates) =>
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),
}));
