import { useEffect, useMemo, useState } from "react";
import { useCaregiverManagement } from "../../hooks/useCaregiverManagement";
import {
  CAREGIVER_AVATAR_COLORS,
  CAREGIVER_ROLE_OPTIONS,
  getCaregiverInitial,
  getCaregiverRoleLabel,
  parseCaregiverRole,
  type CaregiverRole,
  type ChildCaregiverProfile,
} from "../../lib/caregivers";
import { cn } from "../../lib/cn";
import type { Caregiver, Child } from "../../lib/types";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { FieldLabel, Input, fieldInputClassName } from "../ui/field";
import { Sheet } from "../ui/sheet";
import { Switch } from "../ui/switch";
import { useToast } from "../ui/toast";

const SETTINGS_SECTION_TITLE_CLASS = "mb-2.5 px-1 text-[0.74rem] font-bold uppercase tracking-[0.18em] text-[var(--color-text-secondary)] md:mb-3 md:text-[0.78rem]";
const SETTINGS_CARD_CLASS = "overflow-hidden rounded-[18px] shadow-[var(--shadow-home-card)] md:rounded-[24px]";

type EditingCaregiver = ChildCaregiverProfile | null;

function CaregiverAvatar({
  color,
  name,
}: {
  color: string | null;
  name: string;
}) {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.92rem] font-bold text-white shadow-[var(--shadow-soft)]"
      style={{ backgroundColor: color ?? CAREGIVER_AVATAR_COLORS[0] }}
      aria-hidden="true"
    >
      {getCaregiverInitial(name)}
    </span>
  );
}

function CaregiverBadge({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-[var(--color-primary)]">
      {children}
    </span>
  );
}

