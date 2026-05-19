import { describe, it, expect } from 'vitest';
import { computeActiveId } from '../utils/scrollspy';

const IDS = ['intro', 'install', 'usage', 'faq'];

describe('computeActiveId', () => {
	it('returns null when headingIds is empty', () => {
		expect(computeActiveId([], new Set(), null)).toBeNull();
	});

	it('returns first heading by default (nothing scrolled yet)', () => {
		expect(computeActiveId(IDS, new Set(), null)).toBe('intro');
	});

	it('returns the visible heading when one is intersecting', () => {
		expect(computeActiveId(IDS, new Set(['install']), null)).toBe('install');
	});

	it('returns the earliest heading when multiple are visible simultaneously', () => {
		expect(computeActiveId(IDS, new Set(['usage', 'install']), null)).toBe('install');
	});

	it('falls back to lastActiveId when visibleIds is empty (scroll-up gap)', () => {
		expect(computeActiveId(IDS, new Set(), 'usage')).toBe('usage');
	});

	it('ignores lastActiveId that is not in headingIds (stale from previous page)', () => {
		expect(computeActiveId(IDS, new Set(), 'old-heading')).toBe('intro');
	});

	it('visible heading takes priority over lastActiveId', () => {
		expect(computeActiveId(IDS, new Set(['faq']), 'install')).toBe('faq');
	});

	it('still picks earliest visible even when lastActiveId points elsewhere', () => {
		expect(computeActiveId(IDS, new Set(['faq', 'usage']), 'intro')).toBe('usage');
	});
});
