import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getGuidanceTips } from "../lib/tauri";
import { PageIntro } from "../components/ui/page-intro";
import { PageBody } from "../components/ui/page-layout";
import { cn } from "../lib/cn";
import type { GuidanceTip } from "../lib/types";

const ALL_FILTER = "All";
const TOPIC_FILTERS = [ALL_FILTER, "Feeding Changes", "Normal Patterns", "Toddlers", "Home Remedies"] as const;
type TopicFilter = typeof TOPIC_FILTERS[number];
type TopicTone = "blue" | "purple" | "amber" | "green" | "peach" | "alert";

type GuidanceTopic = GuidanceTip & {
  shortDescription: string;
  intro: string;
  bullets: string[];
  whenToAct?: string;
  tone: TopicTone;
  icon: "bowl" | "bottle" | "baby" | "diaper" | "potty" | "leaf" | "alert" | "shield" | "clipboard";
};

const FALLBACK_GUIDANCE_TIPS: GuidanceTip[] = [
  {
    id: "solids-transition",
    category: "Feeding Changes",
    title: "Starting solids? Expect changes",
    body: "When babies start solid foods (around 6 months), stool color, consistency, and frequency often change. This is normal. Stools may become firmer, darker, and less frequent. Introduce new foods one at a time to identify any that cause issues.",
    severity: "info",
  },
  {
    id: "formula-switch",
    category: "Feeding Changes",
    title: "Switching formulas",
    body: "Changing formula brands or types can temporarily affect bowel patterns. Give your baby 1-2 weeks to adjust before becoming concerned. If constipation persists, talk to your doctor about trying a different formula.",
    severity: "info",
  },
  {
    id: "breastfed-normal",
    category: "Normal Patterns",
    title: "Breastfed babies after 6 weeks",
    body: "It's completely normal for breastfed babies older than 6 weeks to go 5-7 days between poops. Breast milk is so efficiently absorbed that there's little waste. As long as the stool is soft when it does come, this is not constipation.",
    severity: "info",
  },
  {
    id: "infant-dyschezia",
    category: "Normal Patterns",
    title: "Straining doesn't always mean constipation",
    body: "Infant dyschezia is when babies strain, cry, or turn red while pooping -- even though the stool is soft. This happens because babies are still learning to coordinate their abdominal muscles with pelvic floor relaxation. It usually resolves by 3-4 months.",
    severity: "info",
  },
  {
    id: "toilet-training",
    category: "Toddlers",
    title: "Toilet training regression",
    body: "Many toddlers withhold stool during toilet training, which can lead to constipation. Signs include crossing legs, hiding, or refusing to sit on the toilet. Don't force it -- take a break if needed. Ensure adequate fiber and fluid intake.",
    severity: "caution",
  },
  {
    id: "when-to-call",
    category: "When to Call the Doctor",
    title: "Call your doctor if you notice...",
    body: "White, pale, or clay-colored stools (possible bile duct issue)\nBlood in the stool (red or black after the newborn period)\nSevere abdominal distension or vomiting with constipation\nNo stool AND no gas for more than 24 hours in a newborn\nYour baby seems to be in significant pain\nConstipation that doesn't improve with dietary changes after a week",
    severity: "urgent",
  },
  {
    id: "home-remedies",
    category: "Home Remedies",
    title: "Gentle constipation relief",
    body: "For babies on solids: increase water, offer high-fiber foods (prunes, pears, peas). For younger babies: bicycle legs gently, warm bath, tummy massage in clockwise circles. Never give laxatives or suppositories without doctor guidance.",
    severity: "info",
  },
];

const HEALTH_LOG_TIP: GuidanceTip = {
  id: "symptoms-and-episodes",
  category: "Normal Patterns",
  title: "Symptoms and episodes",
  body: "Use Log symptom for one thing you noticed at one time. Use Start episode when the concern is still going and you expect to add updates later. If you are not sure, log a symptom first. You can link it to an episode later if it becomes part of a bigger story.",
  severity: "info",
};