function CaregiverRow({
  caregiver,
  isCurrent,
  onEdit,
  onUnlink,
}: {
  caregiver: ChildCaregiverProfile;
  isCurrent: boolean;
  onEdit: (caregiver: ChildCaregiverProfile) => void;
  onUnlink: (caregiver: ChildCaregiverProfile) => void;
}) {
  const relationship = getCaregiverRoleLabel(caregiver.relationship_to_child ?? caregiver.relationship ?? caregiver.role);

  return (
    <div className="flex min-h-[68px] items-center gap-3 px-4 py-3">
      <CaregiverAvatar color={caregiver.avatar_color} name={caregiver.display_name} />
      <button type="button" onClick={() => onEdit(caregiver)} className="min-w-0 flex-1 cursor-pointer text-left">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="truncate text-[0.95rem] font-semibold leading-tight text-[var(--color-text)]">
            {caregiver.display_name}
          </span>
          {caregiver.is_primary === 1 && <CaregiverBadge>Primary</CaregiverBadge>}
          {isCurrent && <CaregiverBadge>Current</CaregiverBadge>}
        </span>
        <span className="mt-0.5 block text-[0.76rem] leading-tight text-[var(--color-text-secondary)]">
          {relationship}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(caregiver)}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
          aria-label={`Edit ${caregiver.display_name}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onUnlink(caregiver)}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-alert-bg)] hover:text-[var(--color-alert)]"
          aria-label={`Remove ${caregiver.display_name} from this child`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function LinkExistingRow({
  caregiver,
  onLink,
}: {
  caregiver: Caregiver;
  onLink: (caregiver: Caregiver) => void;
}) {
  return (
    <div className="flex min-h-[58px] items-center gap-3 px-4 py-2.5">
      <CaregiverAvatar color={caregiver.avatar_color} name={caregiver.display_name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9rem] font-semibold leading-tight text-[var(--color-text)]">
          {caregiver.display_name}
        </p>
        <p className="mt-0.5 text-[0.74rem] leading-tight text-[var(--color-text-secondary)]">
          {getCaregiverRoleLabel(caregiver.relationship ?? caregiver.role)}
        </p>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={() => onLink(caregiver)}>
        Link
      </Button>
    </div>
  );
}

function CaregiverFormSheet({
  editingCaregiver,
  initialIsPrimary,
  open,
  onClose,
  onDelete,
  onSave,
}: {
  editingCaregiver: EditingCaregiver;
  initialIsPrimary: boolean;
  open: boolean;
  onClose: () => void;
  onDelete: (caregiver: ChildCaregiverProfile) => Promise<void>;
  onSave: (input: {
    displayName: string;
    role: CaregiverRole;
    email: string;
    phone: string;
    avatarColor: string;
    isPrimary: boolean;
  }) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<CaregiverRole>("parent");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarColor, setAvatarColor] = useState(CAREGIVER_AVATAR_COLORS[0]);
  const [isPrimary, setIsPrimary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!open) return;

    setDisplayName(editingCaregiver?.display_name ?? "");
    setRole(parseCaregiverRole(editingCaregiver?.relationship_to_child ?? editingCaregiver?.relationship ?? editingCaregiver?.role ?? "parent"));
    setEmail(editingCaregiver?.email ?? "");
    setPhone(editingCaregiver?.phone ?? "");
    setAvatarColor(editingCaregiver?.avatar_color ?? CAREGIVER_AVATAR_COLORS[0]);
    setIsPrimary(editingCaregiver ? editingCaregiver.is_primary === 1 : initialIsPrimary);
    setIsConfirmingDelete(false);
  }, [editingCaregiver, initialIsPrimary, open]);

  const saveDisabled = displayName.trim().length === 0 || isSaving;

  const handleSave = async () => {
    if (saveDisabled) return;

    setIsSaving(true);
    try {
      await onSave({
        displayName,
        role,
        email,
        phone,
        avatarColor,
        isPrimary,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingCaregiver) return;

    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    setIsSaving(true);
    try {
      await onDelete(editingCaregiver);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-5 pb-8">
        <h2 className="mb-5 text-center text-lg font-semibold text-[var(--color-text)]">
          {editingCaregiver ? "Edit caregiver" : "Add caregiver"}
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <FieldLabel htmlFor="caregiver-name">Display name</FieldLabel>
            <Input
              id="caregiver-name"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="e.g. Mum, Dad, Nana"
              autoComplete="off"
            />
          </div>

          <div>
            <FieldLabel htmlFor="caregiver-role">Relationship</FieldLabel>
            <select
              id="caregiver-role"
              value={role}
              onChange={(event) => setRole(parseCaregiverRole(event.target.value))}
              className={fieldInputClassName}
            >
              {CAREGIVER_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="caregiver-phone">Phone (optional)</FieldLabel>
              <Input
                id="caregiver-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Local note only"
                autoComplete="tel"
              />
            </div>
            <div>
              <FieldLabel htmlFor="caregiver-email">Email (optional)</FieldLabel>
              <Input
                id="caregiver-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Local note only"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Avatar colour</FieldLabel>
            <div className="flex flex-wrap gap-3">
              {CAREGIVER_AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className={cn(
                    "h-9 w-9 cursor-pointer rounded-full transition-transform duration-200",
                    avatarColor === color && "scale-110 ring-2 ring-[var(--color-primary)] ring-offset-2",
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Select caregiver colour ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="flex min-h-[54px] items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--color-bg)] px-3 py-2">
            <div className="min-w-0">
              <p className="text-[0.9rem] font-semibold leading-tight text-[var(--color-text)]">Primary caregiver</p>
              <p className="mt-0.5 text-[0.74rem] leading-snug text-[var(--color-text-secondary)]">
                Used as the main local caregiver label.
              </p>
            </div>
            <Switch checked={isPrimary} onCheckedChange={setIsPrimary} ariaLabel="Mark as primary caregiver" />
          </div>
        </div>

        <p className="mt-5 rounded-[var(--radius-md)] bg-[var(--color-bg)] px-3 py-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          Caregiver details are stored locally on this device. They are not used to send invites or create accounts.
          Contact details are optional and stay on this device unless you export a backup.
        </p>

        <div className="mt-6 grid gap-2">
          <Button
            type="button"
            variant="cta"
            size="lg"
            className="w-full"
            onClick={() => { void handleSave(); }}
            disabled={saveDisabled}
          >
            {isSaving ? "Saving..." : "Save caregiver"}
          </Button>
          {editingCaregiver && (
            <Button
              type="button"
              variant="secondary"
              className="w-full border border-[var(--color-alert)]/30 text-[var(--color-alert)] hover:bg-[var(--color-alert)]/10"
              onClick={() => { void handleDelete(); }}
              disabled={isSaving}
            >
              {isConfirmingDelete ? "Confirm delete caregiver" : "Delete local caregiver"}
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

export function FamilyCaregiversSection({ activeChild }: { activeChild: Child | null }) {
  const { showError, showSuccess } = useToast();
  const {
    linkedCaregivers,
    availableCaregivers,
    currentCaregiverId,
    isLoading,
    error,
    createCaregiver,
    updateCaregiver,
    linkCaregiver,
    unlinkCaregiver,
    deleteCaregiver,
    setCurrentCaregiver,
  } = useCaregiverManagement(activeChild);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingCaregiver, setEditingCaregiver] = useState<EditingCaregiver>(null);
  const [newCaregiverStartsPrimary, setNewCaregiverStartsPrimary] = useState(false);
  const [unlinkConfirmId, setUnlinkConfirmId] = useState<string | null>(null);

  const currentCaregiverOptions = useMemo(() => linkedCaregivers.map((caregiver) => ({
    value: caregiver.id,
    label: caregiver.display_name,
  })), [linkedCaregivers]);

  if (!activeChild) return null;

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    try {
      await action();
      showSuccess(successMessage);
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : "Caregiver update failed.");
    }
  };

  const openAddSheet = (startsPrimary = false) => {
    setEditingCaregiver(null);
    setNewCaregiverStartsPrimary(startsPrimary);
    setIsSheetOpen(true);
  };

  const openEditSheet = (caregiver: ChildCaregiverProfile) => {
    setEditingCaregiver(caregiver);
    setNewCaregiverStartsPrimary(false);
    setIsSheetOpen(true);
  };

  const handleUnlink = async (caregiver: ChildCaregiverProfile) => {
    if (unlinkConfirmId !== caregiver.child_caregiver_id) {
      setUnlinkConfirmId(caregiver.child_caregiver_id);
      return;
    }

    await runAction(async () => {
      await unlinkCaregiver(caregiver.child_caregiver_id);
      if (currentCaregiverId === caregiver.id) {
        await setCurrentCaregiver(null);
      }
      setUnlinkConfirmId(null);
    }, `${caregiver.display_name} was removed from ${activeChild.name}.`);
  };

  const handleSave = async (input: {
    displayName: string;
    role: CaregiverRole;
    email: string;
    phone: string;
    avatarColor: string;
    isPrimary: boolean;
  }) => {
    await runAction(async () => {
      const payload = {
        displayName: input.displayName,
        role: input.role,
        relationship: input.role,
        email: input.email,
        phone: input.phone,
        avatarColor: input.avatarColor,
        isPrimary: input.isPrimary,
      };

      if (editingCaregiver) {
        await updateCaregiver(editingCaregiver.id, payload);
      } else {
        await createCaregiver(payload);
      }
    }, "Caregiver saved.");
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className={SETTINGS_SECTION_TITLE_CLASS}>Family &amp; Caregivers</h3>
        <button type="button" onClick={() => openAddSheet()} className="cursor-pointer text-xs font-semibold text-[var(--color-primary)]">
          Add
        </button>
      </div>

      <Card className={SETTINGS_CARD_CLASS}>
        <CardContent className="p-0">
          <div className="px-4 py-3">
            <p className="text-[0.9rem] font-semibold leading-tight text-[var(--color-text)]">
              {activeChild.name}'s care circle
            </p>
            <p className="mt-1 text-[0.76rem] leading-snug text-[var(--color-text-secondary)]">
              Caregiver details are stored locally on this device. They are not used to send invites or create accounts.
            </p>
            <p className="mt-1 text-[0.72rem] leading-snug text-[var(--color-text-soft)]">
              Contact details are optional and stay on this device unless you export a backup.
            </p>
          </div>

          {error && (
            <div className="border-t border-[var(--color-border)] px-4 py-3 text-[0.82rem] text-[var(--color-alert)]">
              {error}
            </div>
          )}

          {isLoading && linkedCaregivers.length === 0 ? (
            <div className="border-t border-[var(--color-border)] px-4 py-4">
              <div className="h-12 rounded-[14px] bg-[var(--color-home-empty-surface)]" />
            </div>
          ) : linkedCaregivers.length > 0 ? (
            <div className="border-t border-[var(--color-border)]">
              {linkedCaregivers.map((caregiver, index) => (
                <div key={caregiver.child_caregiver_id} className={index > 0 ? "border-t border-[var(--color-border)]" : undefined}>
                  <CaregiverRow
                    caregiver={caregiver}
                    isCurrent={currentCaregiverId === caregiver.id}
                    onEdit={openEditSheet}
                    onUnlink={(nextCaregiver) => { void handleUnlink(nextCaregiver); }}
                  />
                  {unlinkConfirmId === caregiver.child_caregiver_id && (
                    <div className="px-4 pb-3 pl-[68px] text-[0.74rem] text-[var(--color-alert)]">
                      Tap remove again to unlink from {activeChild.name}. Logs keep their historical attribution.
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="border-t border-[var(--color-border)] px-4 py-4">
              <p className="text-[0.86rem] leading-relaxed text-[var(--color-text-secondary)]">
                No caregiver is linked to {activeChild.name} yet. You can add a lightweight local caregiver now, or keep using the app without one.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="cta"
                  onClick={() => openAddSheet(true)}
                >
                  Add Primary caregiver
                </Button>
                <Button type="button" variant="secondary" onClick={() => openAddSheet()}>
                  Add custom caregiver
                </Button>
              </div>
            </div>
          )}

          {linkedCaregivers.length > 0 && (
            <div className="border-t border-[var(--color-border)] px-4 py-3">
              <FieldLabel htmlFor="current-caregiver">Current caregiver on this device</FieldLabel>
              <select
                id="current-caregiver"
                value={currentCaregiverId}
                onChange={(event) => {
                  void runAction(
                    () => setCurrentCaregiver(event.target.value || null),
                    event.target.value ? "Current caregiver updated." : "Current caregiver cleared.",
                  );
                }}
                className={fieldInputClassName}
              >
                <option value="">No current caregiver</option>
                {currentCaregiverOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                This is local to this device and does not change existing logs.
              </p>
            </div>
          )}

          {availableCaregivers.length > 0 && (
            <div className="border-t border-[var(--color-border)]">
              <div className="px-4 pt-3">
                <p className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-soft)]">
                  Link existing caregiver
                </p>
              </div>
              {availableCaregivers.map((caregiver) => (
                <LinkExistingRow
                  key={caregiver.id}
                  caregiver={caregiver}
                  onLink={(nextCaregiver) => {
                    void runAction(
                      () => linkCaregiver(nextCaregiver.id, nextCaregiver.relationship ?? nextCaregiver.role),
                      `${nextCaregiver.display_name} linked to ${activeChild.name}.`,
                    );
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CaregiverFormSheet
        editingCaregiver={editingCaregiver}
        initialIsPrimary={newCaregiverStartsPrimary}
        open={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onDelete={(caregiver) => runAction(() => deleteCaregiver(caregiver.id), "Caregiver deleted.")}
        onSave={handleSave}
      />
    </section>
  );
}
