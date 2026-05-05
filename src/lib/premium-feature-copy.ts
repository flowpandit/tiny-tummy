import { getFeatureDefinition, type FeatureIdentifier } from "./feature-access";

export function getPremiumFeatureCopy(featureId: FeatureIdentifier) {
  const definition = getFeatureDefinition(featureId);

  return {
    label: definition.label,
    title: definition.title,
    description: definition.description,
  };
}