const TOPIC_DETAILS: Record<string, Omit<GuidanceTopic, keyof GuidanceTip>> = {
  "symptoms-and-episodes": {
    shortDescription: "How to decide what to log.",
    intro: "Use the smallest log that fits what is happening. You can keep things simple at first.",
    bullets: [
      "Use Log symptom for one thing you noticed, like a fever reading, cough, rash, vomit, or unusual stool.",
      "Use Start episode when the concern is still going and you want a timeline.",
      "Choose Linked when a symptom belongs to the same episode.",
      "Choose Standalone when the symptom is separate, uncertain, or only happened once.",
    ],
    whenToAct: "If symptoms worsen, breathing seems hard, your baby seems unusually sleepy, has fewer wet diapers, cannot keep fluids down, or you are worried, seek medical advice.",
    tone: "peach",
    icon: "clipboard",
  },
  "solids-transition": {
    shortDescription: "What to expect and how to help.",
    intro: "Starting solids can change poop patterns for a while. This is common as your baby's gut adjusts.",
    bullets: [
      "Stool may become firmer, darker, smellier, or less frequent.",
      "Introduce new foods one at a time so changes are easier to notice.",
      "Keep logging color, texture, and timing if you want a clear pattern for later.",
    ],
    whenToAct: "Call your doctor if you notice blood, white or very pale stool, repeated vomiting, or your baby seems unwell.",
    tone: "blue",
    icon: "bowl",
  },
  "formula-switch": {
    shortDescription: "Tips for a smooth transition.",
    intro: "A formula change can temporarily affect feeding comfort and bowel rhythm.",
    bullets: [
      "Some babies need 1-2 weeks to settle into a new formula.",
      "Poop may look different during the transition.",
      "Track feeds, diapers, and stool changes so patterns are easier to review.",
    ],
    whenToAct: "Talk to your doctor if constipation persists, feeding drops, vomiting continues, or your baby seems uncomfortable.",
    tone: "blue",
    icon: "bottle",
  },
  "breastfed-normal": {
    shortDescription: "What's normal and what to expect.",
    intro: "Breastfed babies can have very different poop rhythms after the early newborn weeks.",
    bullets: [
      "After about 6 weeks, some breastfed babies go several days between poops.",
      "This can be normal when the stool is soft when it comes.",
      "A calm baby with normal feeds and wet diapers is usually more reassuring than the number of days alone.",
    ],
    whenToAct: "Call your doctor if your baby seems in pain, has a swollen belly, vomits, has fewer wet diapers, or the stool is hard or bloody.",
    tone: "purple",
    icon: "baby",
  },
  "infant-dyschezia": {
    shortDescription: "Learn what's normal.",
    intro: "Some babies strain, cry, or turn red while learning how to poop, even when stool is soft.",
    bullets: [
      "Straining does not always mean constipation.",
      "Soft stool is an important clue that the baby may be learning coordination.",
      "This often improves as babies grow and learn to relax the right muscles.",
    ],
    whenToAct: "Seek medical advice if stool is hard, there is blood, your baby seems very uncomfortable, or you feel worried.",
    tone: "purple",
    icon: "diaper",
  },
  "toilet-training": {
    shortDescription: "Why it happens and what to do.",
    intro: "Toddlers may hold stool during toilet training. Pressure can make the pattern harder.",
    bullets: [
      "Withholding can look like hiding, stiffening, crossing legs, or refusing to sit.",
      "A short break from training may help if the process feels stressful.",
      "Offer fluids and fiber-rich foods if those are already part of your child's diet.",
    ],
    whenToAct: "Talk to your doctor if constipation continues, stool is painful, or your child avoids pooping for several days.",
    tone: "amber",
    icon: "potty",
  },
  "home-remedies": {
    shortDescription: "Safe and natural options.",
    intro: "Gentle comfort steps can help some babies, but medicine should always come from doctor guidance.",
    bullets: [
      "For babies on solids, water and fiber-rich foods like prunes, pears, or peas may help.",
      "For younger babies, try bicycle legs, a warm bath, or gentle clockwise tummy massage.",
      "Do not use laxatives or suppositories unless your doctor tells you to.",
    ],
    whenToAct: "Call your doctor if symptoms do not improve, your baby seems in pain, or you are unsure what is safe for your baby's age.",
    tone: "green",
    icon: "leaf",
  },
  "when-to-call": {
    shortDescription: "Important signs that need medical attention.",
    intro: "These signs are worth checking with a doctor. You know your baby best, so call if something feels wrong.",
    bullets: [
      "White, pale, or clay-colored stool.",
      "Blood in stool, or black stool after the newborn period.",
      "Severe belly swelling or vomiting with constipation.",
      "No stool and no gas for more than 24 hours in a newborn.",
      "Your baby seems to be in significant pain.",
      "Constipation does not improve with age-appropriate changes after a week.",
    ],
    whenToAct: "If breathing seems hard, your baby seems unusually sleepy, has fewer wet diapers, cannot keep fluids down, or you are very worried, seek medical advice right away.",
    tone: "alert",
    icon: "alert",
  },
};

