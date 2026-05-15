import { useMemo, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { Welcome } from "../components/onboarding/Welcome"
import {
  AddChildStep,
  type BabyDetailsDraft,
} from "../components/onboarding/AddChildStep"
import { NormalRangeIntro } from "../components/onboarding/NormalRangeIntro"
import { useChildActions } from "../contexts/ChildContext"
import { useRepositories, useServices } from "../contexts/DatabaseContext"
import { useTheme } from "../contexts/ThemeContext"
import { useUnits } from "../contexts/UnitsContext"
import { useCreateChildAction } from "../hooks/useCreateChildAction"
import type { ThemeMode } from "../hooks/useThemePreferences"
import { cn } from "../lib/cn"
import { AVATAR_COLORS } from "../lib/constants"
import {
  getAllowedEliminationViewPreferences,
  getEliminationViewSettingKey,
  normalizeEliminationViewPreference,
  type EliminationViewPreference,
} from "../lib/diaper"
import { getCurrentLocalDate } from "../lib/utils"
import type { Child, FeedingType, TemperatureUnit, UnitSystem } from "../lib/types"
import { SegmentedControl } from "../components/ui/segmented-control"
import { Switch } from "../components/ui/switch"

const TOTAL_FLOW_STEPS = 8

interface SupportDetailsDraft {
  bedtime: string
  timeZone: string
  birthWeight: string
  notes: string
}

type ParentRelationship = "mom" | "dad" | "caregiver"

interface ParentDetailsDraft {
  name: string
  email: string
  relationship: ParentRelationship
}

type IconName =
  | "breast"
  | "bottle"
  | "mixed"
  | "bowl"
  | "moon"
  | "scale"
  | "note"
  | "pattern"
  | "confidence"
  | "growth"
  | "partner"
  | "privacy"
  | "ads"
  | "control"
  | "check"

interface FeedingSetupOption {
  value: FeedingType
  title: string
  helper: string
  icon: IconName
  tone: "peach" | "blue" | "mint"
}

interface GoalOption {
  id: string
  label: string
  summaryLabel: string
  icon: IconName
}

const currentTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Australia/Brisbane"

const initialSupportDetails: SupportDetailsDraft = {
  bedtime: "",
  timeZone: currentTimeZone,
  birthWeight: "",
  notes: "",
}

const initialParentDetails: ParentDetailsDraft = {
  name: "",
  email: "",
  relationship: "mom",
}

const feedingSetupOptions: FeedingSetupOption[] = [
  {
    value: "breast",
    title: "Exclusively breastfed",
    helper: "Only breast milk",
    icon: "breast",
    tone: "peach",
  },
  {
    value: "formula",
    title: "Formula feeding",
    helper: "Only formula milk",
    icon: "bottle",
    tone: "blue",
  },
  {
    value: "mixed",
    title: "Mixed feeding",
    helper: "Breast milk and formula",
    icon: "mixed",
    tone: "peach",
  },
  {
    value: "solids",
    title: "Starting solids",
    helper: "Baby is eating solids too",
    icon: "bowl",
    tone: "mint",
  },
]

const goalOptions: GoalOption[] = [
  {
    id: "patterns",
    label: "Understand my baby's patterns",
    summaryLabel: "Understand patterns",
    icon: "pattern",
  },
  {
    id: "sleep",
    label: "Sleep better",
    summaryLabel: "Sleep better",
    icon: "moon",
  },
  {
    id: "confidence",
    label: "Feel more confident",
    summaryLabel: "Feel more confident",
    icon: "confidence",
  },
  {
    id: "growth",
    label: "Track growth",
    summaryLabel: "Track growth",
    icon: "growth",
  },
  {
    id: "partner",
    label: "Share with partner",
    summaryLabel: "Share with partner",
    icon: "partner",
  },
]

const relationshipOptions: { value: ParentRelationship; label: string }[] = [
  { value: "mom", label: "Mom" },
  { value: "dad", label: "Dad" },
  { value: "caregiver", label: "Caregiver" },
]

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
]

const unitSystemOptions: { value: UnitSystem; label: string }[] = [
  { value: "metric", label: "Metric" },
  { value: "imperial", label: "Imperial" },
]

const temperatureUnitOptions: { value: TemperatureUnit; label: string }[] = [
  { value: "celsius", label: "°C" },
  { value: "fahrenheit", label: "°F" },
]

