/**
 * Determines the active TOC heading ID from current scroll state.
 * Pure function — no DOM, no browser APIs.
 *
 * @param headingIds - Ordered list of heading IDs as they appear in the document
 * @param visibleIds - Set of IDs currently in the IntersectionObserver zone
 * @param lastActiveId - Last heading that entered the zone (scroll-up fallback)
 * @returns The ID that should be highlighted in the TOC, or null
 */
export function computeActiveId(
	headingIds: string[],
	visibleIds: Set<string>,
	lastActiveId: string | null
): string | null {
	if (headingIds.length === 0) return null;
	// Prefer the earliest visible heading (handles multiple visible simultaneously)
	const found = headingIds.find(id => visibleIds.has(id));
	if (found) return found;
	// Fallback to last entered heading (handles gap while scrolling up)
	if (lastActiveId && headingIds.includes(lastActiveId)) return lastActiveId;
	// Default to first heading when nothing has been scrolled yet
	return headingIds[0];
}
