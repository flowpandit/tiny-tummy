import { type ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveChild } from "../../contexts/ChildContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useUnits } from "../../contexts/UnitsContext";
import { usePremiumFeature, useTrialAccess, useTrialActions } from "../../contexts/TrialContext";
import { useEliminationPreference } from "../../hooks/useEliminationPreference";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { SegmentedControl } from "../ui/segmented-control";
import { Switch } from "../ui/switch";
import { FieldLabel } from "../ui/field";
import { TimePicker } from "../ui/time-picker";
import { useToast } from "../ui/toast";
import { Avatar } from "../child/Avatar";
import { PremiumBadge, PremiumInlineLock } from "../billing/PremiumLocks";
import { SmartReminderRows, type SmartReminderKey, type SmartReminderSettings } from "./SmartReminderRows";
import { HomeActionBottleIcon, HomeActionBreastfeedIcon, HomeActionDiaperIcon, HomeActionSymptomIcon, PoopIcon } from "../ui/icons";
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
import {
  getAllowedEliminationViewPreferences,
  type EliminationViewPreference,
} from "../../lib/diaper";
import type { Child, TemperatureUnit, UnitSystem } from "../../lib/types";

const THEME_OPTIONS: { value: "system" | "light" | "dark"; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const UNIT_SYSTEM_OPTIONS: { value: UnitSystem; label: string }[] = [
  { value: "metric", label: "Metric" },
  { value: "imperial", label: "Imperial" },
];

const TEMPERATURE_UNIT_OPTIONS: { value: TemperatureUnit; label: string }[] = [
  { value: "celsius", label: "°C" },
  { value: "fahrenheit", label: "°F" },
];

const ELIMINATION_VIEW_OPTIONS: { value: EliminationViewPreference; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "diaper", label: "Diaper" },
  { value: "poop", label: "Poop" },
];

const SETTINGS_SECTION_TITLE_CLASS = "mb-2.5 px-1 text-[0.74rem] font-bold uppercase tracking-[0.18em] text-[var(--color-text-secondary)] md:mb-3 md:text-[0.78rem]";
const SETTINGS_CARD_CLASS = "overflow-hidden rounded-[18px] shadow-[var(--shadow-home-card)] md:rounded-[24px]";
const SETTINGS_ROW_CLASS = "flex min-h-[56px] items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-surface)]";
const SETTINGS_DESCRIPTION_CLASS = "mt-0.5 text-[0.76rem] leading-snug text-[var(--color-text-secondary)]";

function formatScheduleTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

type SettingsListIcon = "diaper" | "poop" | "feed" | "breastfeed" | "health" | "guidance" | "about";

function SettingsListIcon({ icon }: { icon: SettingsListIcon }) {
  const commonProps = {
    className: "h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };

  if (icon === "diaper") return <HomeActionDiaperIcon className="h-5 w-5" />;
  if (icon === "poop") return <PoopIcon className="h-5 w-5" />;
  if (icon === "feed") return <HomeActionBottleIcon className="h-5 w-5" />;
  if (icon === "breastfeed") return <HomeActionBreastfeedIcon className="h-5 w-5" />;
  if (icon === "health") return <HomeActionSymptomIcon className="h-5 w-5" />;

  if (icon === "guidance") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.6 9a2.6 2.6 0 0 1 5 1c0 2-2.6 2.2-2.6 4" />
        <path d="M12 17h.01" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" />
      <path d="M12 7h.01" />
    </svg>
  );
}