const eliminationViewOptions: { value: EliminationViewPreference; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "diaper", label: "Diaper" },
  { value: "poop", label: "Poop" },
]

type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: string) => string[]
}

function getTimeZoneOptions() {
  const intlWithSupportedValues = Intl as IntlWithSupportedValues
  const supportedTimeZones = intlWithSupportedValues.supportedValuesOf?.("timeZone") ?? []

  return Array.from(new Set([currentTimeZone, ...supportedTimeZones]))
    .filter(Boolean)
    .sort((a, b) => formatTimeZoneLabel(a).localeCompare(formatTimeZoneLabel(b)))
}

const timeZoneOptions = getTimeZoneOptions()

const inputBase =
  "h-11 w-full rounded-[18px] border border-[var(--color-onboarding-border)] bg-[var(--color-onboarding-field-bg)] px-4 text-[15px] text-[var(--color-onboarding-text)] outline-none transition focus:border-[var(--color-onboarding-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-onboarding-accent)_22%,transparent)] placeholder:text-[var(--color-onboarding-placeholder)]"
const textAreaBase =
  "min-h-[78px] w-full resize-none rounded-[18px] border border-[var(--color-onboarding-border)] bg-[var(--color-onboarding-field-bg)] px-4 py-3 text-[15px] text-[var(--color-onboarding-text)] outline-none transition focus:border-[var(--color-onboarding-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-onboarding-accent)_22%,transparent)] placeholder:text-[var(--color-onboarding-placeholder)]"
const primaryButtonClass =
  "h-14 w-full rounded-[28px] bg-[linear-gradient(180deg,#FF9D77_0%,#F47B58_100%)] text-[16px] font-extrabold text-white shadow-[0_16px_34px_rgba(239,112,75,0.26)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
const skipButtonClass =
  "mt-4 w-full py-2 text-[14px] font-extrabold text-[var(--color-onboarding-selected-text)] transition hover:text-[var(--color-onboarding-accent)]"

function createDefaultBabyDetails(): BabyDetailsDraft {
  return {
    name: "",
    dob: getCurrentLocalDate(),
    sex: null,
    feedingType: "breast",
    avatarColor: AVATAR_COLORS[3] ?? AVATAR_COLORS[0],
  }
}

function isBabyDetailsComplete(value: BabyDetailsDraft) {
  return value.name.trim().length > 0 && value.dob.length > 0 && value.sex !== null
}

