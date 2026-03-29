import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useChildContext } from "../contexts/ChildContext";
import { useTheme } from "../contexts/ThemeContext";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { DatePicker } from "../components/ui/date-picker";
import { Sheet } from "../components/ui/sheet";
import { useToast } from "../components/ui/toast";
import { FEEDING_TYPES, AVATAR_COLORS } from "../lib/constants";
import { getAgeLabelFromDob } from "../lib/utils";
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
import * as db from "../lib/db";
import type { Child, FeedingType } from "../lib/types";

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
  const [feedingType, setFeedingType] = useState<FeedingType>(child.feeding_type);
  const [avatarColor, setAvatarColor] = useState(child.avatar_color);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing avatar
  useEffect(() => {
    import("../lib/photos").then(({ loadAvatar }) => {
      loadAvatar(child.id).then(setAvatarUrl);
    });
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
            <label htmlFor="edit-name" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Name
            </label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-base outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Date of birth
            </label>
            <DatePicker value={dob} onChange={setDob} max={new Date().toISOString().split("T")[0]} label="Date of birth" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Feeding type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FEEDING_TYPES.map((ft) => (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => setFeedingType(ft.value)}
                  className={cn(
                    "h-10 rounded-[var(--radius-md)] border text-sm font-medium transition-colors duration-200 cursor-pointer",
                    feedingType === ft.value
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
                  )}
                >
                  {ft.label}
                </button>
              ))}
            </div>
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
          <button
            onClick={handleToggle}
            disabled={loading}
            className={cn(
              "relative w-12 h-7 rounded-full cursor-pointer transition-colors duration-200",
              enabled ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]",
              loading && "opacity-50",
            )}
            role="switch"
            aria-checked={enabled}
            aria-label="Toggle daily reminder"
          >
            <div
              className={cn(
                "absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200",
                enabled ? "translate-x-5.5" : "translate-x-0.5",
              )}
            />
          </button>
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
              <button
                onClick={() => handleSmartToggle(row.key)}
                disabled={loading}
                className={cn(
                  "relative w-12 h-7 rounded-full cursor-pointer transition-colors duration-200 shrink-0",
                  smartSettings[row.key] ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]",
                  loading && "opacity-50",
                )}
                role="switch"
                aria-checked={smartSettings[row.key]}
                aria-label={`Toggle ${row.title}`}
              >
                <div
                  className={cn(
                    "absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200",
                    smartSettings[row.key] ? "translate-x-5.5" : "translate-x-0.5",
                  )}
                />
              </button>
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

function ThemeSection() {
  const { mode, setMode } = useTheme();

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
        Appearance
      </h3>
      <Card>
        <CardContent className="py-3">
          <p className="text-sm font-medium text-[var(--color-text)] mb-2">Theme</p>
          <div className="flex bg-[var(--color-bg)] rounded-[var(--radius-sm)] p-0.5 border border-[var(--color-border)]">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMode(opt.value)}
                className={cn(
                  "flex-1 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] cursor-pointer transition-colors duration-200",
                  mode === opt.value
                    ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function Settings() {
  const { children, activeChild, refreshChildren } = useChildContext();
  const navigate = useNavigate();
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await db.deleteChild(id);
    await refreshChildren();
    setConfirmDelete(null);
    // If we deleted the active child, context will auto-select another
  };

  return (
    <div className="px-4 py-5">
      <div className="mb-6 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-soft)]">Preferences</p>
        <h2 className="mt-2 font-[var(--font-display)] text-3xl font-semibold text-[var(--color-text)]">
          Settings
        </h2>
      </div>

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
                      {getAgeLabelFromDob(child.date_of_birth)} · {FEEDING_TYPES.find((f) => f.value === child.feeding_type)?.label}
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

      {/* Notifications */}
      <NotificationSection children={children} />

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

          <Card
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/report"); }}
            className="cursor-pointer hover:shadow-[var(--shadow-soft)] transition-shadow"
            onClick={() => navigate("/report")}
          >
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">Generate Report</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Summary for your doctor
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
            <button
              onClick={() => navigate("/privacy")}
              className="text-xs text-[var(--color-primary)] cursor-pointer text-left"
            >
              Privacy Policy
            </button>
          </CardContent>
        </Card>
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