function splitBodyIntoBullets(body: string) {
  return body
    .split(/\n+|\. /)
    .map((item) => item.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .map((item) => item.endsWith(".") ? item : `${item}.`);
}

function buildGuidanceTopics(tips: GuidanceTip[]): GuidanceTopic[] {
  const mergedTips = [...tips];
  if (!mergedTips.some((tip) => tip.id === HEALTH_LOG_TIP.id)) {
    mergedTips.splice(Math.min(3, mergedTips.length), 0, HEALTH_LOG_TIP);
  }

  return mergedTips.map((tip) => {
    const details = TOPIC_DETAILS[tip.id];
    return {
      ...tip,
      shortDescription: details?.shortDescription ?? "Helpful context for everyday tracking.",
      intro: details?.intro ?? tip.body,
      bullets: details?.bullets ?? splitBodyIntoBullets(tip.body),
      whenToAct: details?.whenToAct,
      tone: details?.tone ?? (tip.severity === "urgent" ? "alert" : "blue"),
      icon: details?.icon ?? (tip.severity === "urgent" ? "alert" : "shield"),
    };
  });
}

function getToneStyles(tone: TopicTone) {
  if (tone === "alert") {
    return {
      surface: "rgba(255, 238, 234, 0.94)",
      iconSurface: "rgba(255, 218, 209, 0.86)",
      icon: "var(--color-alert)",
      border: "rgba(235, 122, 96, 0.18)",
    };
  }
  if (tone === "purple") {
    return {
      surface: "rgba(246, 240, 255, 0.88)",
      iconSurface: "rgba(233, 221, 250, 0.78)",
      icon: "#9b7ac2",
      border: "rgba(150, 115, 194, 0.12)",
    };
  }
  if (tone === "amber") {
    return {
      surface: "rgba(255, 247, 234, 0.9)",
      iconSurface: "rgba(255, 229, 184, 0.72)",
      icon: "#d99a2b",
      border: "rgba(218, 161, 62, 0.14)",
    };
  }
  if (tone === "green") {
    return {
      surface: "rgba(240, 250, 236, 0.9)",
      iconSurface: "rgba(219, 241, 209, 0.78)",
      icon: "#82ad65",
      border: "rgba(123, 166, 89, 0.14)",
    };
  }
  if (tone === "peach") {
    return {
      surface: "rgba(255, 242, 235, 0.9)",
      iconSurface: "rgba(255, 222, 205, 0.74)",
      icon: "#ef8a62",
      border: "rgba(232, 138, 96, 0.14)",
    };
  }
  return {
    surface: "rgba(239, 247, 255, 0.9)",
    iconSurface: "rgba(220, 238, 255, 0.78)",
    icon: "#5c9ed8",
    border: "rgba(92, 158, 216, 0.12)",
  };
}

function ChevronRightIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="m7.5 4.5 5 5.5-5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M12.5 4.5 7 10l5.5 5.5M7.4 10H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TopicIcon({ icon, className = "h-5 w-5" }: { icon: GuidanceTopic["icon"]; className?: string }) {
  if (icon === "bottle") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M9 7.5h6M10 4.5h4v3h-4zM8 9h8v9.2a2.3 2.3 0 0 1-2.3 2.3h-3.4A2.3 2.3 0 0 1 8 18.2z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M10 12h4M10 15h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (icon === "baby") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9.3 11.2h.02M14.7 11.2h.02M9.7 14.7c1.4 1.2 3.2 1.2 4.6 0M12 5.8c.2-1.4 1.1-2.1 2.4-2.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    );
  }
  if (icon === "diaper") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M5 7.5h14v6.2c0 3.5-2.8 6.3-6.3 6.3h-1.4A6.3 6.3 0 0 1 5 13.7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M5.6 9.2c2.2.3 3.7 1.6 4.3 3.5M18.4 9.2c-2.2.3-3.7 1.6-4.3 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (icon === "potty") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M8 10h8v7a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3zM7 10h10M9 6.5h6l1 3.5H8z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }
  if (icon === "leaf") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M5.5 18.5c8.2.2 12-4.4 13-12-7.7 1-12.2 4.7-13 12ZM6.2 18 13 11.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (icon === "alert") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M12 8.2v5.1M12 17h.01M10.2 4.6 3.7 16.4A2.1 2.1 0 0 0 5.5 19.5h13a2.1 2.1 0 0 0 1.8-3.1L13.8 4.6a2.1 2.1 0 0 0-3.6 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (icon === "clipboard") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M9 5.5h6M9.5 4h5l.5 3H9zM7 6.5H5.8A1.8 1.8 0 0 0 4 8.3v10.4a1.8 1.8 0 0 0 1.8 1.8h12.4a1.8 1.8 0 0 0 1.8-1.8V8.3a1.8 1.8 0 0 0-1.8-1.8H17M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (icon === "shield") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M12 3.8 18.2 6.4v5.3c0 4.3-2.5 7.1-6.2 8.8-3.7-1.7-6.2-4.5-6.2-8.8V6.4L12 3.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="m9.2 12.1 1.9 1.9 3.9-4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M7 19h10a2 2 0 0 0 2-2V8.5L16 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 11h6M9 14.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function GuidanceHero() {
  return (
    <section className="relative -mx-4 min-h-[146px] overflow-hidden px-4 pb-4 pt-4 md:mx-0 md:min-h-[158px] md:px-2 md:pb-5 md:pt-5">
      <div className="relative z-10 max-w-[18rem] md:max-w-[27rem]">
        <h1 className="text-[2.55rem] font-semibold leading-[0.96] tracking-[-0.055em] text-[var(--color-text)] md:text-[3rem]">
          Guidance
        </h1>
        <p className="mt-3 max-w-[20ch] text-[0.98rem] leading-[1.48] text-[var(--color-text-secondary)] md:max-w-[29ch] md:text-[1.06rem]">
          Trusted, pediatric-backed guidance to help you make confident choices.
        </p>
      </div>
      <div className="pointer-events-none absolute right-0 top-2 h-28 w-36 text-[#f59a78] opacity-95 sm:right-3 sm:top-3 sm:h-[7.5rem] sm:w-40 md:right-10 md:top-3 md:h-[8.5rem] md:w-44" aria-hidden="true">
        <svg viewBox="0 0 150 122" className="h-full w-full">
          <path d="M26 76c13-2 22-11 25-26 7 14 4 26-8 37-7-2-13-6-17-11Z" fill="#c8d3bd" opacity="0.86" />
          <rect x="48" y="18" width="66" height="84" rx="11" fill="#f8e3d8" />
          <rect x="59" y="30" width="44" height="60" rx="4" fill="#fffaf6" />
          <path d="M75 18h12a8 8 0 0 1 16 0h13v16H62V18h13Z" fill="#d8ba93" />
          <path d="M73 48c0-5 6-7 10-2 4-5 10-3 10 2 0 6-10 12-10 12S73 54 73 48Z" fill="#d4b695" opacity="0.9" />
          <path d="M75 66h27M75 78h24M75 90h18" stroke="#ead3c4" strokeWidth="6" strokeLinecap="round" />
          <path d="M116 57 137 67v17c0 15-8 25-21 32-13-7-21-17-21-32V67Z" fill="currentColor" />
          <path d="m106 84 7.2 7.2 14-15.2" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  );
}

