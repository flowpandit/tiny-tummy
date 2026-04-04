import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

if (import.meta.env.DEV) {
  window.addEventListener("error", (event) => {
    console.error("[startup] window error", event.error ?? event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("[startup] unhandled rejection", event.reason);
  });

  console.info("[startup] boot");
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />,
);
