import type { ReactNode } from "react"
import { DatePicker } from "../ui/date-picker"
import { AVATAR_COLORS, CHILD_SEX_OPTIONS, FEEDING_TYPES } from "../../lib/constants"
import { cn } from "../../lib/cn"
import { getCurrentLocalDate } from "../../lib/utils"
import type { ChildSex, FeedingType } from "../../lib/types"

export interface BabyDetailsDraft {
  name: string
  dob: string
  sex: ChildSex | null
  feedingType: FeedingType
  avatarColor: string
}

interface AddChildStepProps {
  value: BabyDetailsDraft
  onChange: (value: BabyDetailsDraft) => void
  onNext: () => void
}

const pillBase =
  "h-11 rounded-[18px] border text-[14px] font-semibold transition-all duration-200"
const inputBase =
  "h-11 w-full rounded-[18px] border border-[#E8DACF] bg-white/55 px-4 text-[15px] text-[#3C241F] outline-none transition focus:border-[#F28B67] focus:ring-2 focus:ring-[#F28B67]/20 placeholder:text-[#B49A8E]"
const selectedPill =
  "border-[#F6A27E] bg-[#FFF0E6] text-[#B95E43] shadow-[0_8px_22px_rgba(238,126,86,0.12)]"
const idlePill =
  "border-[#E8DACF] bg-white/45 text-[#4A342D] hover:border-[#F4B191]"

function isBabyDetailsComplete(value: BabyDetailsDraft) {
  return value.name.trim().length > 0 && value.dob.length > 0 && value.sex !== null
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
      <label className="block text-[13px] font-semibold text-[#3C241F]">{label}</label>
      {children}
    </div>
  )
}

export function AddChildStep({ value, onChange, onNext }: AddChildStepProps) {
  const isValid = isBabyDetailsComplete(value)

  const update = (patch: Partial<BabyDetailsDraft>) => {
    onChange({ ...value, ...patch })
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (isValid) onNext()
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <header className="text-center">
        <h2 className="text-[25px] font-extrabold leading-tight tracking-normal text-[#3C241F]">
          Tell us about your baby
        </h2>
        <p className="mx-auto mt-3 max-w-[280px] text-[14px] leading-6 text-[#7A6258]">
          We&apos;ll personalize tracking based on their age and feeding type.
        </p>
      </header>

      <div className="mt-7 space-y-5">
        <Field label="Baby's name">
          <input
            id="child-name"
            type="text"
            value={value.name}
            onChange={(event) => update({ name: event.target.value })}
            placeholder="e.g. Luna"
            className={inputBase}
            autoComplete="off"
          />
        </Field>

        <Field label="Date of birth">
          <DatePicker
            value={value.dob}
            onChange={(dob) => update({ dob })}
            max={getCurrentLocalDate()}
            label="Date of birth"
          />
        </Field>

        <Field label="Sex">
          <div className="grid grid-cols-2 gap-2.5">
            {CHILD_SEX_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => update({ sex: option.value })}
                aria-pressed={value.sex === option.value}
                className={cn(pillBase, value.sex === option.value ? selectedPill : idlePill)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Feeding type">
          <div className="grid grid-cols-2 gap-2.5">
            {FEEDING_TYPES.map((feeding) => (
              <button
                key={feeding.value}
                type="button"
                onClick={() => update({ feedingType: feeding.value })}
                aria-pressed={value.feedingType === feeding.value}
                className={cn(
                  pillBase,
                  "flex items-center justify-center gap-2",
                  value.feedingType === feeding.value ? selectedPill : idlePill,
                )}
              >
                <span
                  className={cn(
                    "h-5 w-5 rounded-full",
                    value.feedingType === feeding.value ? "bg-[#FFB08E]" : "bg-[#EADFD7]",
                  )}
                />
                {feeding.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Avatar color">
          <div className="flex gap-3">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => update({ avatarColor: color })}
                className={cn(
                  "h-10 w-10 rounded-full border-4 border-white shadow-[0_7px_18px_rgba(84,54,42,0.13)] transition",
                  value.avatarColor === color && "ring-2 ring-[#F28B67] ring-offset-2 ring-offset-[#FFF8ED]",
                )}
                style={{ backgroundColor: color }}
                aria-label={`Select avatar color ${color}`}
              />
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-auto pt-7">
        <button
          type="submit"
          disabled={!isValid}
          className="h-14 w-full rounded-[28px] bg-[linear-gradient(180deg,#FF9D77_0%,#F47B58_100%)] text-[16px] font-extrabold text-white shadow-[0_16px_34px_rgba(239,112,75,0.26)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Continue
        </button>
      </div>
    </form>
  )
}
