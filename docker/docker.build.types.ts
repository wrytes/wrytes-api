export type CreateDockerfileOptions = {
	image: string;
	git: string;
	branch?: string;
	env?: object;
	build?: string;
	run?: string;
	port?: number;
};

export type CreateImageOptions = CreateDockerfileOptions & {
	tag: string;
};