function IconGlyph({ name }: { name: IconName }) {
  const common = {
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      {name === "breast" && (
        <>
          <path {...common} d="M12 4c3.2 3.9 5 6.6 5 9a5 5 0 0 1-10 0c0-2.4 1.8-5.1 5-9Z" />
          <circle cx="12" cy="14" r="1.6" fill="currentColor" />
        </>
      )}
      {name === "bottle" && (
        <>
          <path {...common} d="M10 3h4v4l2 2v9a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3V9l2-2V3Z" />
          <path {...common} d="M9 12h6M9 16h6" />
        </>
      )}
      {name === "mixed" && (
        <>
          <path {...common} d="M9 4c2.2 2.7 3.4 4.6 3.4 6.3a3.4 3.4 0 0 1-6.8 0C5.6 8.6 6.8 6.7 9 4Z" />
          <path {...common} d="M15 7h3v3l1.5 1.5V18a2.5 2.5 0 0 1-2.5 2.5h-1.5A2.5 2.5 0 0 1 13 18v-6.5L15 10V7Z" />
        </>
      )}
      {name === "bowl" && (
        <>
          <path {...common} d="M5 12h14a7 7 0 0 1-14 0Z" />
          <path {...common} d="M8 9c1.4-1.3 2.4-1.3 3.8 0M13 8c1.5-1.6 2.8-1.7 4.5-.4" />
        </>
      )}
      {name === "moon" && <path {...common} d="M18 15.2A7.4 7.4 0 0 1 8.8 6a7.5 7.5 0 1 0 9.2 9.2Z" />}
      {name === "scale" && (
        <>
          <path {...common} d="M7 20h10M9 20l1-10h4l1 10M8 10h8M12 4v6" />
          <path {...common} d="M9 4h6" />
        </>
      )}
      {name === "note" && (
        <>
          <path {...common} d="M7 4h8l3 3v13H7V4Z" />
          <path {...common} d="M15 4v4h4M9 12h6M9 16h5" />
        </>
      )}
      {name === "pattern" && (
        <>
          <path {...common} d="M7 12a5 5 0 0 1 10 0" />
          <path {...common} d="M4 17c2.2-2 4.4-2 6.6 0s4.4 2 6.6 0" />
        </>
      )}
      {name === "confidence" && (
        <>
          <path {...common} d="M12 21s7-4.4 7-10a4 4 0 0 0-7-2.6A4 4 0 0 0 5 11c0 5.6 7 10 7 10Z" />
          <path {...common} d="M9 12.2l2 2 4-4" />
        </>
      )}
      {name === "growth" && (
        <>
          <path {...common} d="M5 19V5M5 19h14" />
          <path {...common} d="M8 15l3-3 2 2 5-6" />
        </>
      )}
      {name === "partner" && (
        <>
          <circle {...common} cx="9" cy="8" r="3" />
          <circle {...common} cx="17" cy="10" r="2.5" />
          <path {...common} d="M4 20a5 5 0 0 1 10 0M13.5 20a4.2 4.2 0 0 1 6.5-3.5" />
        </>
      )}
      {name === "privacy" && (
        <>
          <path {...common} d="M12 3 5.5 5.8v5.7c0 4.1 2.6 7.8 6.5 9.5 3.9-1.7 6.5-5.4 6.5-9.5V5.8L12 3Z" />
          <path {...common} d="M9 12l2 2 4-4" />
        </>
      )}
      {name === "ads" && (
        <>
          <circle {...common} cx="12" cy="12" r="8" />
          <path {...common} d="m9 9 6 6M15 9l-6 6" />
        </>
      )}
      {name === "control" && (
        <>
          <path {...common} d="M7 10V7a5 5 0 0 1 10 0v3" />
          <rect {...common} x="5" y="10" width="14" height="10" rx="2" />
          <path {...common} d="M12 14v2" />
        </>
      )}
      {name === "check" && <path {...common} d="M5 12.5 10 17l9-10" />}
    </svg>
  )
}

function IconBadge({
  icon,
  tone = "peach",
}: {
  icon: IconName
  tone?: "peach" | "blue" | "mint" | "rose"
}) {
  const toneClass = {
    peach: "bg-[var(--color-onboarding-icon-peach-bg)] text-[var(--color-onboarding-icon-peach-text)]",
    blue: "bg-[var(--color-onboarding-icon-blue-bg)] text-[var(--color-onboarding-icon-blue-text)]",
    mint: "bg-[var(--color-onboarding-icon-mint-bg)] text-[var(--color-onboarding-icon-mint-text)]",
    rose: "bg-[var(--color-onboarding-icon-rose-bg)] text-[var(--color-onboarding-icon-rose-text)]",
  }[tone]

  return (
    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", toneClass)}>
      <IconGlyph name={icon} />
    </span>
  )
}

function formatTimeZoneLabel(timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date())
    const offset = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT"
    const city = timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone
    return `(${offset}) ${city}`
  } catch {
    return timeZone
  }
}

function caregiverRoleFor(relationship: ParentRelationship) {
  return relationship === "caregiver" ? "other" : "parent"
}

function ProgressHeader({
  stepIndex,
  onBack,
}: {
  stepIndex: number
  onBack: () => void
}) {
  const progress = (stepIndex / (TOTAL_FLOW_STEPS - 1)) * 100

  return (
    <div className="grid grid-cols-[40px_1fr_40px] items-center">
      <button
        type="button"
        onClick={onBack}
        className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-onboarding-text-strong)] transition hover:bg-[var(--color-onboarding-accent-soft)]"
        aria-label="Go back"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none">
          <path
            d="M12.5 4.5 7 10l5.5 5.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="relative mx-auto h-5 w-full max-w-[245px]" aria-label={`Step ${stepIndex + 1} of ${TOTAL_FLOW_STEPS}`}>
        <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[var(--color-onboarding-border)]" />
        <div
          className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[var(--color-onboarding-accent)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-between">
          {Array.from({ length: TOTAL_FLOW_STEPS }).map((_, index) => {
            const isComplete = index <= stepIndex
            const isFinalComplete = index === TOTAL_FLOW_STEPS - 1 && stepIndex === TOTAL_FLOW_STEPS - 1

            return (
              <span
                key={index}
                className={cn(
                  "flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 bg-[var(--color-onboarding-bg)] transition-colors",
                  isComplete ? "border-[var(--color-onboarding-accent)]" : "border-[var(--color-onboarding-border)]",
                  isFinalComplete && "h-5 w-5 border-[#48B6A8] bg-[#48B6A8] text-white",
                )}
              >
                {isFinalComplete && <IconGlyph name="check" />}
              </span>
            )
          })}
        </div>
      </div>
      <div />
    </div>
  )
}

