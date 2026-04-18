import React from "react";
import ReactDOM from "react-dom/client";
import { VideoPreviewApp } from "./VideoPreviewApp";
import "./style.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<VideoPreviewApp />
	</React.StrictMode>,
);
