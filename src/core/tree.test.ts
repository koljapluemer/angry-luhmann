import { describe, it, expect } from "vitest";
import { renderedLinesEqual } from "./tree";
import { RenderedZkLine } from "./types";

function makeLine(id: string, name: string): RenderedZkLine {
	return { id, name, prefix: "", file: {} as any, depth: 0, hasChildren: false };
}

describe("renderedLinesEqual", () => {
	it("returns true for two empty arrays", () => {
		expect(renderedLinesEqual([], [])).toBe(true);
	});

	it("returns true for identical single-element arrays", () => {
		const a = [makeLine("1", "Note A")];
		const b = [makeLine("1", "Note A")];
		expect(renderedLinesEqual(a, b)).toBe(true);
	});

	it("returns false when lengths differ", () => {
		const a = [makeLine("1", "Note A")];
		const b = [makeLine("1", "Note A"), makeLine("2", "Note B")];
		expect(renderedLinesEqual(a, b)).toBe(false);
	});

	it("returns false when ids differ", () => {
		const a = [makeLine("1", "Note A")];
		const b = [makeLine("2", "Note A")];
		expect(renderedLinesEqual(a, b)).toBe(false);
	});

	it("returns false when names differ", () => {
		const a = [makeLine("1", "Note A")];
		const b = [makeLine("1", "Note B")];
		expect(renderedLinesEqual(a, b)).toBe(false);
	});

	it("ignores differences in prefix, depth, hasChildren, and file", () => {
		const a: RenderedZkLine[] = [
			{ id: "1", name: "Note", prefix: "├──", file: {} as any, depth: 1, hasChildren: true },
		];
		const b: RenderedZkLine[] = [
			{ id: "1", name: "Note", prefix: "└──", file: {} as any, depth: 2, hasChildren: false },
		];
		expect(renderedLinesEqual(a, b)).toBe(true);
	});

	it("returns true for matching multi-element arrays", () => {
		const a = [makeLine("1", "A"), makeLine("1.1", "B"), makeLine("2", "C")];
		const b = [makeLine("1", "A"), makeLine("1.1", "B"), makeLine("2", "C")];
		expect(renderedLinesEqual(a, b)).toBe(true);
	});

	it("returns false when element order differs", () => {
		const a = [makeLine("1", "A"), makeLine("2", "B")];
		const b = [makeLine("2", "B"), makeLine("1", "A")];
		expect(renderedLinesEqual(a, b)).toBe(false);
	});
});
