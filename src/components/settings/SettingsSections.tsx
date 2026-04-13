import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useUnits } from "../../contexts/UnitsContext";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { SegmentedControl } from "../ui/segmented-control";
import { Switch } from "../ui/switch";
import { FieldLabel } from "../ui/field";
import { TimePicker } from "../ui/time-picker";
import { useToast } from "../ui/toast";
import { Avatar } from "../child/Avatar";
import { CHILD_SEX_OPTIONS, FEEDING_TYPES } from "../../lib/constants";
import { getAgeLabelFromDob } from "../../lib/utils";
import {
  cancelDailyReminder,
  enableDailyReminder,
  getSmartReminderSettings,
  isDailyReminderEnabled,
  setSmartReminderEnabled,
  syncSmartRemindersForChildren,
} from "../../lib/notifications";
import { getEliminationViewSettingKey, type EliminationViewPreference } from "../../lib/diaper";
import * as db from "../../lib/db";
import type { Child, UnitSystem } from "../../lib/types";

const THEME_OPTIONS: { value: "system" | "light" | "dark"; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const UNIT_SYSTEM_OPTIONS: { value: UnitSystem; label: string }[] = [
  { value: "metric", label: "Metric" },
  { value: "imperial", label: "Imperial" },
];

const ELIMINATION_VIEW_OPTIONS: { value: EliminationViewPreference; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "diaper", label: "Diaper" },
  { value: "poop", label: "Poop" },
];

function formatScheduleTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

function SettingsNavCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className="cursor-pointer transition-shadow hover:shadow-[var(--shadow-soft)]"
      onClick={onClick}
    >
      <CardContent className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">{description}</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="var(--color-muted)" className="h-5 w-5">
          <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </CardContent>
    </Card>
  );
}

