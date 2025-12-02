import "../../../node_modules/@shoelace-style/shoelace/cdn/shoelace.js";
import { setBasePath } from "../../../node_modules/@shoelace-style/shoelace/cdn/utilities/base-path.js";
import { registerIconLibrary } from "../../../node_modules/@shoelace-style/shoelace/cdn/utilities/icon-library.js";

setBasePath("../../node_modules/@shoelace-style/shoelace/cdn");

registerIconLibrary("lucide", {
	resolver: (name) => `./assets/icons/lucide/${name}.svg`,
});
