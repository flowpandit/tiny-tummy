import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveChild, useChildActions, useChildren } from "../contexts/ChildContext";
import { useTrialActions } from "../contexts/TrialContext";
import { EditChildSheet } from "../components/settings/EditChildSheet";
import {
  AccessSection,
  AboutSection,
  ChildrenSection,
  DeveloperToolsSection,
  EliminationSection,
  MeasurementsSection,
  NotificationSection,
  RecordsSection,
  SupportSection,
  ThemeSection,
} from "../components/settings/SettingsSections";
import { useDeleteChildAction } from "../hooks/useSettingsActions";
import type { Child } from "../lib/types";

export function Settings() {
  const children = useChildren();
  const activeChild = useActiveChild();
  const { refreshChildren } = useChildActions();
  const { clearPremium, resetTrial, setTrialDaysAgo, simulateExpiration, unlockPremium } = useTrialActions();
  const navigate = useNavigate();
  const deleteChild = useDeleteChildAction(refreshChildren);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await deleteChild(id);
    setConfirmDelete(null);
    // If we deleted the active child, context will auto-select another
  };

  return (
    <div className="mt-8 px-4 md:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="font-[var(--font-display)] text-3xl font-bold tracking-[-0.04em] text-[var(--color-text)]">
          Settings
        </h1>
      </div>

      {/* Children section */}
      <ChildrenSection
        activeChild={activeChild}
        children={children}
        confirmDelete={confirmDelete}
        onAddChild={() => navigate("/add-child")}
        onConfirmDelete={setConfirmDelete}
        onDelete={handleDelete}
        onEditChild={setEditingChild}
        onOpenAllKids={() => navigate("/all-kids")}
        onSetConfirmDelete={setConfirmDelete}
      />

      {/* Appearance */}
      <ThemeSection />

      <MeasurementsSection />

      <EliminationSection child={activeChild} />

      {/* Notifications */}
      <NotificationSection children={children} />

      <AccessSection />

      <RecordsSection />

      {/* Reports */}
      <SupportSection />

      {/* About */}
      <AboutSection />

      <DeveloperToolsSection
        onSimulateExpiration={async () => {
          await simulateExpiration();
          navigate("/", { replace: true });
        }}
        onResetTrial={() => {
          void resetTrial();
        }}
        onSetTrialDaysAgo={(daysAgo) => {
          void setTrialDaysAgo(daysAgo);
        }}
        onClearPremium={() => {
          void clearPremium();
        }}
        onSimulatePremiumUnlock={() => {
          void unlockPremium();
        }}
      />

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
