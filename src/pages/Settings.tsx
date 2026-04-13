import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChildContext } from "../contexts/ChildContext";
import { useTrial } from "../contexts/TrialContext";
import { ScenicHero } from "../components/layout/ScenicHero";
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
  const { children, activeChild, refreshChildren } = useChildContext();
  const { clearPremium, resetTrial, setTrialDaysAgo, simulateExpiration, unlockPremium } = useTrial();
  const navigate = useNavigate();
  const deleteChild = useDeleteChildAction(refreshChildren);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await deleteChild(id);
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
          className="-mx-4 overflow-hidden md:-mx-6 lg:-mx-8"
          scene="home"
        />
      )}

      <div className="-mt-24 px-4 md:px-6 lg:px-8">

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
          onSimulateExpiration={() => {
            void simulateExpiration();
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
