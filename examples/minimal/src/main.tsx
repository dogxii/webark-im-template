import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MinimalApp } from "./App";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<MinimalApp />
	</StrictMode>,
);
