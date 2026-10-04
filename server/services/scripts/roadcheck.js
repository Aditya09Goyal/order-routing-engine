// Compares straight-line (Haversine) vs real road distance from OSRM
// for customers around Indian cities, and measures OSRM + cache latency.
// Run: node scripts/roadcheck.js   (makes ~60 polite requests to the public OSRM server)
const { getRoadDistances, stats } = require('../services/roadDistance');

const warehouses = [
  { warehouseName: 'Mumbai', latitude: 19.0760, longitude: 72.8777 },
  { warehouseName: 'Delhi', latitude: 28.7041, longitude: 77.1025 },
  { warehouseName: 'Bangalore', latitude: 12.9716, longitude: 77.5946 },
  { warehouseName: 'Chennai', latitude: 13.0827, longitude: 80.2707 },
  { warehouseName: 'Hyderabad', latitude: 17.3850, longitude: 78.4867 },
];
const cities = [[19.07, 72.88], [28.61, 77.21], [12.97, 77.59], [13.08, 80.27], [17.38, 78.49], [22.57, 88.36], [18.52, 73.86], [23.02, 72.57], [26.91, 75.79], [26.85, 80.95], [21.15, 79.09], [30.73, 76.78], [9.93, 76.27], [25.59, 85.14], [22.72, 75.86]];

let seed = 42;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (a, p) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * p)];

(async () => {
  const ratios = [], times = [], cached = [];
  let changed = 0, n = 0;
  for (let i = 0; i < 60; i++) {
    const c = cities[i % cities.length];
    const lat = c[0] + (rnd() - 0.5) * 0.8, lng = c[1] + (rnd() - 0.5) * 0.8;

    const t = performance.now();
    const d = await getRoadDistances(lat, lng, warehouses);
    times.push(performance.now() - t);
    if (d.some((x) => x.source !== 'osrm')) { await wait(300); continue; }

    const t2 = performance.now();
    await getRoadDistances(lat, lng, warehouses);
    cached.push(performance.now() - t2);

    d.forEach((x) => { if (x.straightKm > 20) ratios.push(x.km / x.straightKm); });
    const byStraight = d.map((x, j) => [x.straightKm, j]).sort((a, b) => a[0] - b[0])[0][1];
    const byRoad = d.map((x, j) => [x.km, j]).sort((a, b) => a[0] - b[0])[0][1];
    if (byStraight !== byRoad) changed++;
    n++;
    await wait(300);
  }
  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  console.log(`customers tested: ${n} (x ${warehouses.length} warehouses = ${ratios.length} routes)`);
  console.log(`road / straight-line distance: avg ${avg.toFixed(2)}x, median ${pct(ratios, 0.5).toFixed(2)}x, max ${Math.max(...ratios).toFixed(2)}x`);
  console.log(`straight line underestimates road distance by ${((avg - 1) * 100).toFixed(0)}% on average`);
  console.log(`nearest warehouse changed for ${changed} of ${n} customers (${(changed / n * 100).toFixed(0)}%) when using road distance`);
  console.log(`OSRM call latency: p50 ${pct(times, 0.5).toFixed(0)} ms, p95 ${pct(times, 0.95).toFixed(0)} ms`);
  console.log(`cached lookup latency: p50 ${pct(cached, 0.5).toFixed(3)} ms`);
  console.log('stats', stats);
})();