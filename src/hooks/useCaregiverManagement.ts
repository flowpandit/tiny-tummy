import { useCallback, useEffect, useMemo, useState } from "react";
import { useServices } from "../contexts/DatabaseContext";
import type { SaveCaregiverInput } from "../lib/services/caregiver-service";
import type { Caregiver, Child } from "../lib/types";
import type { ChildCaregiverProfile } from "../lib/caregivers";

export function useCaregiverManagement(activeChild: Child | null) {
  const { caregivers } = useServices();
  const [linkedCaregivers, setLinkedCaregivers] = useState<ChildCaregiverProfile[]>([]);
  const [availableCaregivers, setAvailableCaregivers] = useState<Caregiver[]>([]);
  const [currentCaregiver, setCurrentCaregiver] = useState<Caregiver | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!activeChild) {
      setLinkedCaregivers([]);
      setAvailableCaregivers([]);
      setCurrentCaregiver(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    try {
      const [linked, available, current] = await Promise.all([
        caregivers.listChildCaregivers(activeChild.id),
        caregivers.listAvailableCaregiversForChild(activeChild.id),
        caregivers.getCurrentCaregiver(),
      ]);
      setLinkedCaregivers(linked);
      setAvailableCaregivers(available);
      setCurrentCaregiver(current);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load caregivers.");
    } finally {
      setIsLoading(false);
    }
  }, [activeChild, caregivers]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const currentCaregiverId = useMemo(() => {
    if (!currentCaregiver) return "";
    return linkedCaregivers.some((caregiver) => caregiver.id === currentCaregiver.id)
      ? currentCaregiver.id
      : "";
  }, [currentCaregiver, linkedCaregivers]);

  const runAndRefresh = useCallback(async (action: () => Promise<void>) => {
    await action();
    await refresh();
  }, [refresh]);

  return {
    linkedCaregivers,
    availableCaregivers,
    currentCaregiver,
    currentCaregiverId,
    isLoading,
    error,
    refresh,
    createCaregiver: useCallback(async (input: SaveCaregiverInput) => {
      if (!activeChild) return;
      await caregivers.createCaregiverForChild(activeChild.id, input);
      await refresh();
    }, [activeChild, caregivers, refresh]),
    updateCaregiver: useCallback(async (caregiverId: string, input: SaveCaregiverInput) => {
      await caregivers.updateCaregiver(caregiverId, input);
      if (activeChild) {
        await caregivers.linkCaregiverToChild(activeChild.id, caregiverId, input.relationship ?? input.role);
      }
      await refresh();
    }, [activeChild, caregivers, refresh]),
    linkCaregiver: useCallback(async (caregiverId: string, relationship?: string | null) => {
      if (!activeChild) return;
      await caregivers.linkCaregiverToChild(activeChild.id, caregiverId, relationship);
      await refresh();
    }, [activeChild, caregivers, refresh]),
    unlinkCaregiver: useCallback((linkId: string) => (
      runAndRefresh(() => caregivers.unlinkCaregiverFromChild(linkId))
    ), [caregivers, runAndRefresh]),
    deleteCaregiver: useCallback((caregiverId: string) => (
      runAndRefresh(() => caregivers.deleteCaregiver(caregiverId))
    ), [caregivers, runAndRefresh]),
    setCurrentCaregiver: useCallback((caregiverId: string | null) => (
      runAndRefresh(() => caregivers.setCurrentCaregiver(caregiverId))
    ), [caregivers, runAndRefresh]),
  };
}
