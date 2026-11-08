import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import App from "./App";
import { QuickCaptureHUD } from "./components/hud/QuickCaptureHUD";
import "./index.css";

function Root() {
  const [windowLabel, setWindowLabel] = useState<string>("main");
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    try {
      const current = getCurrentWebviewWindow();
      setWindowLabel(current.label);
    } catch {
      // Fallback for browser / dev preview
      const params = new URLSearchParams(window.location.search);
      setWindowLabel(params.get("window") || "main");
    } finally {
      setIsReady(true);
    }
  }, []);

  if (!isReady) return null;

  return windowLabel === "quick-capture" ? <QuickCaptureHUD /> : <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
