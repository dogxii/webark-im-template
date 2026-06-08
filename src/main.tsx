import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TemplateDemoApp } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<TemplateDemoApp />
	</StrictMode>,
);
