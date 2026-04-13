interface HomeCaregiverNoteCardProps {
  handoffNote: string;
  handoffNoteChanged: boolean;
  isSavingHandoffNote: boolean;
  onChangeNote: (value: string) => void;
  onOpenHandoff: () => void;
  onSave: () => void;
}

export function HomeCaregiverNoteCard({
  handoffNote,
  handoffNoteChanged,
  isSavingHandoffNote,
  onChangeNote,
  onOpenHandoff,
  onSave,
}: HomeCaregiverNoteCardProps) {
  return (
    <div className="px-4">
      <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Caregiver note</p>
            <p className="mt-2 text-[15px] font-semibold text-[var(--color-text)]">Leave the next person a clear note</p>
          </div>
          <button
            type="button"
            onClick={onOpenHandoff}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-home-hover-surface)]"
          >
            Open Handoff
          </button>
        </div>

        <textarea
          value={handoffNote}
          onChange={(event) => onChangeNote(event.target.value)}
          placeholder="e.g. Offer more water at lunch and watch for another poop this afternoon."
          rows={3}
          className="mt-3 w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />

        <div className="mt-3">
          <button
            type="button"
            onClick={onSave}
            disabled={!handoffNoteChanged || isSavingHandoffNote}
            className="w-full rounded-full bg-[var(--color-primary)] px-4 py-3 text-[14px] font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSavingHandoffNote ? "Saving..." : "Save note"}
          </button>
        </div>
      </div>
    </div>
  );
}
