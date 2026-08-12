export function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
export function formatPace(secondsPerKm) {
    const min = Math.floor(secondsPerKm / 60);
    const sec = Math.floor(secondsPerKm % 60);
    return `${min}:${sec.toString().padStart(2, '0')} /km`;
}
export function formatDistance(km) {
    return km.toFixed(2);
}
export function calculateCO2Offset(trees) {
    return trees * 22;
}
export function calculateTrees(distanceKm) {
    return Math.floor(distanceKm);
}
export function generateBibNumber(sequence) {
    return `ISA${sequence.toString().padStart(4, '0')}`;
}
export function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
function toRad(deg) {
    return deg * (Math.PI / 180);
}
export function isValidGpsPoint(lat, lng) {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
export function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}
export function throttle(fn, limit) {
    let inThrottle = false;
    return (...args) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}
export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}
//# sourceMappingURL=index.js.map