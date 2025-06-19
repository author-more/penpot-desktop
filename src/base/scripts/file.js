import { isArrayOfFileInfos, isArrayOfFiles } from "../../shared/file.js";
import { ERROR_CODES, isAppError, isErrorCode } from "../../tools/error.js";
import { showAlert } from "./alert.js";

/**
 * @param {Array<import("../../shared/file.js").File>} files
 * @param {Array<import("../../shared/file.js").FileInfo>} failedExports
 */
export async function handleFileExport(files, failedExports) {
	try {
		if (!isArrayOfFiles(files) || !isArrayOfFileInfos(failedExports)) {
			throw new Error("Invalid export bundles provided.");
		}

		const { status } = await window.api.file.export(files);

		const isSuccess = status === "success";
		const hasFailedExports = failedExports.length > 0;
		const isFullSuccess = isSuccess && !hasFailedExports;
		const isPartialSuccess = isSuccess && hasFailedExports;

		const failedExportsFiles =
			isPartialSuccess &&
			failedExports
				.map(({ name, projectName }) => `${projectName}/${name}`)
				.join("\n");
		const alertType = isFullSuccess ? "success" : "warning";
		const alertHeading = isFullSuccess
			? "Projects saved successfully"
			: "Projects saved with issues";
		const alertMessage = isFullSuccess
			? "The projects have been saved successfully."
			: `Projects have been exported, but some files failed to download${typeof failedExportsFiles === "string" ? `: \n ${failedExportsFiles}` : ". Couldn't retrieve the list of files."}`;

		showAlert(
			alertType,
			{
				heading: alertHeading,
				message: alertMessage,
			},
			isFullSuccess
				? {
						duration: 3000,
					}
				: {
						closable: true,
					},
		);
	} catch (error) {
		const isError = error instanceof Error;
		const isValidationError =
			isAppError(error) && isErrorCode(error, ERROR_CODES.FAILED_VALIDATION);
		const message =
			isError || isValidationError
				? error.message
				: "Something went wrong during the saving of the files.";

		showAlert(
			"danger",
			{
				heading: "Failed to save the projects",
				message,
			},
			{
				closable: true,
			},
		);
	}
}
