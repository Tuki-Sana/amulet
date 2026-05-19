import { describe, it, expect } from 'vitest';
import { addTableDataLabels } from '../utils/tableLabels';

const tableHtml = `<div class="table-wrap"><table>
<thead><tr><th>場所</th><th>特徴</th><th>セキュリティ的な性質</th></tr></thead>
<tbody>
<tr><td>ディスク</td><td>データが残る</td><td>痕跡が残る</td></tr>
<tr><td>メモリ</td><td>一時的</td><td>痕跡なし</td></tr>
</tbody>
</table></div>`;

describe('addTableDataLabels', () => {
	it('adds data-label to each td based on column header', () => {
		const result = addTableDataLabels(tableHtml);
		expect(result).toContain('data-label="場所"');
		expect(result).toContain('data-label="特徴"');
		expect(result).toContain('data-label="セキュリティ的な性質"');
	});

	it('applies correct label to each column position', () => {
		const result = addTableDataLabels(tableHtml);
		// 場所 label should come before "ディスク" content
		const diskIdx = result.indexOf('ディスク');
		const labelIdx = result.indexOf('data-label="場所"');
		expect(labelIdx).toBeLessThan(diskIdx);
	});

	it('does not add data-label to th elements', () => {
		const result = addTableDataLabels(tableHtml);
		expect(result).not.toMatch(/<th[^>]*data-label/);
	});

	it('escapes double quotes in header text', () => {
		const html = `<div class="table-wrap"><table>
<thead><tr><th>Name "quoted"</th></tr></thead>
<tbody><tr><td>value</td></tr></tbody>
</table></div>`;
		const result = addTableDataLabels(html);
		expect(result).toContain('data-label="Name &quot;quoted&quot;"');
	});

	it('handles table with no thead gracefully', () => {
		const html = `<div class="table-wrap"><table>
<tbody><tr><td>only</td><td>data</td></tr></tbody>
</table></div>`;
		const result = addTableDataLabels(html);
		expect(result).toBe(html); // unchanged
	});

	it('handles multiple tables independently', () => {
		const html = tableHtml + `<div class="table-wrap"><table>
<thead><tr><th>A</th><th>B</th></tr></thead>
<tbody><tr><td>1</td><td>2</td></tr></tbody>
</table></div>`;
		const result = addTableDataLabels(html);
		expect(result).toContain('data-label="A"');
		expect(result).toContain('data-label="B"');
		expect(result).toContain('data-label="場所"');
	});
});