function CategoryFilters({
  activeFilter,
  onChange,
}: {
  activeFilter: TopicFilter;
  onChange: (filter: TopicFilter) => void;
}) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:px-0">
      {TOPIC_FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onChange(filter)}
          className={cn(
            "h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
            activeFilter === filter
              ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[var(--shadow-soft)]"
              : "border border-[var(--color-border)] bg-[var(--color-surface)]/78 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-strong)]",
          )}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}

function PriorityDoctorCard({
  topic,
  onOpen,
}: {
  topic: GuidanceTopic;
  onOpen: (topic: GuidanceTopic) => void;
}) {
  const tone = getToneStyles("alert");
  return (
    <button
      type="button"
      onClick={() => onOpen(topic)}
      className="flex min-h-[92px] w-full items-center gap-4 rounded-[24px] border px-4 py-4 text-left shadow-[var(--shadow-home-card)] transition-transform hover:-translate-y-0.5"
      style={{ background: tone.surface, borderColor: tone.border }}
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ background: tone.iconSurface, color: tone.icon }}>
        <TopicIcon icon="alert" className="h-7 w-7" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.98rem] font-semibold leading-tight text-[var(--color-text)]">
          When to call the doctor
        </span>
        <span className="mt-1 block max-w-[36ch] text-sm leading-snug text-[var(--color-text-secondary)]">
          Important signs that need medical attention.
        </span>
      </span>
      <ChevronRightIcon className="h-5 w-5 shrink-0 text-[var(--color-text-secondary)]" />
    </button>
  );
}

