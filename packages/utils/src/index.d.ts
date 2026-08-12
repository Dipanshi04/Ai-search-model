export declare function formatDuration(seconds: number): string;
export declare function formatPace(secondsPerKm: number): string;
export declare function formatDistance(km: number): string;
export declare function calculateCO2Offset(trees: number): number;
export declare function calculateTrees(distanceKm: number): number;
export declare function generateBibNumber(sequence: number): string;
export declare function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number;
export declare function isValidGpsPoint(lat: number, lng: number): boolean;
export declare function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void;
export declare function throttle<T extends (...args: unknown[]) => unknown>(fn: T, limit: number): (...args: Parameters<T>) => void;
export declare function cn(...classes: (string | boolean | undefined | null)[]): string;
//# sourceMappingURL=index.d.ts.map