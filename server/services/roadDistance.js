// Road distances from one customer to many warehouses using the OSRM Table API.
// Falls back to straight-line (Haversine) distance x detour factor if OSRM is
// disabled, slow, or cannot find a road route.

const OSRM_URL = process.env.OSRM_URL || 'https://router.project-osrm.org';
const TIMEOUT_MS = Number(process.env.OSRM_TIMEOUT_MS || 2500);
const DETOUR_FACTOR = 1.2;          // measured: Indian roads average 1.2x the straight-line distance (scripts/roadcheck.js)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 5000;

const cache = new Map();            // key -> { at, result }
const stats = { osrmCalls: 0, cacheHits: 0, fallbacks: 0 };

const deg2rad = (d) => d * (Math.PI / 180);

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimate(lat, lng, w) {
  const straight = haversineKm(lat, lng, w.latitude, w.longitude);
  return { km: straight * DETOUR_FACTOR, straightKm: straight, source: 'estimate' };
}

// Customers within ~1 km share a cache entry (2 decimal places of lat/lng)
function cacheKey(lat, lng, warehouses) {
  return `${lat.toFixed(2)},${lng.toFixed(2)}|${warehouses.map((w) => w._id || w.warehouseName).join(',')}`;
}

async function getRoadDistances(lat, lng, warehouses) {
  if (!warehouses.length) return [];
  if (process.env.ROAD_DISTANCE === 'off') return warehouses.map((w) => estimate(lat, lng, w));

  const key = cacheKey(lat, lng, warehouses);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    stats.cacheHits++;
    return hit.result;
  }

  // OSRM expects "lng,lat" pairs; index 0 is the customer, the rest are warehouses
  const coords = [[lng, lat], ...warehouses.map((w) => [w.longitude, w.latitude])]
    .map(([x, y]) => `${x.toFixed(5)},${y.toFixed(5)}`).join(';');
  const url = `${OSRM_URL}/table/v1/driving/${coords}?sources=0&annotations=distance,duration`;

  let result;
  try {
    stats.osrmCalls++;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const data = await res.json();
    if (data.code !== 'Ok') throw new Error(`OSRM ${data.code}`);

    result = warehouses.map((w, i) => {
      const meters = data.distances?.[0]?.[i + 1];
      const seconds = data.durations?.[0]?.[i + 1];
      if (meters == null) {
        stats.fallbacks++;
        return estimate(lat, lng, w);   // no road route (e.g. island/sea point)
      }
      return {
        km: meters / 1000,
        hours: seconds != null ? seconds / 3600 : null,
        straightKm: haversineKm(lat, lng, w.latitude, w.longitude),
        source: 'osrm'
      };
    });
  } catch (err) {
    stats.fallbacks++;
    console.warn('[roadDistance] OSRM unavailable, using estimate:', err.message);
    return warehouses.map((w) => estimate(lat, lng, w));   // do not cache failures
  }

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), result });
  return result;
}

module.exports = { getRoadDistances, haversineKm, stats, DETOUR_FACTOR };