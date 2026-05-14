import { motion } from "framer-motion"
import { FEEDING_TYPES } from "../../lib/constants"
import type { BabyDetailsDraft } from "./AddChildStep"

interface NormalRangeIntroProps {
  baby: BabyDetailsDraft
  goals: string[]
  onFinish: () => Promise<void>
  isSubmitting?: boolean
  error?: string | null
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function BabyPortrait({ baby }: { baby: BabyDetailsDraft }) {
  const initial = baby.name.trim().charAt(0).toUpperCase() || "T"

  return (
    <div className="relative h-28 w-28 rounded-full bg-[var(--color-onboarding-accent-soft)] p-2 shadow-[0_18px_45px_rgba(85,48,33,0.18)]">
      <div
        className="flex h-full w-full items-center justify-center rounded-full text-[42px] font-extrabold text-white"
        style={{ backgroundColor: baby.avatarColor }}
      >
        {initial}
      </div>
      <div className="absolute right-0 top-2 h-9 w-9 rounded-full bg-[var(--color-onboarding-accent-wash)]" />
    </div>
  )
}

export function NormalRangeIntro({
  baby,
  goals,
  onFinish,
  isSubmitting = false,
  error = null,
}: NormalRangeIntroProps) {
  const feedingLabel =
    FEEDING_TYPES.find((feeding) => feeding.value === baby.feedingType)?.label ?? baby.feedingType
  const goalsLabel = goals.length > 0 ? goals.join(", ") : "Not selected"

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden text-center">
      <div className="pointer-events-none absolute left-[-10px] top-[118px] h-16 w-20 rounded-t-full border-[18px] border-b-0 border-[var(--color-onboarding-accent-soft)]" />
      <div className="pointer-events-none absolute right-[-18px] top-[124px] h-16 w-20 rounded-b-full border-[18px] border-t-0 border-[var(--color-onboarding-icon-blue-bg)]" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 210, damping: 22 }}
        className="mt-11 flex justify-center"
      >
        <BabyPortrait baby={baby} />
      </motion.div>

      <h2 className="mt-8 text-[25px] font-extrabold leading-tight tracking-normal text-[var(--color-onboarding-text)]">
        You&apos;re all set!
      </h2>
      <p className="mx-auto mt-3 max-w-[250px] text-[14px] leading-6 text-[var(--color-onboarding-text-secondary)]">
        We&apos;re ready to help you track with confidence.
      </p>

      <div className="mt-8 rounded-[18px] border border-[var(--color-onboarding-border)] bg-[var(--color-onboarding-card)] px-5 py-5 text-left shadow-[var(--color-onboarding-card-shadow)]">
        <dl className="grid grid-cols-[78px_1fr] gap-x-5 gap-y-4 text-[13px]">
          <dt className="font-semibold text-[var(--color-onboarding-text-secondary)]">Baby</dt>
          <dd className="font-medium text-[var(--color-onboarding-text)]">{baby.name.trim()}</dd>
          <dt className="font-semibold text-[var(--color-onboarding-text-secondary)]">DOB</dt>
          <dd className="font-medium text-[var(--color-onboarding-text)]">{formatDate(baby.dob)}</dd>
          <dt className="font-semibold text-[var(--color-onboarding-text-secondary)]">Feeding</dt>
          <dd className="font-medium text-[var(--color-onboarding-text)]">{feedingLabel}</dd>
          <dt className="font-semibold text-[var(--color-onboarding-text-secondary)]">Goals</dt>
          <dd className="font-medium leading-5 text-[var(--color-onboarding-text)]">{goalsLabel}</dd>
        </dl>
      </div>

      {error && (
        <p className="mt-4 rounded-[16px] border border-[var(--color-onboarding-error-border)] bg-[var(--color-onboarding-error-bg)] px-4 py-3 text-left text-[13px] leading-5 text-[var(--color-onboarding-error-text)]">
          {error}
        </p>
      )}

      <div className="mt-auto pt-7">
        <button
          type="button"
          onClick={onFinish}
          disabled={isSubmitting}
          className="h-14 w-full rounded-[28px] bg-[linear-gradient(180deg,#FF9D77_0%,#F47B58_100%)] text-[16px] font-extrabold text-white shadow-[0_16px_34px_rgba(239,112,75,0.26)] transition active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
        >
          {isSubmitting ? "Starting..." : "Start Tracking"}
        </button>
      </div>
    </section>
  )
}
