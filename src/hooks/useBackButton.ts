import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Handles Android hardware back button.
 * On standalone pages (add-child, all-kids) go back.
 * On main tab pages, do nothing (app stays open).
 */
export function useBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = () => {
      const standalonePaths = ["/add-child", "/all-kids", "/report"];
      if (standalonePaths.includes(location.pathname)) {
        navigate(-1);
      }
    };

    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [location.pathname, navigate]);
}
