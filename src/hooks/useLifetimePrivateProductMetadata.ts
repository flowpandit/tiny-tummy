import { useEffect, useMemo, useState } from "react";
import { getLifetimePrivateProduct } from "../lib/billing-service";
import {
  LIFETIME_PRIVATE_LOADING_PRICE_LABEL,
  createLifetimePrivateProductMetadata,
  formatLifetimePrivatePrice,
} from "../lib/billing";
import type { BillingProductMetadata } from "../lib/billing/types";

export interface LifetimePrivateProductMetadataState {
  metadata: BillingProductMetadata | null;
  isLoading: boolean;
  priceLabel: string;
}

export function useLifetimePrivateProductMetadata(): LifetimePrivateProductMetadataState {
  const [metadata, setMetadata] = useState<BillingProductMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const loadMetadata = async () => {
      setIsLoading(true);
      try {
        const product = await getLifetimePrivateProduct();
        if (!isCancelled) {
          setMetadata(product);
        }
      } catch (error) {
        if (!isCancelled) {
          setMetadata(createLifetimePrivateProductMetadata({
            source: "fallback",
            available: false,
            errorCode: "failed",
            message: error instanceof Error ? error.message : "Store product metadata could not be loaded.",
          }));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadMetadata();

    return () => {
      isCancelled = true;
    };
  }, []);

  const priceLabel = useMemo(() => {
    if (isLoading && metadata === null) return LIFETIME_PRIVATE_LOADING_PRICE_LABEL;
    return formatLifetimePrivatePrice(metadata);
  }, [isLoading, metadata]);

  return {
    metadata,
    isLoading,
    priceLabel,
  };
}
