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
	depth: number;
	hasChildren: boolean;
}

export const ZK_ID_PATTERN = /^\d+(?:\.\d+)*$/;
