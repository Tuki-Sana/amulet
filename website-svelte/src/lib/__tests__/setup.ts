import '@testing-library/jest-dom';

type IOCallback = (entries: IntersectionObserverEntry[]) => void;

const observerMap = new Map<Element, { cb: IOCallback; instance: IntersectionObserver }>();

class MockIntersectionObserver implements IntersectionObserver {
	readonly root: Element | Document | null = null;
	readonly rootMargin: string = '';
	readonly thresholds: ReadonlyArray<number> = [];

	constructor(private cb: IOCallback, _options?: IntersectionObserverInit) {}

	observe(el: Element) {
		observerMap.set(el, { cb: this.cb, instance: this });
	}
	unobserve(el: Element) {
		observerMap.delete(el);
	}
	disconnect() {
		observerMap.clear();
	}
	takeRecords(): IntersectionObserverEntry[] {
		return [];
	}
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
	writable: true,
	configurable: true,
	value: MockIntersectionObserver
});

export function triggerIntersection(el: Element, isIntersecting: boolean) {
	const entry = observerMap.get(el);
	if (!entry) throw new Error(`Element not observed: ${el.id || el.tagName}`);
	entry.cb([
		{
			target: el,
			isIntersecting,
			boundingClientRect: el.getBoundingClientRect(),
			intersectionRatio: isIntersecting ? 1 : 0,
			intersectionRect: el.getBoundingClientRect(),
			rootBounds: null,
			time: performance.now()
		} as IntersectionObserverEntry
	]);
}

export function clearObservers() {
	observerMap.clear();
}

beforeEach(() => {
	clearObservers();
});