function SettingsListRow({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description?: string;
  icon: SettingsListIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${SETTINGS_ROW_CLASS}`}
    >
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-[var(--color-text-secondary)] transition-colors group-hover:text-[var(--color-text)]">
        <SettingsListIcon icon={icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.95rem] font-semibold leading-tight text-[var(--color-text)]">{title}</span>
        {description && (
          <span className="mt-0.5 block truncate text-[0.76rem] leading-tight text-[var(--color-text-secondary)]">{description}</span>
        )}
      </span>
    </button>
  );
}

export function ChildrenSection({
  activeChild,
  children,
  className = "",
  confirmDelete,
  onAddChild,
  onConfirmDelete,
  onDelete,
  onEditChild,
  onOpenAllKids,
  onSetConfirmDelete,
  isAddChildPremiumLocked = false,
}: {
  activeChild: Child | null;
  children: Child[];
  className?: string;
  confirmDelete: string | null;
  isAddChildPremiumLocked?: boolean;
  onAddChild: () => void;
  onConfirmDelete: (id: string) => void;
  onDelete: (id: string) => void;
  onEditChild: (child: Child) => void;
  onOpenAllKids: () => void;
  onSetConfirmDelete: (id: string | null) => void;
}) {
  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className={SETTINGS_SECTION_TITLE_CLASS}>Children</h3>
        <div className="flex gap-2">
          {children.length > 1 && (
            <button onClick={onOpenAllKids} className="cursor-pointer text-xs font-semibold text-[var(--color-primary)]">
              View All
            </button>
          )}
        </div>
      </div>

      <Card className={SETTINGS_CARD_CLASS}>
        <CardContent className="p-0">
          {children.map((child, index) => (
            <div key={child.id} className={index > 0 ? "border-t border-[var(--color-border)]" : undefined}>
              <div className="flex min-h-[62px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--color-surface)] md:min-h-[68px]">
                <Avatar
                  childId={child.id}
                  name={child.name}
                  color={child.avatar_color}
                  size="sm"
                  className="h-10 w-10 border border-white/80 shadow-[var(--shadow-soft)]"
                />
                <button
                  type="button"
                  onClick={() => onEditChild(child)}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[0.96rem] font-semibold leading-tight text-[var(--color-text)]">{child.name}</span>
                    {activeChild?.id === child.id && (
                      <span className="shrink-0 rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-[var(--color-primary)]">
                        Active
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.76rem] leading-tight text-[var(--color-text-secondary)]">
                    {[getAgeLabelFromDob(child.date_of_birth), child.sex ? CHILD_SEX_OPTIONS.find((option) => option.value === child.sex)?.label : null, FEEDING_TYPES.find((f) => f.value === child.feeding_type)?.label]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>

                {children.length > 1 && confirmDelete === child.id ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => onDelete(child.id)}
                      className="h-8 cursor-pointer rounded-full bg-[var(--color-alert)] px-3 text-[0.74rem] font-semibold text-white"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => onSetConfirmDelete(null)}
                      className="h-8 cursor-pointer rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[0.74rem] font-semibold text-[var(--color-text-secondary)]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => onEditChild(child)}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
                      aria-label={`Edit ${child.name}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                      </svg>
                    </button>
                    {children.length > 1 && (
                      <button
                        onClick={() => onConfirmDelete(child.id)}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-alert-bg)] hover:text-[var(--color-alert)]"
                        aria-label={`Remove ${child.name}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div className={children.length > 0 ? "border-t border-[var(--color-border)]" : undefined}>
            <button
              type="button"
              onClick={onAddChild}
              className="flex min-h-[54px] w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-[var(--color-primary)] transition-colors hover:bg-[var(--color-surface)]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[1.15rem] font-semibold leading-none">
                +
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <span className="text-[0.92rem] font-semibold">{isAddChildPremiumLocked ? "Unlock to add child" : "Add Child"}</span>
                {isAddChildPremiumLocked && <PremiumBadge featureId="multiChild" className="px-2 py-0.5 text-[0.58rem]" />}
              </span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function NotificationSection({ children }: { children: Child[] }) {
  const { showError } = useToast();
  const canUseSmartReminders = usePremiumFeature("smartReminders");
  const [enabled, setEnabled] = useState(false);
  const [smartSettings, setSmartSettings] = useState<SmartReminderSettings>({
    noPoop: false,
    redFlagFollowUp: false,
    episodeCheckIn: false,
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

  const handleSmartToggle = async (key: SmartReminderKey) => {
    if (!canUseSmartReminders) return;

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

  return (
    <section>
      <h3 className={SETTINGS_SECTION_TITLE_CLASS}>Notifications</h3>
      <Card className={SETTINGS_CARD_CLASS}>
        <CardContent className="p-0">
          <div className="flex min-h-[56px] items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-[0.9rem] font-semibold leading-tight text-[var(--color-text)]">Daily check-in</p>
              <p className={SETTINGS_DESCRIPTION_CLASS}>Remind me to log daily</p>
            </div>
            <Switch checked={enabled} onCheckedChange={handleToggle} disabled={loading} ariaLabel="Toggle daily reminder" />
          </div>

          <SmartReminderRows
            canUseSmartReminders={canUseSmartReminders}
            loading={loading}
            onSmartToggle={(key) => { void handleSmartToggle(key); }}
            smartSettings={smartSettings}
          />
        </CardContent>
      </Card>
      {!canUseSmartReminders && (
        <div className="mt-3">
          <PremiumInlineLock
            featureId="smartReminders"
            tone="compact"
            title="Daily reminders stay free"
            description="Unlock Premium for local no-poop, red-flag stool color, and active episode follow-up reminders."
            actionLabel="Unlock smart reminders"
          />
        </div>
      )}
    </section>
  );
}

export function ThemeSection({ child }: { child: Child | null }) {
  const { mode, setMode, nightModeEnabled, setNightModeEnabled, nightModeStart, nightModeEnd, setNightModeSchedule } = useTheme();
  const { unitSystem, temperatureUnit, setUnitSystem, setTemperatureUnit } = useUnits();
  const { preference: eliminationPreference, setPreference } = useEliminationPreference(child);
  const eliminationOptions = ELIMINATION_VIEW_OPTIONS.filter((option) => getAllowedEliminationViewPreferences(child).includes(option.value));
  const eliminationGridClassName = eliminationOptions.length === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <section>
      <h3 className={SETTINGS_SECTION_TITLE_CLASS}>App preferences</h3>
      <Card className={SETTINGS_CARD_CLASS}>
        <CardContent className="p-0">
          <SettingsControlRow
            label="Theme"
            control={(
              <SegmentedControl
                value={mode}
                onChange={setMode}
                options={THEME_OPTIONS}
                className="w-full"
                gridClassName="grid-cols-3"
                size="sm"
                variant="settings"
              />
            )}
          />

          <div className="border-t border-[var(--color-border)]">
            <SettingsControlRow
              label="Unit system"
              control={(
                <SegmentedControl
                  value={unitSystem}
                  onChange={(value) => setUnitSystem(value as UnitSystem)}
                  options={UNIT_SYSTEM_OPTIONS}
                  className="w-full"
                  gridClassName="grid-cols-2"
                  size="sm"
                  variant="settings"
                />
              )}
            />
          </div>

          <div className="border-t border-[var(--color-border)]">
            <SettingsControlRow
              label="Temperature"
              control={(
                <SegmentedControl
                  value={temperatureUnit}
                  onChange={(value) => setTemperatureUnit(value as TemperatureUnit)}
                  options={TEMPERATURE_UNIT_OPTIONS}
                  className="w-full"
                  gridClassName="grid-cols-2"
                  size="sm"
                  variant="settings"
                />
              )}
            />
          </div>

          {eliminationPreference && (
            <div className="border-t border-[var(--color-border)]">
              <SettingsControlRow
                label="Main tracking page"
                control={(
                  <SegmentedControl
                    value={eliminationPreference}
                    onChange={(next) => {
                      const preference = next as EliminationViewPreference;
                      void setPreference(preference);
                    }}
                    options={eliminationOptions}
                    className="w-full"
                    gridClassName={eliminationGridClassName}
                    size="sm"
                    variant="settings"
                  />
                )}
              />
            </div>
          )}

          <div className="border-t border-[var(--color-border)] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.9rem] font-semibold leading-tight text-[var(--color-text)]">Night mode schedule</p>
                <p className={SETTINGS_DESCRIPTION_CLASS}>
                  Switch to the softer low-glare palette overnight.
                </p>
              </div>
              <Switch checked={nightModeEnabled} onCheckedChange={setNightModeEnabled} ariaLabel="Toggle scheduled night mode" />
            </div>

            {nightModeEnabled && (
              <div className="mt-3">
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
    </section>
  );
}

export function MeasurementsSection() {
  return null;
}

export function EliminationSection() {
  return null;
}

function SettingsControlRow({
  label,
  control,
}: {
  label: string;
  control: ReactNode;
}) {
  return (
    <div className="grid min-h-[56px] grid-cols-[128px_minmax(0,1fr)] items-center gap-2.5 px-4 py-3">
      <div className="min-w-0 pr-1">
        <p className="text-[0.9rem] font-semibold leading-[1.1] text-[var(--color-text)]">{label}</p>
      </div>
      <div className="min-w-0">{control}</div>
    </div>
  );
}

export function RecordsSupportSection() {
  const navigate = useNavigate();
  const activeChild = useActiveChild();
  const { experience: eliminationExperience } = useEliminationPreference(activeChild);
  const isBreastfeedVisibleInNav = activeChild?.feeding_type === "breast";
  const openAlternateTrackingPage = (path: "/diaper" | "/poop" | "/feed" | "/breastfeed") => {
    navigate(path, { state: { origin: "/settings", allowSettingsAlternate: true } });
  };
  const alternateEliminationRow = eliminationExperience.mode === "diaper"
    ? { title: "Poop", icon: "poop" as const, onClick: () => openAlternateTrackingPage("/poop") }
    : { title: "Diaper", icon: "diaper" as const, onClick: () => openAlternateTrackingPage("/diaper") };
  const alternateFeedRow = isBreastfeedVisibleInNav
    ? { title: "Feed", icon: "feed" as const, onClick: () => openAlternateTrackingPage("/feed") }
    : { title: "Breastfeed", icon: "breastfeed" as const, onClick: () => openAlternateTrackingPage("/breastfeed") };
  const rows: Array<{
    title: string;
    description?: string;
    icon: SettingsListIcon;
    onClick: () => void;
  }> = [
    alternateEliminationRow,
    alternateFeedRow,
    { title: "Health", icon: "health", onClick: () => navigate("/health", { state: { origin: "/settings" } }) },
    { title: "Support & Guidance", icon: "guidance", onClick: () => navigate("/guidance") },
    {
      title: `About Tiny Tummy v${__APP_VERSION__}`,
      description: "Privacy policy and offline data details",
      icon: "about",
      onClick: () => navigate("/privacy"),
    },
  ];

  return (
    <section>
      <h3 className={SETTINGS_SECTION_TITLE_CLASS}>Records &amp; Support</h3>
      <Card className={SETTINGS_CARD_CLASS}>
        <CardContent className="p-0">
          {rows.map((row, index) => (
            <div key={row.title} className={index > 0 ? "border-t border-[var(--color-border)]" : undefined}>
              <SettingsListRow {...row} />
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

export function AccessSection() {
  const { accessKind, daysRemaining, isLocked } = useTrialAccess();
  const { restorePremium } = useTrialActions();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();
  const isPremium = accessKind === "premium";
  const accessTitle = isPremium
    ? "Tiny Tummy Premium is unlocked"
    : isLocked
      ? "Free basic plan is active"
      : "14-day full trial active";
  const accessDetail = isPremium
    ? "Doctor reports, full history, trends, photos, multi-child support, and smart reminders are available."
    : isLocked
      ? "Basic logging stays free. Premium unlocks reports, full history, trends, photos, extra children, and smart reminders."
      : "Try every Premium feature before deciding. After the trial, basic logging remains free.";

  const handleRestore = async () => {
    try {
      await restorePremium();
      showSuccess("Purchase restored.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Restore failed. Please try again.");
    }
  };

  return (
    <section>
      <div
        className="settings-access-card relative overflow-hidden rounded-[18px] border px-3.5 py-3 shadow-[0_12px_28px_rgba(213,164,84,0.1)] md:flex md:items-center md:gap-4 md:px-4"
        style={{
          background: "linear-gradient(135deg, color-mix(in srgb, #fff7df 74%, var(--color-surface-strong)) 0%, color-mix(in srgb, #fff9ec 76%, var(--color-surface)) 100%)",
          borderColor: "color-mix(in srgb, #f4bf53 42%, var(--color-border))",
        }}
      >
        <div
          aria-hidden="true"
          className="settings-access-card__dark-surface pointer-events-none absolute inset-0 hidden"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, #ffd166 16%, var(--color-surface-strong)) 0%, color-mix(in srgb, var(--color-bg-elevated) 88%, #ffd166) 100%)",
          }}
        />
        <div className="flex items-start gap-2.5 md:flex-1 md:items-center">
          <span className="settings-access-card__icon relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffd166] text-white shadow-[0_10px_20px_rgba(224,158,50,0.18)] md:h-11 md:w-11">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
              <path d="m12 3.4 2.36 4.78 5.27.77-3.82 3.72.9 5.25L12 15.45l-4.71 2.47.9-5.25-3.82-3.72 5.27-.77L12 3.4Z" />
            </svg>
          </span>
          <div className="relative min-w-0">
            <p className="text-[0.92rem] font-bold leading-tight tracking-[-0.02em] text-[var(--color-text)] md:text-[1rem]">
              {accessTitle}
            </p>
            <p className="mt-0.5 text-[0.74rem] leading-snug text-[var(--color-text-secondary)] md:text-[0.84rem]">
              {accessDetail}
            </p>
            {!isLocked && !isPremium && (
              <p className="mt-0.5 text-[0.68rem] font-semibold text-[var(--color-text-soft)] md:text-[0.74rem]">
                {daysRemaining} day{daysRemaining === 1 ? "" : "s"} left in trial
              </p>
            )}
          </div>
        </div>
        <div className="relative mt-3 flex gap-2 md:mt-0 md:shrink-0">
          {!isPremium && (
            <button
              type="button"
              onClick={() => navigate("/unlock", { state: { returnTo: "/settings" } })}
              className="settings-access-card__unlock inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-[#ffd6ad] bg-[var(--color-surface-strong)] px-3.5 text-[0.8rem] font-bold text-[var(--color-primary)] shadow-[var(--shadow-soft)] md:flex-none"
            >
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m5 16 1.4-8 4 3.8L12 6l1.6 5.8 4-3.8L19 16H5Z" />
                <path d="M5 18h14" />
              </svg>
              Unlock
              <span aria-hidden="true" className="text-[1.1rem] leading-none">›</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => { void handleRestore(); }}
            className="settings-access-card__restore inline-flex h-10 items-center justify-center rounded-full px-2.5 text-[0.76rem] font-semibold text-[var(--color-text-secondary)]"
          >
            Restore
          </button>
        </div>
      </div>
    </section>
  );
}

export function DeveloperToolsSection({
  onSimulateExpiration,
  onResetTrial,
  onSetTrialDaysAgo,
  onClearPremium,
  onSimulatePremiumUnlock,
}: {
  onSimulateExpiration: () => Promise<void> | void;
  onResetTrial: () => Promise<void> | void;
  onSetTrialDaysAgo: (daysAgo: number) => Promise<void> | void;
  onClearPremium: () => Promise<void> | void;
  onSimulatePremiumUnlock: () => Promise<void> | void;
}) {
  const { daysRemaining, isLocked } = useTrialAccess();
  const { showError, showSuccess } = useToast();

  if (!import.meta.env.DEV) {
    return null;
  }

  const runAction = async (action: () => Promise<void> | void, successMessage: string) => {
    try {
      await action();
      showSuccess(successMessage);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Developer tool action failed.");
    }
  };

  return (
    <section className="pb-4">
      <h3 className="mb-3 px-1 text-[0.74rem] font-bold uppercase tracking-[0.18em] text-[var(--color-alert)] md:text-[0.78rem]">Developer Tools</h3>
      <Card className={`${SETTINGS_CARD_CLASS} border-[var(--color-alert)]/30`}>
        <CardContent className="flex flex-col gap-3 py-3">
          <p className="text-xs text-[var(--color-text-secondary)]">These tools only appear during local development.</p>
          <p className="rounded-[var(--radius-sm)] bg-[var(--color-alert)]/8 px-3 py-2 text-xs text-[var(--color-text)]">
            Current access state: {isLocked ? "Trial expired" : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left in trial`}
          </p>
          <Button
            variant="secondary"
            className="w-full border border-[var(--color-alert)]/30 text-[var(--color-alert)] hover:bg-[var(--color-alert)]/10"
            onClick={() => {
              void runAction(onResetTrial, "Trial reset to today.");
            }}
          >
            Reset Trial To Today
          </Button>
          <Button
            variant="secondary"
            className="w-full border border-[var(--color-alert)]/30 text-[var(--color-alert)] hover:bg-[var(--color-alert)]/10"
            onClick={() => {
              void runAction(() => onSetTrialDaysAgo(13), "Trial set to 13 days ago.");
            }}
          >
            Set Trial To 13 Days Ago
          </Button>
          <Button
            variant="secondary"
            className="w-full border border-[var(--color-alert)]/30 text-[var(--color-alert)] hover:bg-[var(--color-alert)]/10"
            onClick={() => {
              void runAction(onSimulateExpiration, "Trial expired. Settings stays available by design.");
            }}
          >
            Simulate Trial Expiration
          </Button>
          <Button
            variant="secondary"
            className="w-full border border-[var(--color-alert)]/30 text-[var(--color-alert)] hover:bg-[var(--color-alert)]/10"
            onClick={() => {
              void runAction(onClearPremium, "Premium unlock cleared.");
            }}
          >
            Clear Premium Unlock
          </Button>
          <Button
            variant="secondary"
            className="w-full border border-[var(--color-alert)]/30 text-[var(--color-alert)] hover:bg-[var(--color-alert)]/10"
            onClick={() => {
              void runAction(onSimulatePremiumUnlock, "Premium unlock simulated.");
            }}
          >
            Simulate Premium Unlock
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
