import { Button } from "../ui/button";

interface NoLogsYetProps {
  childName: string;
  onLogFirst: () => void;
}

export function NoLogsYet({ childName, onLogFirst }: NoLogsYetProps) {
  return (
    <div className="px-4">
      <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center shadow-[var(--shadow-soft)] backdrop-blur-xl">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-surface-strong)] shadow-[var(--shadow-soft)]">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="var(--color-cta)" className="w-10 h-10">
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 9a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V15a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V9Z" clipRule="evenodd" />
        </svg>
      </div>
      <p className="mb-2 text-2xl font-semibold text-[var(--color-text)]">
        Ready to start tracking {childName}'s health!
      </p>
      <p className="mb-7 text-base leading-relaxed text-[var(--color-text-secondary)]">
        Log your first entry to see patterns and insights.
      </p>
      <Button variant="cta" size="lg" onClick={onLogFirst}>
        Log First Entry
      </Button>
      </div>
    </div>
  );
}