function StepShell({
  stepIndex,
  onBack,
  children,
}: {
  stepIndex: number
  onBack: () => void
  children: ReactNode
}) {
  return (
    <section className="flex min-h-[100dvh] flex-col bg-[var(--color-onboarding-bg)] px-6 pb-7 pt-[calc(env(safe-area-inset-top)+22px)] text-[var(--color-onboarding-text)]">
      <ProgressHeader stepIndex={stepIndex} onBack={onBack} />
      <div className="mt-8 flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  )
}

function StepHeading({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <header className="text-center">
      <h2 className="text-[25px] font-extrabold leading-tight tracking-normal text-[var(--color-onboarding-text)]">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-[280px] text-[14px] leading-6 text-[var(--color-onboarding-text-secondary)]">
        {subtitle}
      </p>
    </header>
  )
}

function FeedingSetupStep({
  value,
  onChange,
  onNext,
}: {
  value: FeedingType
  onChange: (value: FeedingType) => void
  onNext: () => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <StepHeading
        title="How are you feeding?"
        subtitle="This helps us give you more accurate insights."
      />

      <div className="mt-7 space-y-3">
        {feedingSetupOptions.map((option) => {
          const isSelected = option.value === value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={isSelected}
              className={cn(
                "flex w-full items-center gap-4 rounded-[18px] border px-4 py-4 text-left transition",
                isSelected
                  ? "border-[var(--color-onboarding-selected-border)] bg-[var(--color-onboarding-selected-bg)] shadow-[0_12px_28px_rgba(238,126,86,0.12)]"
                  : "border-[var(--color-onboarding-border)] bg-[var(--color-onboarding-card)] hover:border-[var(--color-onboarding-border-hover)]",
              )}
            >
              <IconBadge icon={option.icon} tone={option.tone} />
              <span>
                <span className="block text-[14px] font-extrabold text-[var(--color-onboarding-text)]">
                  {option.title}
                </span>
                <span className="mt-1 block text-[13px] leading-5 text-[var(--color-onboarding-text-secondary)]">
                  {option.helper}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-auto pt-7">
        <button type="button" onClick={onNext} className={primaryButtonClass}>
          Continue
        </button>
      </div>
    </div>
  )
}

function SupportDetailsStep({
  value,
  onChange,
  onNext,
}: {
  value: SupportDetailsDraft
  onChange: (value: SupportDetailsDraft) => void
  onNext: () => void
}) {
  const update = (patch: Partial<SupportDetailsDraft>) => onChange({ ...value, ...patch })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <StepHeading
        title="Anything else that helps us support you?"
        subtitle="These are optional."
      />

      <div className="mt-7 space-y-5">
        <Field label="Typical bedtime (optional)">
          <input
            type="text"
            value={value.bedtime}
            onChange={(event) => update({ bedtime: event.target.value })}
            placeholder="e.g. 7:30 PM"
            className={inputBase}
          />
        </Field>

        <Field label="Time zone">
          <select
            value={value.timeZone}
            onChange={(event) => update({ timeZone: event.target.value })}
            className={cn(inputBase, "appearance-none")}
          >
            {timeZoneOptions.map((timeZone) => (
              <option key={timeZone} value={timeZone}>
                {formatTimeZoneLabel(timeZone)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Your baby's birth weight">
          <input
            type="text"
            inputMode="decimal"
            value={value.birthWeight}
            onChange={(event) => update({ birthWeight: event.target.value })}
            placeholder="e.g. 3.2 kg"
            className={inputBase}
          />
        </Field>

        <Field label="Any notes (optional)">
          <div className="relative">
            <textarea
              value={value.notes}
              onChange={(event) => update({ notes: event.target.value })}
              maxLength={100}
              placeholder="e.g. Born a little early"
              className={textAreaBase}
            />
            <span className="absolute bottom-3 right-4 text-[11px] font-medium text-[var(--color-onboarding-placeholder)]">
              {value.notes.length}/100
            </span>
          </div>
        </Field>
      </div>

      <div className="mt-auto pt-7">
        <button type="button" onClick={onNext} className={primaryButtonClass}>
          Continue
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="block text-[13px] font-semibold text-[var(--color-onboarding-text)]">{label}</label>
      {children}
    </div>
  )
}

function PreferenceRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-[62px] items-center gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-extrabold leading-tight text-[var(--color-onboarding-text)]">{label}</p>
        {description && (
          <p className="mt-1 text-[12px] leading-4 text-[var(--color-onboarding-text-muted)]">{description}</p>
        )}
      </div>
      <div className="w-[184px] max-w-[56%] shrink-0">{children}</div>
    </div>
  )
}

function PreferencesStep({
  baby,
  themeMode,
  onThemeModeChange,
  unitSystem,
  onUnitSystemChange,
  temperatureUnit,
  onTemperatureUnitChange,
  eliminationPreference,
  onEliminationPreferenceChange,
  nightModeEnabled,
  onNightModeEnabledChange,
  onNext,
}: {
  baby: BabyDetailsDraft
  themeMode: ThemeMode
  onThemeModeChange: (value: ThemeMode) => void
  unitSystem: UnitSystem
  onUnitSystemChange: (value: UnitSystem) => void
  temperatureUnit: TemperatureUnit
  onTemperatureUnitChange: (value: TemperatureUnit) => void
  eliminationPreference: EliminationViewPreference
  onEliminationPreferenceChange: (value: EliminationViewPreference) => void
  nightModeEnabled: boolean
  onNightModeEnabledChange: (value: boolean) => void
  onNext: () => void
}) {
  const allowedEliminationPreferences = getAllowedEliminationViewPreferences({
    date_of_birth: baby.dob,
  })
  const visibleEliminationPreference = allowedEliminationPreferences.includes(eliminationPreference)
    ? eliminationPreference
    : "auto"
  const visibleEliminationOptions = eliminationViewOptions.filter((option) =>
    allowedEliminationPreferences.includes(option.value),
  )
  const eliminationGridClassName = visibleEliminationOptions.length === 2 ? "grid-cols-2" : "grid-cols-3"

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <StepHeading
        title="Set your app preferences"
        subtitle="A few defaults now, all easy to change later."
      />

      <div className="mt-7">
        <p className="px-1 text-[12px] font-extrabold uppercase tracking-[0.24em] text-[var(--color-onboarding-eyebrow)]">
          App preferences
        </p>

        <div className="mt-2 overflow-hidden rounded-[20px] border border-[var(--color-onboarding-border)] bg-[var(--color-onboarding-card-strong)] shadow-[var(--color-onboarding-card-shadow)]">
          <PreferenceRow label="Theme">
            <SegmentedControl
              value={themeMode}
              onChange={onThemeModeChange}
              options={themeOptions}
              gridClassName="grid-cols-3"
              size="sm"
              variant="settings"
            />
          </PreferenceRow>

          <div className="border-t border-[var(--color-onboarding-border)]">
            <PreferenceRow label="Unit system">
              <SegmentedControl
                value={unitSystem}
                onChange={onUnitSystemChange}
                options={unitSystemOptions}
                gridClassName="grid-cols-2"
                size="sm"
                variant="settings"
              />
            </PreferenceRow>
          </div>

          <div className="border-t border-[var(--color-onboarding-border)]">
            <PreferenceRow label="Temperature">
              <SegmentedControl
                value={temperatureUnit}
                onChange={onTemperatureUnitChange}
                options={temperatureUnitOptions}
                gridClassName="grid-cols-2"
                size="sm"
                variant="settings"
              />
            </PreferenceRow>
          </div>

          <div className="border-t border-[var(--color-onboarding-border)]">
            <PreferenceRow label="Main tracking page">
              <SegmentedControl
                value={visibleEliminationPreference}
                onChange={onEliminationPreferenceChange}
                options={visibleEliminationOptions}
                gridClassName={eliminationGridClassName}
                size="sm"
                variant="settings"
              />
            </PreferenceRow>
          </div>

          <div className="border-t border-[var(--color-onboarding-border)]">
            <div className="flex min-h-[70px] items-start justify-between gap-4 px-4 py-4">
              <div className="min-w-0">
                <p className="text-[14px] font-extrabold leading-tight text-[var(--color-onboarding-text)]">
                  Night mode schedule
                </p>
                <p className="mt-1 text-[12px] leading-4 text-[var(--color-onboarding-text-muted)]">
                  Switch to the softer low-glare palette overnight.
                </p>
              </div>
              <Switch
                checked={nightModeEnabled}
                onCheckedChange={onNightModeEnabledChange}
                ariaLabel="Toggle scheduled night mode"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-7">
        <button type="button" onClick={onNext} className={primaryButtonClass}>
          Continue
        </button>
      </div>
    </div>
  )
}

function ParentDetailsStep({
  value,
  onChange,
  onNext,
  onSkip,
}: {
  value: ParentDetailsDraft
  onChange: (value: ParentDetailsDraft) => void
  onNext: () => void
  onSkip: () => void
}) {
  const update = (patch: Partial<ParentDetailsDraft>) => onChange({ ...value, ...patch })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <StepHeading
        title="Tell us about you"
        subtitle="So we can personalize tips and recommendations."
      />

      <div className="mt-7 space-y-5">
        <Field label="Your name">
          <input
            type="text"
            value={value.name}
            onChange={(event) => update({ name: event.target.value })}
            placeholder="e.g. Jane"
            className={inputBase}
            autoComplete="name"
          />
        </Field>

        <Field label="Email (optional)">
          <input
            type="email"
            value={value.email}
            onChange={(event) => update({ email: event.target.value })}
            placeholder="e.g. jane@email.com"
            className={inputBase}
            autoComplete="email"
          />
          <p className="text-[12px] leading-5 text-[var(--color-onboarding-text-muted)]">
            Stored locally unless you choose to sync later.
          </p>
        </Field>

        <Field label="Your relationship to baby">
          <div className="grid grid-cols-2 gap-2.5">
            {relationshipOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => update({ relationship: option.value })}
                aria-pressed={value.relationship === option.value}
                className={cn(
                  "h-11 rounded-[18px] border text-[14px] font-semibold transition",
                  value.relationship === option.value
                    ? "border-[var(--color-onboarding-selected-border)] bg-[var(--color-onboarding-accent-wash)] text-[var(--color-onboarding-selected-text)]"
                    : "border-[var(--color-onboarding-border)] bg-[var(--color-onboarding-card)] text-[var(--color-onboarding-text)] hover:border-[var(--color-onboarding-border-hover)]",
                  option.value === "caregiver" && "col-span-1",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-auto pt-7">
        <button type="button" onClick={onNext} className={primaryButtonClass}>
          Continue
        </button>
        <button type="button" onClick={onSkip} className={skipButtonClass}>
          Skip for now
        </button>
      </div>
    </div>
  )
}

function GoalsStep({
  selectedGoalIds,
  onToggle,
  onNext,
  onSkip,
}: {
  selectedGoalIds: string[]
  onToggle: (id: string) => void
  onNext: () => void
  onSkip: () => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <StepHeading title="What are your main goals?" subtitle="Choose all that apply." />

      <div className="mt-7 space-y-3">
        {goalOptions.map((goal) => {
          const isSelected = selectedGoalIds.includes(goal.id)

          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => onToggle(goal.id)}
              aria-pressed={isSelected}
              className={cn(
                "flex h-[48px] w-full items-center gap-3 rounded-[16px] border px-4 text-left transition",
                isSelected
                  ? "border-[var(--color-onboarding-selected-border)] bg-[var(--color-onboarding-selected-bg)] shadow-[0_10px_22px_rgba(238,126,86,0.1)]"
                  : "border-[var(--color-onboarding-border)] bg-[var(--color-onboarding-card)] hover:border-[var(--color-onboarding-border-hover)]",
              )}
            >
              <span className={cn("text-[var(--color-onboarding-accent)]", !isSelected && "text-[var(--color-onboarding-icon-blue-text)]")}>
                <IconGlyph name={goal.icon} />
              </span>
              <span className="min-w-0 flex-1 text-[14px] font-semibold text-[var(--color-onboarding-text)]">
                {goal.label}
              </span>
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                  isSelected
                    ? "border-[var(--color-onboarding-accent)] bg-[var(--color-onboarding-accent)] text-white"
                    : "border-[var(--color-onboarding-border)] text-[var(--color-onboarding-placeholder)]",
                )}
              >
                <IconGlyph name="check" />
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-auto pt-7">
        <button type="button" onClick={onNext} className={primaryButtonClass}>
          Continue
        </button>
        <button type="button" onClick={onSkip} className={skipButtonClass}>
          Skip for now
        </button>
      </div>
    </div>
  )
}

function PrivacyStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <StepHeading
        title="Your privacy, always"
        subtitle="Your data never leaves your device unless you choose to back it up."
      />

      <div className="mt-7 space-y-3">
        <PrivacyCard
          icon="privacy"
          title="100% Private"
          helper="Everything stays on your device."
          tone="mint"
        />
        <PrivacyCard icon="ads" title="No Ads" helper="A calm experience, always." tone="rose" />
        <PrivacyCard
          icon="control"
          title="You're in control"
          helper="Export or delete your data anytime."
          tone="mint"
        />
      </div>

      <p className="mx-auto mt-7 flex max-w-[270px] items-start gap-3 text-left text-[13px] leading-5 text-[var(--color-onboarding-text-secondary)]">
        <span className="mt-0.5 text-[var(--color-onboarding-text-muted)]">
          <IconGlyph name="control" />
        </span>
        We don&apos;t collect, sell, or share your personal data.
      </p>

      <div className="mt-auto pt-7">
        <button type="button" onClick={onNext} className={primaryButtonClass}>
          Continue
        </button>
      </div>
    </div>
  )
}

function PrivacyCard({
  icon,
  title,
  helper,
  tone,
}: {
  icon: IconName
  title: string
  helper: string
  tone: "mint" | "rose"
}) {
  return (
    <div className="flex items-center gap-4 rounded-[18px] border border-[var(--color-onboarding-border)] bg-[var(--color-onboarding-card)] px-4 py-4 text-left shadow-[var(--color-onboarding-soft-shadow)]">
      <IconBadge icon={icon} tone={tone} />
      <div>
        <p className="text-[14px] font-extrabold text-[var(--color-onboarding-text)]">{title}</p>
        <p className="mt-1 text-[13px] leading-5 text-[var(--color-onboarding-text-secondary)]">{helper}</p>
      </div>
    </div>
  )
}

export function Onboarding() {
  const [step, setStep] = useState(0)
  const [babyDetails, setBabyDetails] = useState<BabyDetailsDraft>(() => createDefaultBabyDetails())
  const [supportDetails, setSupportDetails] = useState<SupportDetailsDraft>(initialSupportDetails)
  const [parentDetails, setParentDetails] = useState<ParentDetailsDraft>(initialParentDetails)
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>(["patterns", "sleep", "confidence"])
  const [eliminationPreference, setEliminationPreference] = useState<EliminationViewPreference>("auto")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const createChild = useCreateChildAction()
  const services = useServices()
  const { settings } = useRepositories()
  const { mode, setMode, nightModeEnabled, setNightModeEnabled } = useTheme()
  const { unitSystem, temperatureUnit, setUnitSystem, setTemperatureUnit } = useUnits()
  const navigate = useNavigate()
  const { refreshChildren, setActiveChildId } = useChildActions()

  const selectedGoalLabels = useMemo(
    () =>
      goalOptions
        .filter((goal) => selectedGoalIds.includes(goal.id))
        .map((goal) => goal.summaryLabel),
    [selectedGoalIds],
  )

  const handleBack = () => {
    if (isSubmitting) return
    setStep((current) => Math.max(0, current - 1))
  }

  const toggleGoal = (id: string) => {
    setSelectedGoalIds((current) =>
      current.includes(id) ? current.filter((goalId) => goalId !== id) : [...current, id],
    )
  }

  const handleFinish = async () => {
    if (isSubmitting) return
    if (!isBabyDetailsComplete(babyDetails) || babyDetails.sex === null) {
      setStep(1)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    let createdChild: Child | null = null

    try {
      createdChild = await createChild({
        name: babyDetails.name,
        dob: babyDetails.dob,
        sex: babyDetails.sex,
        feedingType: babyDetails.feedingType,
        avatarColor: babyDetails.avatarColor,
      })

      const normalizedEliminationPreference = normalizeEliminationViewPreference(
        createdChild,
        eliminationPreference,
      )
      await settings.setSetting(
        getEliminationViewSettingKey(createdChild.id),
        normalizedEliminationPreference,
      )

      if (parentDetails.name.trim().length > 0) {
        const role = caregiverRoleFor(parentDetails.relationship)
        await services.caregivers.createCaregiverForChild(createdChild.id, {
          displayName: parentDetails.name,
          role,
          relationship: role,
          email: parentDetails.email,
          avatarColor: "#DB2777",
          isPrimary: true,
        })
      }

      await refreshChildren()
      setActiveChildId(createdChild.id)
      navigate("/", { replace: true })
    } catch (error) {
      if (createdChild) {
        await refreshChildren()
        setActiveChildId(createdChild.id)
        navigate("/", { replace: true })
        return
      }

      setSubmitError(
        error instanceof Error
          ? error.message
          : "We couldn't finish onboarding. Please try again.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const content = (() => {
    if (step === 0) {
      return <Welcome onNext={() => setStep(1)} />
    }

    if (step === 1) {
      return (
        <StepShell stepIndex={0} onBack={handleBack}>
          <AddChildStep
            value={babyDetails}
            onChange={setBabyDetails}
            onNext={() => setStep(2)}
          />
        </StepShell>
      )
    }

    if (step === 2) {
      return (
        <StepShell stepIndex={1} onBack={handleBack}>
          <FeedingSetupStep
            value={babyDetails.feedingType}
            onChange={(feedingType) => setBabyDetails((current) => ({ ...current, feedingType }))}
            onNext={() => setStep(3)}
          />
        </StepShell>
      )
    }

    if (step === 3) {
      return (
        <StepShell stepIndex={2} onBack={handleBack}>
          <SupportDetailsStep
            value={supportDetails}
            onChange={setSupportDetails}
            onNext={() => setStep(4)}
          />
        </StepShell>
      )
    }

    if (step === 4) {
      return (
        <StepShell stepIndex={3} onBack={handleBack}>
          <PreferencesStep
            baby={babyDetails}
            themeMode={mode}
            onThemeModeChange={setMode}
            unitSystem={unitSystem}
            onUnitSystemChange={setUnitSystem}
            temperatureUnit={temperatureUnit}
            onTemperatureUnitChange={setTemperatureUnit}
            eliminationPreference={eliminationPreference}
            onEliminationPreferenceChange={setEliminationPreference}
            nightModeEnabled={nightModeEnabled}
            onNightModeEnabledChange={setNightModeEnabled}
            onNext={() => setStep(5)}
          />
        </StepShell>
      )
    }

    if (step === 5) {
      return (
        <StepShell stepIndex={4} onBack={handleBack}>
          <ParentDetailsStep
            value={parentDetails}
            onChange={setParentDetails}
            onNext={() => setStep(6)}
            onSkip={() => {
              setParentDetails(initialParentDetails)
              setStep(6)
            }}
          />
        </StepShell>
      )
    }

    if (step === 6) {
      return (
        <StepShell stepIndex={5} onBack={handleBack}>
          <GoalsStep
            selectedGoalIds={selectedGoalIds}
            onToggle={toggleGoal}
            onNext={() => setStep(7)}
            onSkip={() => {
              setSelectedGoalIds([])
              setStep(7)
            }}
          />
        </StepShell>
      )
    }

    if (step === 7) {
      return (
        <StepShell stepIndex={6} onBack={handleBack}>
          <PrivacyStep onNext={() => setStep(8)} />
        </StepShell>
      )
    }

    return (
      <StepShell stepIndex={7} onBack={handleBack}>
        <NormalRangeIntro
          baby={babyDetails}
          goals={selectedGoalLabels}
          onFinish={handleFinish}
          isSubmitting={isSubmitting}
          error={submitError}
        />
      </StepShell>
    )
  })()

  return (
    <div className="min-h-screen bg-[var(--color-onboarding-app-bg)] text-[var(--color-onboarding-text)]">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[430px] overflow-hidden bg-[var(--color-onboarding-bg)] shadow-[var(--color-onboarding-shadow)] md:max-w-none md:shadow-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-[100dvh]"
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
