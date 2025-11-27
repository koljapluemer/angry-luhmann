import { TFile } from "obsidian";

export interface ZkEntry {
	id: string;
	file: TFile;
}

export interface ZkNode {
	id: string;
	part: number;
	file: TFile;
	children: ZkNode[];
}

export interface RenderedZkLine {
	prefix: string;
	name: string;
	file: TFile;
}

const ZK_ID_PATTERN = /^\d+(?:\.\d+)*$/;

export function buildZkTree(entries: ZkEntry[], warn: (message: string) => void): ZkNode[] {
	const uniqueEntries = dedupeAndValidate(entries, warn);
	const sortedEntries = [...uniqueEntries].sort((a, b) => depthOf(a) - depthOf(b));

	const nodeMap: Map<string, ZkNode> = new Map();
	const roots: ZkNode[] = [];

	for (const entry of sortedEntries) {
		const parts = entry.id.split(".");
		const partNumber = Number(parts[parts.length - 1]);

		if (Number.isNaN(partNumber)) {
			warn(`Invalid zk-id "${entry.id}" in ${entry.file.name}`);
			continue;
		}

		const node: ZkNode = {
			id: entry.id,
			part: partNumber,
			file: entry.file,
			children: [],
		};

		if (parts.length === 1) {
			roots.push(node);
		} else {
			const parentId = parts.slice(0, -1).join(".");
			const parent = nodeMap.get(parentId);

			if (!parent) {
				warn(`Missing parent "${parentId}" for zk-id "${entry.id}" in ${entry.file.name}`);
				continue;
			}

			parent.children.push(node);
		}

		nodeMap.set(entry.id, node);
	}

	sortChildren(roots);
	return roots;
}

export function renderZkTree(nodes: ZkNode[]): RenderedZkLine[] {
	const lines: RenderedZkLine[] = [];
	const sortedRoots = sortNodes(nodes);

	for (let i = 0; i < sortedRoots.length; i++) {
		const node = sortedRoots[i];
		const isLast = i === sortedRoots.length - 1;
		renderNode(node, [], isLast, lines);
	}

	return lines;
}

function renderNode(node: ZkNode, ancestors: boolean[], isLast: boolean, lines: RenderedZkLine[]) {
	const prefixParts = ancestors.slice(0, -1).map((ancestorIsLast) => (ancestorIsLast ? "   " : "|  "));
	const connector = ancestors.length ? (isLast ? "∟" : "├") : "";
	const prefix = `${prefixParts.join("")}${connector}`;
	lines.push({ prefix, name: node.file.basename, file: node.file });

	const nextAncestors = [...ancestors, isLast];
	const children = sortNodes(node.children);

	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		const lastChild = i === children.length - 1;
		renderNode(child, nextAncestors, lastChild, lines);
	}
}

function dedupeAndValidate(entries: ZkEntry[], warn: (message: string) => void): ZkEntry[] {
	const valid: ZkEntry[] = [];
	const seen = new Map<string, string>();

	for (const entry of entries) {
		const rawId = entry.id.trim();

		if (!rawId) {
			continue;
		}

		if (!ZK_ID_PATTERN.test(rawId)) {
			warn(`Invalid zk-id "${rawId}" in ${entry.file.name}`);
			continue;
		}

		if (seen.has(rawId)) {
			warn(`Duplicate zk-id "${rawId}" found in ${entry.file.name}`);
			continue;
		}

		seen.set(rawId, entry.file.path);
		valid.push({ ...entry, id: rawId });
	}

	return valid;
}

function depthOf(entry: ZkEntry) {
	return entry.id.split(".").length;
}

function sortChildren(nodes: ZkNode[]) {
	nodes.sort((a, b) => a.part - b.part);
	nodes.forEach((node) => sortChildren(node.children));
}

function sortNodes(nodes: ZkNode[]) {
	return [...nodes].sort((a, b) => a.part - b.part);
}