function TopicRow({
  topic,
  isLast,
  onOpen,
}: {
  topic: GuidanceTopic;
  isLast: boolean;
  onOpen: (topic: GuidanceTopic) => void;
}) {
  const tone = getToneStyles(topic.tone);
  return (
    <button
      type="button"
      onClick={() => onOpen(topic)}
      className={cn(
        "flex min-h-[76px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface)]/72",
        !isLast && "border-b border-[var(--color-border)]/70",
      )}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: tone.iconSurface, color: tone.icon }}>
        <TopicIcon icon={topic.icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.95rem] font-semibold leading-tight text-[var(--color-text)]">
          {topic.title}
        </span>
        <span className="mt-1 block truncate text-sm leading-tight text-[var(--color-text-secondary)]">
          {topic.shortDescription}
        </span>
      </span>
      <ChevronRightIcon className="h-5 w-5 shrink-0 text-[var(--color-text-secondary)]" />
    </button>
  );
}

function TopicSection({
  category,
  topics,
  onOpen,
}: {
  category: string;
  topics: GuidanceTopic[];
  onOpen: (topic: GuidanceTopic) => void;
}) {
  if (topics.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="px-1 text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
        {category}
      </h2>
      <div className="overflow-hidden rounded-[24px] border border-[var(--color-border)]/78 bg-[var(--color-surface-strong)]/88 shadow-[var(--shadow-home-card)]">
        {topics.map((topic, index) => (
          <TopicRow
            key={topic.id}
            topic={topic}
            isLast={index === topics.length - 1}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

function SafetyDisclaimer() {
  const tone = getToneStyles("green");
  return (
    <section className="flex gap-3 rounded-[24px] border border-[var(--color-border)]/82 bg-[var(--color-surface)]/82 p-4 shadow-[var(--shadow-soft)]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: tone.iconSurface, color: "#5e9a7d" }}>
        <TopicIcon icon="shield" className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-semibold text-[var(--color-text)]">Important</p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          This guidance is for general information only and does not replace medical advice.
        </p>
      </div>
    </section>
  );
}

function GuidanceDetailScreen({
  topic,
  onBack,
}: {
  topic: GuidanceTopic;
  onBack: () => void;
}) {
  const tone = getToneStyles(topic.tone);
  return (
    <PageBody className="mx-auto max-w-[760px] space-y-4 px-4 py-3 md:px-6 md:py-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-text-secondary)] shadow-[var(--shadow-soft)]"
      >
        <ArrowLeftIcon />
        Back to guidance
      </button>

      <PageIntro
        eyebrow={topic.category}
        title={topic.title}
        description={topic.intro}
        className="rounded-[28px] border-[var(--color-home-card-border)] bg-[var(--color-surface)]/90 shadow-[var(--shadow-home-card)]"
        action={(
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full sm:flex" style={{ background: tone.iconSurface, color: tone.icon }}>
            <TopicIcon icon={topic.icon} className="h-7 w-7" />
          </span>
        )}
      />

      <section className="rounded-[24px] border border-[var(--color-border)]/78 bg-[var(--color-surface-strong)]/88 p-4 shadow-[var(--shadow-home-card)]">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">What to know</h2>
        <ul className="mt-3 space-y-3">
          {topic.bullets.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone.icon }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {topic.whenToAct && (
        <section className="rounded-[24px] border p-4 shadow-[var(--shadow-soft)]" style={{ background: tone.surface, borderColor: tone.border }}>
          <h2 className="text-sm font-semibold text-[var(--color-text)]">When to act</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {topic.whenToAct}
          </p>
        </section>
      )}

      <SafetyDisclaimer />
    </PageBody>
  );
}

export function GuidanceHubView({
  tips = FALLBACK_GUIDANCE_TIPS,
  initialTopicId,
}: {
  tips?: GuidanceTip[];
  initialTopicId?: string | null;
}) {
  const [activeFilter, setActiveFilter] = useState<TopicFilter>(ALL_FILTER);
  const topics = useMemo(() => buildGuidanceTopics(tips), [tips]);
  const [selectedTopic, setSelectedTopic] = useState<GuidanceTopic | null>(() => (
    initialTopicId
      ? buildGuidanceTopics(tips).find((topic) => topic.id === initialTopicId) ?? null
      : null
  ));
  const appliedInitialTopicIdRef = useRef(initialTopicId ?? null);
  const doctorTopic = topics.find((topic) => topic.id === "when-to-call") ?? null;
  const browsableTopics = topics.filter((topic) => TOPIC_FILTERS.includes(topic.category as TopicFilter));
  const visibleTopics = activeFilter === ALL_FILTER
    ? browsableTopics
    : browsableTopics.filter((topic) => topic.category === activeFilter);
  const groupedTopics = TOPIC_FILTERS
    .filter((filter) => filter !== ALL_FILTER)
    .map((category) => ({
      category,
      topics: visibleTopics.filter((topic) => topic.category === category),
    }))
    .filter((section) => section.topics.length > 0);

  useEffect(() => {
    if (!initialTopicId || appliedInitialTopicIdRef.current === initialTopicId) return;
    appliedInitialTopicIdRef.current = initialTopicId;
    setSelectedTopic(topics.find((topic) => topic.id === initialTopicId) ?? null);
  }, [initialTopicId, topics]);

  if (selectedTopic) {
    return <GuidanceDetailScreen topic={selectedTopic} onBack={() => setSelectedTopic(null)} />;
  }

  return (
    <PageBody className="mx-auto max-w-[820px] space-y-3 px-4 py-1 md:max-w-[860px] md:px-6 md:py-3">
      <GuidanceHero />
      <CategoryFilters activeFilter={activeFilter} onChange={setActiveFilter} />
      {doctorTopic && activeFilter === ALL_FILTER && (
        <PriorityDoctorCard topic={doctorTopic} onOpen={setSelectedTopic} />
      )}
      <div className="space-y-5">
        {groupedTopics.map((section) => (
          <TopicSection
            key={section.category}
            category={section.category}
            topics={section.topics}
            onOpen={setSelectedTopic}
          />
        ))}
      </div>
      <SafetyDisclaimer />
    </PageBody>
  );
}

export function Guidance() {
  const location = useLocation();
  const [tips, setTips] = useState<GuidanceTip[]>(FALLBACK_GUIDANCE_TIPS);
  const initialTopicId = location.state
    && typeof location.state === "object"
    && "guidanceTopicId" in location.state
    && typeof (location.state as { guidanceTopicId?: unknown }).guidanceTopicId === "string"
      ? (location.state as { guidanceTopicId: string }).guidanceTopicId
      : null;

  useEffect(() => {
    let isMounted = true;
    getGuidanceTips().then((nextTips) => {
      if (!isMounted || nextTips.length === 0) return;
      setTips(nextTips);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return <GuidanceHubView tips={tips} initialTopicId={initialTopicId} />;
}
