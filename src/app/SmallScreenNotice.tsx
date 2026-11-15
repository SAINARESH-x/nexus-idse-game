// SmallScreenNotice: below 768 px the game shows a friendly note instead of a cramped layout warning nobody reads.
export function SmallScreenNotice() {
  return (
    <div
      role="note"
      className="sticky top-0 z-[65] border-b border-cyan/40 bg-panel px-4 py-2 text-center text-xs text-cyan md:hidden"
    >
      NEXUS is designed for screens at least 768 px wide. It still works here, but a larger screen is best.
    </div>
  )
}
