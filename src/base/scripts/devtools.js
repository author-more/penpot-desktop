import { typedQuerySelector } from "./dom.js";
import { SlDialog } from "../../../node_modules/@shoelace-style/shoelace/cdn/shoelace.js";

window.api.diagnostics.onToggle(({ system, gpu }) => {
	const dialog = typedQuerySelector("sl-dialog#diagnostics", SlDialog);
	const content = dialog?.querySelector("dialog-content");

	if (dialog && content) {
		if (dialog.open) {
			dialog.hide();
			return;
		}

		content.replaceChildren();

		const systemSection = document.createElement("div");
		systemSection.className = "titled-section";
		const systemHeader = document.createElement("h3");
		systemHeader.textContent = "System";
		systemSection.appendChild(systemHeader);
		const systemPre = document.createElement("pre");
		systemPre.textContent = JSON.stringify(system, null, 2);
		systemSection.appendChild(systemPre);
		content.appendChild(systemSection);

		const gpuSection = document.createElement("div");
		gpuSection.className = "titled-section";
		const gpuHeader = document.createElement("h3");
		gpuHeader.textContent = "GPU";
		gpuSection.appendChild(gpuHeader);
		const gpuPre = document.createElement("pre");
		gpuPre.textContent = JSON.stringify(gpu, null, 2);
		gpuSection.appendChild(gpuPre);
		content.appendChild(gpuSection);

		dialog.show();
	}
});
