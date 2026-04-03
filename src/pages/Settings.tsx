import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useChildContext } from "../contexts/ChildContext";
import { useTheme } from "../contexts/ThemeContext";
import { useUnits } from "../contexts/UnitsContext";
import { useTrial } from "../contexts/TrialContext";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { FieldLabel, Input } from "../components/ui/field";
import { SegmentedControl } from "../components/ui/segmented-control";
import { Switch } from "../components/ui/switch";
import { ScenicHero } from "../components/layout/ScenicHero";
import { DatePicker } from "../components/ui/date-picker";
import { TimePicker } from "../components/ui/time-picker";
import { Sheet } from "../components/ui/sheet";
import { useToast } from "../components/ui/toast";
import { FEEDING_TYPES, AVATAR_COLORS, CHILD_SEX_OPTIONS } from "../lib/constants";
import { getAgeLabelFromDob, getCurrentLocalDate } from "../lib/utils";
import { cn } from "../lib/cn";
import {
  isDailyReminderEnabled,
  enableDailyReminder,
  cancelDailyReminder,
  getSmartReminderSettings,
  setSmartReminderEnabled,
  syncSmartRemindersForChildren,
} from "../lib/notifications";
import { AvatarUpload } from "../components/child/AvatarUpload";
import { Avatar } from "../components/child/Avatar";
import { saveAvatar, deleteAvatar } from "../lib/photos";
import { getEliminationViewSettingKey, type EliminationViewPreference } from "../lib/diaper";
import * as db from "../lib/db";
import type { Child, ChildSex, FeedingType, UnitSystem } from "../lib/types";

