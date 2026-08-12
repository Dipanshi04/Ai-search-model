export declare const CATEGORY_DISTANCES: Record<string, number>;
export declare const CATEGORY_LABELS: Record<string, string>;
export declare const GPS_CONFIG: {
    UPDATE_INTERVAL_MS: number;
    MAX_ACCURACY_METERS: number;
    OUTLIER_DISTANCE_METERS: number;
    FINISH_THRESHOLD_METERS: number;
    MIN_UPDATE_INTERVAL_MS: number;
    BATCH_STORE_INTERVAL_MS: number;
};
export declare const LEADERBOARD_CONFIG: {
    TOP_N: number;
    BROADCAST_INTERVAL_MS: number;
    COMPANY_AGGREGATION_INTERVAL_MS: number;
};
export declare const GREEN_CONFIG: {
    KM_PER_TREE: number;
    CO2_PER_TREE_KG_PER_YEAR: number;
};
export declare const PAGINATION: {
    DEFAULT_PAGE_SIZE: number;
    MAX_PAGE_SIZE: number;
};
export declare const JWT_CONFIG: {
    ACCESS_TOKEN_EXPIRY: string;
    REFRESH_TOKEN_EXPIRY: string;
};
export declare const API_CONFIG: {
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX_REQUESTS: number;
    MAX_UPLOAD_SIZE_MB: number;
};
export declare const SOCKET_CONFIG: {
    PING_INTERVAL: number;
    PING_TIMEOUT: number;
    MAX_HTTP_BUFFER_SIZE: number;
    RECONNECT_ATTEMPTS: number;
    RECONNECT_DELAY_MS: number;
};
export declare const SPONSOR_TIERS: readonly ["PLATINUM", "GOLD", "SILVER", "BRONZE"];
export declare const LED_CONFIG: {
    SPONSOR_ROTATION_INTERVAL_MS: number;
    LEADERBOARD_CYCLE_INTERVAL_MS: number;
    RECONNECT_ATTEMPTS: number;
    RECONNECT_DELAY_MS: number;
};
//# sourceMappingURL=index.d.ts.map