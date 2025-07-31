export interface PostgresContainerConfig {
	name: string;
	image: string;
	port: string;
	database: string;
	user: string;
	password: string;
}

export interface ContainerHealth {
	status: 'starting' | 'healthy' | 'unhealthy';
	uptime: number;
	lastCheck: Date;
}

export interface DatabaseContainerInfo {
	id: string;
	name: string;
	status: string;
	image: string;
	ports: {
		internal: number;
		external: number;
	}[];
	health: ContainerHealth | null;
	connectionUrl: string;
}
