import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveChild, useChildActions, useChildren } from "../contexts/ChildContext";
import { useTrialActions } from "../contexts/TrialContext";
import { EditChildSheet } from "../components/settings/EditChildSheet";
import {
  AccessSection,
  ChildrenSection,
  DeveloperToolsSection,
  NotificationSection,
  RecordsSupportSection,
  ThemeSection,
} from "../components/settings/SettingsSections";
import { PageBody } from "../components/ui/page-layout";
import { useDeleteChildAction } from "../hooks/useSettingsActions";
import type { Child } from "../lib/types";

function SettingsHeroArt() {
  return (
    <svg viewBox="0 0 190 132" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="settings-cloud" x1="36" y1="26" x2="130" y2="108" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f1e6ff" />
          <stop offset="1" stopColor="#e2d7ff" />
        </linearGradient>
        <linearGradient id="settings-gear" x1="116" y1="66" x2="176" y2="124" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d9d4f7" />
          <stop offset="1" stopColor="#bbb4e7" />
        </linearGradient>
      </defs>
      <path d="M37 88c-14 0-25-10-25-23 0-12 9-22 21-23 6-18 22-29 42-29 19 0 35 11 42 27 17 1 31 14 31 31 0 18-15 31-34 31H37Z" fill="url(#settings-cloud)" opacity=".92" />
      <circle cx="74" cy="64" r="4" fill="#8a7db6" />
      <circle cx="101" cy="64" r="4" fill="#8a7db6" />
      <path d="M81 76c6 7 16 7 22 0" fill="none" stroke="#8a7db6" strokeWidth="4" strokeLinecap="round" />
      <path d="m28 29 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6ZM151 17l2 4 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1 2-4ZM164 43l2 5 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1 2-5Z" fill="#ffd786" opacity=".9" />
      <path d="m154 69 5 9 11 1 2 14-9 6 2 11-12 7-9-7-10 5-11-9 4-11-6-8 6-13 11 1 7-8 9 2Z" fill="url(#settings-gear)" />
      <circle cx="146" cy="93" r="16" fill="#f5f1ff" opacity=".96" />
      <circle cx="146" cy="93" r="8" fill="#c6bfeb" />
    </svg>
  );
}

function SettingsHero() {
  return (
    <section className="overflow-hidden">
      <div
        className="relative min-h-[214px] overflow-hidden rounded-b-[34px] px-8 pb-12 pt-14 md:min-h-[252px] md:px-10 md:pb-16 md:pt-16"
        style={{
          background: "linear-gradient(135deg, color-mix(in srgb, var(--color-bg) 90%, white) 0%, color-mix(in srgb, var(--color-primary) 8%, var(--color-bg)) 52%, color-mix(in srgb, var(--color-bg) 86%, #ffd7a8) 100%)",
        }}
      >
        <div className="pointer-events-none absolute -right-2 top-8 h-28 w-40 opacity-90 md:right-8 md:top-6 md:h-36 md:w-52">
          <SettingsHeroArt />
        </div>

        <div className="relative max-w-[22rem] md:max-w-[30rem]">
          <h1 className="text-[2.05rem] font-extrabold leading-[1.05] tracking-[-0.05em] text-[var(--color-hero-title)] md:text-[2.65rem]">
            Settings
          </h1>
          <p className="mt-2 text-[0.92rem] leading-snug text-[var(--color-text-secondary)] md:text-[1.02rem]">
            Manage your baby, preferences, and app experience.
          </p>
        </div>
      </div>
    </section>
  );
}

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
  };

  return (
    <PageBody className="-mt-8 space-y-0 px-0 py-0">
      <SettingsHero />

      <div className="px-4 md:px-10">
        <ChildrenSection
          activeChild={activeChild}
          children={children}
          className="relative z-10 -mt-16 md:-mt-20"
          onAddChild={() => navigate("/add-child")}
          confirmDelete={confirmDelete}
          onConfirmDelete={setConfirmDelete}
          onDelete={handleDelete}
          onEditChild={setEditingChild}
          onOpenAllKids={() => navigate("/all-kids")}
          onSetConfirmDelete={setConfirmDelete}
        />
      </div>

      <div className="space-y-3 px-4 pb-12 pt-3 md:space-y-5 md:px-10 md:pb-16 md:pt-4">
        <AccessSection />

        <ThemeSection child={activeChild} />

        <NotificationSection children={children} />

        <RecordsSupportSection />

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
    </PageBody>
  );
}
