interface WelcomeProps {
  onNext: () => void
}

function BabyFace() {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="60" cy="60" r="47" fill="var(--color-onboarding-icon-peach-bg)" />
      <circle cx="60" cy="58" r="34" fill="var(--color-onboarding-accent-soft)" />
      <circle cx="45" cy="48" r="5" fill="var(--color-onboarding-text-strong)" />
      <circle cx="75" cy="48" r="5" fill="var(--color-onboarding-text-strong)" />
      <circle cx="43" cy="46" r="1.6" fill="var(--color-onboarding-bg)" />
      <circle cx="73" cy="46" r="1.6" fill="var(--color-onboarding-bg)" />
      <path
        d="M49 68C54 75 66 76 72 68"
        stroke="var(--color-onboarding-selected-text)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="36" cy="61" r="5" fill="var(--color-onboarding-accent)" opacity=".65" />
      <circle cx="84" cy="61" r="5" fill="var(--color-onboarding-accent)" opacity=".65" />
    </svg>
  )
}

export function Welcome({ onNext }: WelcomeProps) {
  return (
    <section className="relative flex min-h-[100dvh] overflow-hidden bg-[var(--color-onboarding-bg)] px-7 py-8 text-[var(--color-onboarding-text)]">
      <div className="pointer-events-none absolute left-[-22px] top-[35%] h-16 w-20 rounded-t-full border-[18px] border-b-0 border-[var(--color-onboarding-accent-soft)]" />
      <div className="pointer-events-none absolute right-[-20px] top-[34%] h-16 w-20 rounded-b-full border-[18px] border-t-0 border-[var(--color-onboarding-accent-soft)]" />

      <div className="relative mx-auto flex w-full max-w-[390px] flex-col items-center justify-center text-center">
        <div className="mb-9 h-28 w-28 rounded-full shadow-[0_18px_45px_rgba(245,134,92,0.18)]">
          <BabyFace />
        </div>

        <h1 className="text-[30px] font-extrabold leading-tight tracking-normal text-[var(--color-onboarding-text)]">
          Tiny Tummy
        </h1>
        <p className="mt-4 max-w-[260px] text-[19px] font-medium leading-7 text-[var(--color-onboarding-text)]">
          Track with confidence,
          <br />
          worry less
        </p>
        <p className="mt-5 max-w-[285px] text-[15px] leading-6 text-[var(--color-onboarding-text-secondary)]">
          Smart tracking that knows what&apos;s normal for your baby&apos;s age.
          100% private, 100% offline.
        </p>

        <button
          type="button"
          onClick={onNext}
          className="mt-20 h-14 w-full rounded-[28px] bg-[linear-gradient(180deg,#FF9D77_0%,#F47B58_100%)] text-[16px] font-extrabold text-white shadow-[0_16px_34px_rgba(239,112,75,0.28)] transition active:scale-[0.99]"
        >
          Get Started
        </button>
      </div>
    </section>
  )
}
