import { describe, it, expect } from 'vitest';
import { renderZkTree, ZkNode } from '../zkTree';
import { TFile } from './mocks/obsidian';

describe('zkTree rendering', () => {
	it('should return empty array for empty input', () => {
		const result = renderZkTree([]);
		expect(result).toEqual([]);
	});

	it('should render single root node without connector', () => {
		const file = new TFile('note1.md');
		const node: ZkNode = { id: '1', part: 1, file: file as any, children: [] };
		const result = renderZkTree([node]);

		expect(result).toHaveLength(1);
		expect(result[0].prefix).toBe('');
		expect(result[0].name).toBe('note1');
	});

	it('should render 3 roots with first having 1 child with 3 grandchildren', () => {
		// Setup: 3 root notes (1, 2, 3)
		// Note 1 has child 1.1
		// Note 1.1 has children 1.1.1, 1.1.2, 1.1.3

		const file1 = new TFile('note1.md');
		const file2 = new TFile('note2.md');
		const file3 = new TFile('note3.md');
		const file11 = new TFile('note1-1.md');
		const file111 = new TFile('note1-1-1.md');
		const file112 = new TFile('note1-1-2.md');
		const file113 = new TFile('note1-1-3.md');

		const grandchild1: ZkNode = { id: '1.1.1', part: 1, file: file111 as any, children: [] };
		const grandchild2: ZkNode = { id: '1.1.2', part: 2, file: file112 as any, children: [] };
		const grandchild3: ZkNode = { id: '1.1.3', part: 3, file: file113 as any, children: [] };
		const child: ZkNode = { id: '1.1', part: 1, file: file11 as any, children: [grandchild1, grandchild2, grandchild3] };
		const root1: ZkNode = { id: '1', part: 1, file: file1 as any, children: [child] };
		const root2: ZkNode = { id: '2', part: 2, file: file2 as any, children: [] };
		const root3: ZkNode = { id: '3', part: 3, file: file3 as any, children: [] };

		const result = renderZkTree([root1, root2, root3]);

		// Expected output:
		// note1                    (prefix: "")
		// └──note1-1               (prefix: "└──")
		//     ├──note1-1-1        (prefix: "    ├──")
		//     ├──note1-1-2        (prefix: "    ├──")
		//     └──note1-1-3        (prefix: "    └──")
		// note2                    (prefix: "")
		// note3                    (prefix: "")

		expect(result).toHaveLength(7);

		// Root 1
		expect(result[0].prefix).toBe('');
		expect(result[0].name).toBe('note1');

		// Child 1.1
		expect(result[1].prefix).toBe('└──');
		expect(result[1].name).toBe('note1-1');

		// Grandchildren 1.1.1, 1.1.2, 1.1.3
		expect(result[2].prefix).toBe('    ├──');
		expect(result[2].name).toBe('note1-1-1');

		expect(result[3].prefix).toBe('    ├──');
		expect(result[3].name).toBe('note1-1-2');

		expect(result[4].prefix).toBe('    └──');
		expect(result[4].name).toBe('note1-1-3');

		// Root 2
		expect(result[5].prefix).toBe('');
		expect(result[5].name).toBe('note2');

		// Root 3
		expect(result[6].prefix).toBe('');
		expect(result[6].name).toBe('note3');
	});
});
