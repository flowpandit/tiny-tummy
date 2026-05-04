import type { PremiumFeatureId } from "./feature-access";

const FEATURE_COPY: Record<PremiumFeatureId, { label: string; title: string; description: string }> = {
  doctorReports: {
    label: "Premium report",
    title: "Unlock doctor-ready reports",
    description: "Create private PDFs with poop, diaper, feeding, symptoms, and timeline context for pediatrician visits.",
  },
  fullHistory: {
    label: "Premium history",
    title: "Unlock full poop and diaper history",
    description: "Search older days, use longer ranges, and keep the whole care timeline available when patterns matter.",
  },
  advancedInsights: {
    label: "Premium trends",
    title: "Unlock advanced patterns",
    description: "See poop, diaper, feed, and sleep trends beyond today so changes are easier to explain.",
  },
  photoCapture: {
    label: "Premium photos",
    title: "Unlock private stool photos",
    description: "Add poop and diaper photos to your on-device log so visual changes are easier to compare.",
  },
  multiChild: {
    label: "Premium family",
    title: "Unlock multi-child tracking",
    description: "Keep private logs for every child without accounts, ads, cloud storage, or subscriptions.",
  },
  smartReminders: {
    label: "Premium reminders",
    title: "Unlock smart check-ins",
    description: "Get local no-poop, stool-color follow-up, and active episode reminders without sending data anywhere.",
  },
};

export function getPremiumFeatureCopy(featureId: PremiumFeatureId) {
  return FEATURE_COPY[featureId];
}
