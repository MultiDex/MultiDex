import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/cascadia-mono/400.css";
import "./styles/tokens.css";
import "./styles/bundle.css";
import "./styles/app.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
