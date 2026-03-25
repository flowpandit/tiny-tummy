import { Button } from "../ui/button";

interface NoLogsYetProps {
  childName: string;
  onLogFirst: () => void;
}

export function NoLogsYet({ childName, onLogFirst }: NoLogsYetProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 py-12">
      <div className="w-20 h-20 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="var(--color-primary)" className="w-10 h-10">
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 9a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V15a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V9Z" clipRule="evenodd" />
        </svg>
      </div>
      <p className="text-[var(--color-text)] font-medium mb-1">
        Ready to start tracking {childName}'s health!
      </p>
      <p className="text-sm text-[var(--color-muted)] mb-6">
        Log your first entry to see patterns and insights.
      </p>
      <Button variant="cta" onClick={onLogFirst}>
        Log First Entry
      </Button>
    </div>
  );
}
