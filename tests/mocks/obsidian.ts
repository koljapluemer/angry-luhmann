export class TFile {
	path: string;
	basename: string;
	extension: string;
	name: string;

	constructor(path: string) {
		this.path = path;
		this.name = path.split('/').pop() || '';
		this.extension = 'md';
		this.basename = this.name.replace('.md', '');
	}
}
