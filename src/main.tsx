import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { ReportsProvider } from "./hooks/useReports";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <ReportsProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ReportsProvider>
    </AuthProvider>
  </React.StrictMode>,
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => undefined);
  });
}
