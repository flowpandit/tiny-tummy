import { PremiumBadge } from "../billing/PremiumLocks";
import { Switch } from "../ui/switch";

export type SmartReminderKey = "noPoop" | "redFlagFollowUp" | "episodeCheckIn";
export type SmartReminderSettings = Record<SmartReminderKey, boolean>;

const SETTINGS_DESCRIPTION_CLASS = "mt-0.5 text-[0.76rem] leading-snug text-[var(--color-text-secondary)]";

const SMART_REMINDER_ROWS: Array<{ key: SmartReminderKey; title: string; description: string }> = [
  { key: "noPoop", title: "No-poop threshold", description: "Review long gaps since the last poop." },
  { key: "redFlagFollowUp", title: "Red-flag stool follow-up", description: "Follow up after urgent stool colors." },
  { key: "episodeCheckIn", title: "Active episode check-in", description: "Nudge for another episode update." },
];

export function SmartReminderRows({
  canUseSmartReminders,
  loading,
  onSmartToggle,
  smartSettings,
}: {
  canUseSmartReminders: boolean;
  loading: boolean;
  onSmartToggle: (key: SmartReminderKey) => void;
  smartSettings: SmartReminderSettings;
}) {
  return (
    <>
      {SMART_REMINDER_ROWS.map((row) => (
        <div key={row.key} className="border-t border-[var(--color-border)]">
          <div className="flex min-h-[56px] items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-[0.9rem] font-semibold leading-tight text-[var(--color-text)]">{row.title}</p>
                {!canUseSmartReminders && <PremiumBadge featureId="smartReminders" className="shrink-0 px-2 py-0.5 text-[0.58rem]" />}
              </div>
              <p className={SETTINGS_DESCRIPTION_CLASS}>{row.description}</p>
            </div>
            <Switch checked={smartSettings[row.key]} onCheckedChange={() => onSmartToggle(row.key)} disabled={loading || !canUseSmartReminders} ariaLabel={`Toggle ${row.title}`} />
          </div>
        </div>
      ))}
    </>
  );
}
