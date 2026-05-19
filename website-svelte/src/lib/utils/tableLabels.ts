/**
 * Post-processes rendered HTML to add data-label attributes to <td> elements
 * based on their column's <th> header text. Used for CSS-only responsive card layout.
 */
export function addTableDataLabels(html: string): string {
	return html.replace(
		/<div class="table-wrap"><table>([\s\S]*?)<\/table><\/div>/g,
		(fullMatch, tableContent) => {
			const headers = extractHeaders(tableContent);
			if (headers.length === 0) return fullMatch;

			const labeled = labelDataCells(tableContent, headers);
			return `<div class="table-wrap"><table>${labeled}</table></div>`;
		}
	);
}

function extractHeaders(tableContent: string): string[] {
	const theadMatch = tableContent.match(/<thead[^>]*>([\s\S]*?)<\/thead>/);
	if (!theadMatch) return [];

	const headers: string[] = [];
	const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/g;
	let m;
	while ((m = thRegex.exec(theadMatch[1])) !== null) {
		const text = m[1].replace(/<[^>]+>/g, '').trim();
		headers.push(text.replace(/"/g, '&quot;'));
	}
	return headers;
}

function labelDataCells(tableContent: string, headers: string[]): string {
	return tableContent.replace(/<tr>([\s\S]*?)<\/tr>/g, (rowMatch, rowContent) => {
		if (rowContent.includes('<th')) return rowMatch; // skip header rows

		let colIdx = 0;
		const labeled = rowContent.replace(/<td([^>]*)>/g, (_, attrs: string) => {
			const label = headers[colIdx] ?? '';
			colIdx++;
			return `<td${attrs} data-label="${label}">`;
		});
		return `<tr>${labeled}</tr>`;
	});
}
