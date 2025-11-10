/**
 * Tests if given URL is a view mode of a file, based on the file's id.
 *
 * @param {URL} url
 * @param {string =} fileId
 */
export function isViewModeUrl(url, fileId) {
	const isView = url.hash.startsWith("#/view");
	const isFileView = fileId ? url.hash.includes(fileId) : true;

	return isView && isFileView;
}
