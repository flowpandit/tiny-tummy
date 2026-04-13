import { useEffect, useRef, useState } from "react";
import type { Child } from "../lib/types";

export function useHomeStickyChildBar(activeChild: Child | null, hasLogs: boolean) {
  const [showStickyChildBar, setShowStickyChildBar] = useState(false);
  const avatarAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasLogs) {
      setShowStickyChildBar(false);
      return;
    }

    const avatarAnchor = avatarAnchorRef.current;
    if (!avatarAnchor) return;

    const scrollRoot = avatarAnchor.closest("main");
    if (!(scrollRoot instanceof HTMLElement)) return;

    const updateStickyBar = () => {
      const rootTop = scrollRoot.getBoundingClientRect().top;
      const anchorTop = avatarAnchor.getBoundingClientRect().top;
      setShowStickyChildBar(anchorTop <= rootTop + 12);
    };

    updateStickyBar();
    scrollRoot.addEventListener("scroll", updateStickyBar, { passive: true });
    window.addEventListener("resize", updateStickyBar);

    return () => {
      scrollRoot.removeEventListener("scroll", updateStickyBar);
      window.removeEventListener("resize", updateStickyBar);
    };
  }, [activeChild, hasLogs]);

  return {
    avatarAnchorRef,
    showStickyChildBar,
  };
}
