import http from "node:http";

const responseText = "Penpot web application mock";

/**
 * Starts an HTTP server on the given port.
 *
 * @param {number} port - The port number to listen on.
 */
function createServer(port) {
	const server = http.createServer((req, res) => {
		res.writeHead(200, { "Content-Type": "text/plain" });
		res.end(responseText);
	});
	server.listen(port, () => {
		// eslint-disable-next-line no-undef
		console.log(`Server running on port ${port}`);
	});
}

createServer(9008);
createServer(9009);
