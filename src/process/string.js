/**
 * Splits a string into multiple lines.
 *
 * @param {string} string
 * @param {{ charactersPerLine?: number }} options
 */
function toMultiline(
  string,
  { charactersPerLine } = { charactersPerLine: 75 }
) {
  const pattern = new RegExp(`.{0,${charactersPerLine}}`, "g");

  return string.match(pattern)?.join("\n");
}

module.exports = {
  toMultiline,
};