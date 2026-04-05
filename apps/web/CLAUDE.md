@AGENTS.md

## Mobile Compliance

All UI changes MUST be mobile-compliant (>=320px viewport):

- Never use fixed-width layouts without responsive alternatives (use `md:w-[Xpx]` with `w-full` default)
- All interactive elements must have >=44px touch targets on mobile (enforced globally via globals.css)
- Multi-column layouts must collapse to single-column on `<md` breakpoint (768px)
- Detail/side panels must render as full-screen overlays on mobile (see `DetailPanel` component)
- Tab bars with >4 items must be horizontally scrollable (`overflow-x-auto scrollbar-hide min-w-max`)
- Tables must either use a card layout on mobile or hide non-essential columns (`hidden md:table-cell`)
- The sidebar is a slide-over drawer on mobile, controlled via `useMobileSidebar` hook
- Bottom navigation bar is visible only on mobile (`md:hidden`) with 5 primary destinations
- Use `env(safe-area-inset-*)` for fixed elements on notched devices
- Test all changes at 375px viewport width before committing — verify no horizontal overflow, all content reachable, all interactive elements tappable

### Responsive Patterns Used

| Pattern | Desktop (md+) | Mobile (<md) |
|---------|--------------|--------------|
| Sidebar | Fixed aside, collapsible | Slide-over drawer with backdrop |
| Navigation | Sidebar links | Bottom tab bar (5 icons) |
| Detail panels | Side panel (400-460px) | Full-screen overlay with back button |
| Multi-column pages | Side-by-side columns | Stacked with back navigation |
| Data tables | Full table with all columns | Card/list layout with key info |
| Tab bars | Inline tabs | Horizontally scrollable |
| Filter bars | Tabs + dropdowns inline | Scrollable container |
