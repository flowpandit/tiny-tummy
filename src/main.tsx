import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

declare global {
  interface Window {
    __TINYTUMMY_REPORT_STARTUP_ERROR__?: (label: string, detail: unknown) => void;
  }
}

console.info("[startup] main.tsx evaluated");

window.addEventListener("error", (event) => {
  console.error("[startup] window error", event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[startup] unhandled rejection", event.reason);
});

if (import.meta.env.DEV) {
  console.info("[startup] boot");
}

try {
  const root = document.getElementById("root");

  if (!root) {
    throw new Error("Could not find #root element during startup");
  }

  ReactDOM.createRoot(root).render(
    <App />,
  );
} catch (error) {
  console.error("[startup] render failed", error);
  window.__TINYTUMMY_REPORT_STARTUP_ERROR__?.("render", error);
  throw error;
}
