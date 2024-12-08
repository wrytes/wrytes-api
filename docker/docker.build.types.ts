export type CreateDockerfileOptions = {
	image: string;
	git: string;
	branch?: string;
	env?: { [key: string]: string };
	build?: string;
	run?: string;
	port?: number;
};
