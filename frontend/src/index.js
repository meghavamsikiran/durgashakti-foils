import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { validateEnv } from "@/config/validateEnv";

// Validate environment configuration on startup
validateEnv();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Fade out and remove the instant loader once React begins rendering
try {
  const loader = document.getElementById("instant-loader");
  if (loader) {
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 300);
  }
} catch (e) {}