export function ChildrenSection({
  activeChild,
  children,
  confirmDelete,
  onAddChild,
  onConfirmDelete,
  onDelete,
  onEditChild,
  onOpenAllKids,
  onSetConfirmDelete,
}: {
  activeChild: Child | null;
  children: Child[];
  confirmDelete: string | null;
  onAddChild: () => void;
  onConfirmDelete: (id: string) => void;
  onDelete: (id: string) => void;
  onEditChild: (child: Child) => void;
  onOpenAllKids: () => void;
  onSetConfirmDelete: (id: string | null) => void;
}) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Children</h3>
        <div className="flex gap-2">
          {children.length > 1 && (
            <button onClick={onOpenAllKids} className="cursor-pointer text-xs font-medium text-[var(--color-primary)]">
              View All
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {children.map((child) => (
          <Card key={child.id}>
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <Avatar childId={child.id} name={child.name} color={child.avatar_color} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-[var(--color-text)]">{child.name}</p>
                    {activeChild?.id === child.id && (
                      <span className="rounded bg-[var(--color-primary)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {[getAgeLabelFromDob(child.date_of_birth), child.sex ? CHILD_SEX_OPTIONS.find((option) => option.value === child.sex)?.label : null, FEEDING_TYPES.find((f) => f.value === child.feeding_type)?.label]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onEditChild(child)}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)]"
                    aria-label={`Edit ${child.name}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                    </svg>
                  </button>
                  {children.length > 1 && (
                    confirmDelete === child.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => onDelete(child.id)} className="cursor-pointer rounded-[var(--radius-sm)] bg-[var(--color-alert)] px-2 py-1 text-xs text-white">
                          Delete
                        </button>
                        <button onClick={() => onSetConfirmDelete(null)} className="cursor-pointer rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onConfirmDelete(child.id)}
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted)] transition-colors hover:bg-[var(--color-alert-bg)] hover:text-[var(--color-alert)]"
                        aria-label={`Remove ${child.name}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="secondary" className="mt-3 w-full" onClick={onAddChild}>
        Add Child
      </Button>
    </div>
  );
}

export function NotificationSection({ children }: { children: Child[] }) {
  const { showError } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [smartSettings, setSmartSettings] = useState({
    noPoop: false,
    redFlagFollowUp: false,
    episodeCheckIn: false,
    solidsHydration: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([isDailyReminderEnabled(), getSmartReminderSettings()]).then(([daily, smart]) => {
      setEnabled(daily);
      setSmartSettings(smart);
      setLoading(false);
    });
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    if (enabled) {
      await cancelDailyReminder();
      setEnabled(false);
    } else {
      const success = await enableDailyReminder();
      setEnabled(success);
    }
    setLoading(false);
  };

  const handleSmartToggle = async (key: keyof typeof smartSettings) => {
    setLoading(true);
    const nextValue = !smartSettings[key];
    const success = await setSmartReminderEnabled(key, nextValue);

    if (!success) {
      showError("Notifications are not allowed on this device.");
      setLoading(false);
      return;
    }

    const nextSettings = { ...smartSettings, [key]: nextValue };
    setSmartSettings(nextSettings);
    await syncSmartRemindersForChildren(children);
    setLoading(false);
  };

  const reminderRows: Array<{ key: keyof typeof smartSettings; title: string; description: string }> = [
    { key: "noPoop", title: "No-poop threshold", description: "Age-aware reminder when it's time to review a long gap since the last poop." },
    { key: "redFlagFollowUp", title: "Red-flag stool follow-up", description: "Follow up after white, red, or post-newborn black stool entries." },
    { key: "episodeCheckIn", title: "Active episode check-in", description: "Nudge you to add another update when an episode is still active." },
    { key: "solidsHydration", title: "Solids hydration check", description: "Extra hydration reminder while a solids transition episode is active." },
  ];

  return (
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Notifications</h3>
      <Card>
        <CardContent className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">Daily check-in</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Remind me to log daily</p>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} disabled={loading} ariaLabel="Toggle daily reminder" />
        </CardContent>
      </Card>

      <div className="mt-3 flex flex-col gap-2">
        {reminderRows.map((row) => (
          <Card key={row.key}>
            <CardContent className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text)]">{row.title}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{row.description}</p>
              </div>
              <Switch checked={smartSettings[row.key]} onCheckedChange={() => handleSmartToggle(row.key)} disabled={loading} ariaLabel={`Toggle ${row.title}`} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ThemeSection() {
  const { mode, setMode, nightModeEnabled, setNightModeEnabled, nightModeStart, nightModeEnd, setNightModeSchedule } = useTheme();

  return (
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Appearance</h3>
      <Card>
        <CardContent className="py-3">
          <p className="mb-2 text-sm font-medium text-[var(--color-text)]">Theme</p>
          <SegmentedControl value={mode} onChange={setMode} options={THEME_OPTIONS} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] p-0.5" gridClassName="grid-cols-3" size="sm" />
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">Choose how Tiny Tummy looks during the day.</p>

          <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)]/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text)]">Night mode schedule</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  Automatically switch to the softer low-glare palette during overnight care.
                </p>
              </div>
              <Switch checked={nightModeEnabled} onCheckedChange={setNightModeEnabled} ariaLabel="Toggle scheduled night mode" />
            </div>

            {nightModeEnabled && (
              <div className="mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Starts</FieldLabel>
                    <TimePicker value={nightModeStart} onChange={(value) => setNightModeSchedule(value, nightModeEnd)} label="Night mode starts" />
                  </div>
                  <div>
                    <FieldLabel>Ends</FieldLabel>
                    <TimePicker value={nightModeEnd} onChange={(value) => setNightModeSchedule(nightModeStart, value)} label="Night mode ends" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
                  Active from {formatScheduleTime(nightModeStart)} to {formatScheduleTime(nightModeEnd)}.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function MeasurementsSection() {
  const { unitSystem, setUnitSystem } = useUnits();

  return (
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Measurements</h3>
      <Card>
        <CardContent className="py-3">
          <p className="mb-2 text-sm font-medium text-[var(--color-text)]">Unit system</p>
          <SegmentedControl
            value={unitSystem}
            onChange={(value) => setUnitSystem(value as UnitSystem)}
            options={UNIT_SYSTEM_OPTIONS}
            className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] p-0.5"
            gridClassName="grid-cols-2"
            size="sm"
          />
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Feed amounts, growth measurements, quick presets, and reports will use this system.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function EliminationSection({ child }: { child: Child | null }) {
  const [value, setValue] = useState<EliminationViewPreference>("auto");

  useEffect(() => {
    if (!child) {
      setValue("auto");
      return;
    }

    db.getSetting(getEliminationViewSettingKey(child.id)).then((stored) => {
      if (stored === "auto" || stored === "diaper" || stored === "poop") {
        setValue(stored);
      } else {
        setValue("auto");
      }
    });
  }, [child]);

  if (!child) return null;

  return (
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Elimination</h3>
      <Card>
        <CardContent className="py-3">
          <p className="mb-2 text-sm font-medium text-[var(--color-text)]">Main tracking page</p>
          <SegmentedControl
            value={value}
            onChange={(next) => {
              const preference = next as EliminationViewPreference;
              setValue(preference);
              void db.setSetting(getEliminationViewSettingKey(child.id), preference);
            }}
            options={ELIMINATION_VIEW_OPTIONS}
            className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] p-0.5"
            gridClassName="grid-cols-3"
            size="sm"
          />
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Auto uses the diaper view through the first year, then switches back to the poop page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function RecordsSection() {
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Records</h3>
      <div className="flex flex-col gap-2">
        <SettingsNavCard title="History" description="Timeline of logged entries" onClick={() => navigate("/history")} />
        <SettingsNavCard title="Growth" description="Weight, length, and head circumference trends" onClick={() => navigate("/growth")} />
        <SettingsNavCard title="Milestones" description="Health-linked context like solids, illness, teething, or medication changes" onClick={() => navigate("/milestones")} />
      </div>
    </div>
  );
}

export function SupportSection() {
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Support</h3>
      <div className="flex flex-col gap-2">
        <SettingsNavCard title="Guidance" description="Evidence-based tips and when to call the doctor" onClick={() => navigate("/guidance")} />
      </div>
    </div>
  );
}

export function AboutSection() {
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">About</h3>
      <Card>
        <CardContent className="flex flex-col gap-2 py-3">
          <p className="text-sm text-[var(--color-text)]">Tiny Tummy v{__APP_VERSION__}</p>
          <p className="text-xs text-[var(--color-muted)]">100% offline. Your data never leaves this device.</p>
          <div className="flex gap-4">
            <button onClick={() => navigate("/privacy")} className="cursor-pointer text-left text-xs font-medium text-[var(--color-primary)]">
              Privacy Policy
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function DeveloperToolsSection({ onSimulateExpiration }: { onSimulateExpiration: () => void }) {
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="mb-12">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-alert)]">Developer Tools</h3>
      <Card className="border-[var(--color-alert)]/30">
        <CardContent className="flex flex-col gap-3 py-3">
          <p className="text-xs text-[var(--color-text-secondary)]">These tools only appear during local development.</p>
          <Button
            variant="secondary"
            className="w-full border border-[var(--color-alert)]/30 text-[var(--color-alert)] hover:bg-[var(--color-alert)]/10"
            onClick={onSimulateExpiration}
          >
            Simulate Trial Expiration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
