export interface DatabaseHealth {
	status: 'healthy' | 'degraded' | 'unhealthy';
	connection: {
		primary: boolean;
		fallback: boolean | null;
		docker: boolean | null;
	};
	performance: {
		responseTime: number;
		activeConnections: number;
		poolUtilization: number;
	};
	lastChecked: Date;
}

export interface ConnectionStatus {
	connected: boolean;
	source: 'primary' | 'fallback' | 'docker';
	connectionString: string;
	error?: string;
}

export interface PerformanceMetrics {
	queryCount: number;
	averageResponseTime: number;
	slowestQuery: number;
	connectionPoolSize: number;
	activeConnections: number;
	idleConnections: number;
	lastUpdated: Date;
}

export interface MigrationStatus {
	applied: string[];
	pending: string[];
	failed: string[];
	lastMigration: string | null;
	schemaVersion: string;
}

export type DatabaseConnectionSource = 'primary' | 'fallback' | 'docker';