function EditChildSheet({
  child,
  open,
  onClose,
  onSaved,
}: {
  child: Child;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(child.name);
  const [dob, setDob] = useState(child.date_of_birth);
  const [sex, setSex] = useState<ChildSex | null>(child.sex);
  const [feedingType, setFeedingType] = useState<FeedingType>(child.feeding_type);
  const [avatarColor, setAvatarColor] = useState(child.avatar_color);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing avatar
  useEffect(() => {
    let cancelled = false;

    setAvatarUrl(null);
    import("../lib/photos").then(({ loadAvatar }) => {
      loadAvatar(child.id).then((nextAvatarUrl) => {
        if (!cancelled) {
          setAvatarUrl(nextAvatarUrl);
        } else if (nextAvatarUrl) {
          URL.revokeObjectURL(nextAvatarUrl);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [child.id]);

  const handleAvatarSave = async (blob: Blob) => {
    await saveAvatar(child.id, blob);
    if (avatarUrl) URL.revokeObjectURL(avatarUrl);
    setAvatarUrl(URL.createObjectURL(blob));
  };

  const handleAvatarRemove = async () => {
    await deleteAvatar(child.id);
    if (avatarUrl) URL.revokeObjectURL(avatarUrl);
    setAvatarUrl(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await db.updateChild(child.id, {
      name: name.trim(),
      date_of_birth: dob,
      sex,
      feeding_type: feedingType,
      avatar_color: avatarColor,
    });
    setIsSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-5 pb-8">
        <h2 className="font-[var(--font-display)] text-lg font-semibold text-[var(--color-text)] mb-5 text-center">
          Edit {child.name}
        </h2>

        <div className="flex flex-col gap-4">
          {/* Avatar photo */}
          <AvatarUpload
            currentImageUrl={avatarUrl}
            fallbackColor={avatarColor}
            fallbackInitial={name.trim().charAt(0).toUpperCase() || child.name.charAt(0).toUpperCase()}
            onSave={handleAvatarSave}
            onRemove={handleAvatarRemove}
            size="lg"
          />

          <div>
            <FieldLabel htmlFor="edit-name">Name</FieldLabel>
            <Input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>Date of birth</FieldLabel>
            <DatePicker value={dob} onChange={setDob} max={getCurrentLocalDate()} label="Date of birth" />
          </div>

          <div>
            <FieldLabel>Sex</FieldLabel>
            <SegmentedControl
              value={sex}
              onChange={(value) => setSex(value as ChildSex)}
              options={CHILD_SEX_OPTIONS}
              gridClassName="grid-cols-2"
              size="sm"
            />
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
              Growth percentiles need this to match the right chart.
            </p>
          </div>

          <div>
            <FieldLabel>Feeding type</FieldLabel>
            <SegmentedControl
              value={feedingType}
              onChange={setFeedingType}
              options={FEEDING_TYPES}
              gridClassName="grid-cols-2"
              size="sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Avatar color
            </label>
            <div className="flex gap-3">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className={cn(
                    "w-9 h-9 rounded-full cursor-pointer transition-transform duration-200",
                    avatarColor === color && "ring-2 ring-offset-2 ring-[var(--color-primary)] scale-110",
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>
        </div>

        <Button
          variant="cta"
          size="lg"
          className="w-full mt-6"
          onClick={handleSave}
          disabled={!name.trim() || !dob || isSaving}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </Sheet>
  );
}

function NotificationSection({ children }: { children: Child[] }) {
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

  const reminderRows: Array<{
    key: keyof typeof smartSettings;
    title: string;
    description: string;
  }> = [
      {
        key: "noPoop",
        title: "No-poop threshold",
        description: "Age-aware reminder when it's time to review a long gap since the last poop.",
      },
      {
        key: "redFlagFollowUp",
        title: "Red-flag stool follow-up",
        description: "Follow up after white, red, or post-newborn black stool entries.",
      },
      {
        key: "episodeCheckIn",
        title: "Active episode check-in",
        description: "Nudge you to add another update when an episode is still active.",
      },
      {
        key: "solidsHydration",
        title: "Solids hydration check",
        description: "Extra hydration reminder while a solids transition episode is active.",
      },
    ];

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
        Notifications
      </h3>
      <Card>
        <CardContent className="py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">Daily check-in</p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Remind me to log daily
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} disabled={loading} ariaLabel="Toggle daily reminder" />
        </CardContent>
      </Card>

      <div className="mt-3 flex flex-col gap-2">
        {reminderRows.map((row) => (
          <Card key={row.key}>
            <CardContent className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text)]">{row.title}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {row.description}
                </p>
              </div>
              <Switch checked={smartSettings[row.key]} onCheckedChange={() => handleSmartToggle(row.key)} disabled={loading} ariaLabel={`Toggle ${row.title}`} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

const THEME_OPTIONS: { value: "system" | "light" | "dark"; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const UNIT_SYSTEM_OPTIONS: { value: UnitSystem; label: string }[] = [
  { value: "metric", label: "Metric" },
  { value: "imperial", label: "Imperial" },
];

function formatScheduleTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

function ThemeSection() {
  const {
    mode,
    setMode,
    nightModeEnabled,
    setNightModeEnabled,
    nightModeStart,
    nightModeEnd,
    setNightModeSchedule,
  } = useTheme();

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
        Appearance
      </h3>
      <Card>
        <CardContent className="py-3">
          <p className="text-sm font-medium text-[var(--color-text)] mb-2">Theme</p>
          <SegmentedControl value={mode} onChange={setMode} options={THEME_OPTIONS} className="bg-[var(--color-bg)] rounded-[var(--radius-sm)] border border-[var(--color-border)] p-0.5" gridClassName="grid-cols-3" size="sm" />
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Choose how Tiny Tummy looks during the day.
          </p>

          <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)]/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text)]">Night mode schedule</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  Automatically switch to the softer low-glare palette during overnight care.
                </p>
              </div>
              <Switch
                checked={nightModeEnabled}
                onCheckedChange={setNightModeEnabled}
                ariaLabel="Toggle scheduled night mode"
              />
            </div>

            {nightModeEnabled && (
              <div className="mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Starts</FieldLabel>
                    <TimePicker
                      value={nightModeStart}
                      onChange={(value) => setNightModeSchedule(value, nightModeEnd)}
                      label="Night mode starts"
                    />
                  </div>
                  <div>
                    <FieldLabel>Ends</FieldLabel>
                    <TimePicker
                      value={nightModeEnd}
                      onChange={(value) => setNightModeSchedule(nightModeStart, value)}
                      label="Night mode ends"
                    />
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

function MeasurementsSection() {
  const { unitSystem, setUnitSystem } = useUnits();

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
        Measurements
      </h3>
      <Card>
        <CardContent className="py-3">
          <p className="text-sm font-medium text-[var(--color-text)] mb-2">Unit system</p>
          <SegmentedControl
            value={unitSystem}
            onChange={(value) => setUnitSystem(value as UnitSystem)}
            options={UNIT_SYSTEM_OPTIONS}
            className="bg-[var(--color-bg)] rounded-[var(--radius-sm)] border border-[var(--color-border)] p-0.5"
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

const ELIMINATION_VIEW_OPTIONS: { value: EliminationViewPreference; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "diaper", label: "Diaper" },
  { value: "poop", label: "Poop" },
];

function EliminationSection({ child }: { child: Child | null }) {
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
      <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
        Elimination
      </h3>
      <Card>
        <CardContent className="py-3">
          <p className="text-sm font-medium text-[var(--color-text)] mb-2">Main tracking page</p>
          <SegmentedControl
            value={value}
            onChange={(next) => {
              const preference = next as EliminationViewPreference;
              setValue(preference);
              void db.setSetting(getEliminationViewSettingKey(child.id), preference);
            }}
            options={ELIMINATION_VIEW_OPTIONS}
            className="bg-[var(--color-bg)] rounded-[var(--radius-sm)] border border-[var(--color-border)] p-0.5"
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

export function Settings() {
  const { children, activeChild, refreshChildren } = useChildContext();
  const { simulateExpiration } = useTrial();
  const navigate = useNavigate();
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await db.deleteChild(id);
    await refreshChildren();
    setConfirmDelete(null);
    // If we deleted the active child, context will auto-select another
  };

  const heroChild = activeChild ?? children[0] ?? null;

  return (
    <div className="mt-0 px-0 py-0">
      {heroChild && (
        <ScenicHero
          child={heroChild}
          title="Settings"
          description="Preferences, children, reminders, and everyday app setup in one place."
          showChildInfo={false}
          className="overflow-hidden"
        />
      )}

      <div className="-mt-24 px-4">

        {/* Children section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Children
            </h3>
            <div className="flex gap-2">
              {children.length > 1 && (
                <button
                  onClick={() => navigate("/all-kids")}
                  className="text-xs text-[var(--color-primary)] cursor-pointer font-medium"
                >
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[var(--color-text)] truncate">{child.name}</p>
                        {activeChild?.id === child.id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium">
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
                        onClick={() => setEditingChild(child)}
                        className="w-11 h-11 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] cursor-pointer transition-colors"
                        aria-label={`Edit ${child.name}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                        </svg>
                      </button>
                      {children.length > 1 && (
                        confirmDelete === child.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDelete(child.id)}
                              className="px-2 py-1 text-xs bg-[var(--color-alert)] text-white rounded-[var(--radius-sm)] cursor-pointer"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2 py-1 text-xs bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-[var(--radius-sm)] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(child.id)}
                            className="w-11 h-11 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted)] hover:text-[var(--color-alert)] hover:bg-[var(--color-alert-bg)] cursor-pointer transition-colors"
                            aria-label={`Remove ${child.name}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
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

          <Button
            variant="secondary"
            className="w-full mt-3"
            onClick={() => navigate("/add-child")}
          >
            Add Child
          </Button>
        </div>

        {/* Appearance */}
        <ThemeSection />

        <MeasurementsSection />

        <EliminationSection child={activeChild} />

        {/* Notifications */}
        <NotificationSection children={children} />

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Records
          </h3>
          <div className="flex flex-col gap-2">
            <Card
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/history"); }}
              className="cursor-pointer hover:shadow-[var(--shadow-soft)] transition-shadow"
              onClick={() => navigate("/history")}
            >
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">History</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Timeline of logged entries
                  </p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="var(--color-muted)" className="w-5 h-5">
                  <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </CardContent>
            </Card>

            <Card
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/growth"); }}
              className="cursor-pointer hover:shadow-[var(--shadow-soft)] transition-shadow"
              onClick={() => navigate("/growth")}
            >
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">Growth</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Weight, length, and head circumference trends
                  </p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="var(--color-muted)" className="w-5 h-5">
                  <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </CardContent>
            </Card>

            <Card
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/milestones"); }}
              className="cursor-pointer hover:shadow-[var(--shadow-soft)] transition-shadow"
              onClick={() => navigate("/milestones")}
            >
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">Milestones</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Health-linked context like solids, illness, teething, or medication changes
                  </p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="var(--color-muted)" className="w-5 h-5">
                  <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reports */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Support
          </h3>
          <div className="flex flex-col gap-2">
            <Card
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/guidance"); }}
              className="cursor-pointer hover:shadow-[var(--shadow-soft)] transition-shadow"
              onClick={() => navigate("/guidance")}
            >
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">Guidance</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Evidence-based tips and when to call the doctor
                  </p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="var(--color-muted)" className="w-5 h-5">
                  <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* About */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            About
          </h3>
          <Card>
            <CardContent className="py-3 flex flex-col gap-2">
              <p className="text-sm text-[var(--color-text)]">Tiny Tummy v{__APP_VERSION__}</p>
              <p className="text-xs text-[var(--color-muted)]">
                100% offline. Your data never leaves this device.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => navigate("/privacy")}
                  className="text-xs text-[var(--color-primary)] cursor-pointer text-left font-medium"
                >
                  Privacy Policy
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {import.meta.env.DEV && (
          <div className="mb-12">
            <h3 className="text-sm font-semibold text-[var(--color-alert)] uppercase tracking-wider mb-3">
              Developer Tools
            </h3>
            <Card className="border-[var(--color-alert)]/30">
              <CardContent className="py-3 flex flex-col gap-3">
                <p className="text-xs text-[var(--color-text-secondary)]">
                  These tools only appear during local development.
                </p>
                <Button
                  variant="secondary"
                  className="w-full text-[var(--color-alert)] border border-[var(--color-alert)]/30 hover:bg-[var(--color-alert)]/10"
                  onClick={simulateExpiration}
                >
                  Simulate Trial Expiration
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Edit sheet */}
      {editingChild && (
        <EditChildSheet
          key={editingChild.id}
          child={editingChild}
          open={!!editingChild}
          onClose={() => setEditingChild(null)}
          onSaved={refreshChildren}
        />
      )}
    </div>
  );
}
