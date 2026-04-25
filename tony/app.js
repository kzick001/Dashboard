/**
 * TONY KIOSK ENGINE // V0.2
 * Hardware Target: Raspberry Pi 3 (1GB RAM)
 * Interaction Model: 100% Autonomous (Zero Peripherals)
 */

// --- 1. SYSTEM CONFIGURATION ---
const CONFIG = {
    location: {
        zip: "55426",
        lat: 44.9483,
        lon: -93.3666
    },
    api: {
        weatherProxy: `https://kzick-weather.askozicki.workers.dev?lat=44.9483&lon=-93.3666`,
        weatherInterval: 5 * 60 * 1000, // 5 minutes (Safe for 500/day limit)
        sportsIdleInterval: 6 * 60 * 60 * 1000, // 6 hours
        sportsLiveInterval: 5 * 60 * 1000 // 5 minutes
    },
    teams: {
        pro: [
            { id: '15', league: 'football/nfl', name: 'Vikings', abbreviation: 'MIN' },
            { id: '9', league: 'football/nfl', name: 'Packers', abbreviation: 'GB' },
            { id: '10', league: 'baseball/mlb', name: 'Twins', abbreviation: 'MIN' },
            { id: '8', league: 'baseball/mlb', name: 'Brewers', abbreviation: 'MIL' }
        ],
        college: [
            { id: '275', league: 'football/college-football', name: 'Badgers FB', abbreviation: 'WIS' },
            { id: '135', league: 'football/college-football', name: 'Gophers FB', abbreviation: 'MIN' },
            { id: '275', league: 'basketball/mens-college-basketball', name: 'Badgers MBB', abbreviation: 'WIS' },
            { id: '275', league: 'basketball/womens-college-basketball', name: 'Badgers WBB', abbreviation: 'WIS' }
        ]
    }
};

let sportsIntervalTimer = null;

// --- 2. CACHE & NETWORK ENGINE ---
const CacheEngine = {
    async fetch(key, url, ttlMs) {
        const cached = sessionStorage.getItem(`tony_v02_${key}`);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < ttlMs) {
                return parsed.data;
            }
        }
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            sessionStorage.setItem(`tony_v02_${key}`, JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));
            
            this.setSystemStatus(true);
            return data;
        } catch (error) {
            console.error(`[Network Error] ${key}:`, error);
            this.setSystemStatus(false);
            
            // Fallback to stale cache if offline
            if (cached) return JSON.parse(cached).data;
            return null;
        }
    },
    
    setSystemStatus(isOnline) {
        const dot = document.getElementById('sys-status-dot');
        const text = document.getElementById('sys-status-text');
        if (isOnline) {
            dot.className = "text-green-500 animate-pulse";
            text.textContent = "ONLINE";
            text.className = "text-slate-300";
        } else {
            dot.className = "text-red-500";
            text.textContent = "OFFLINE";
            text.className = "text-red-500";
        }
    }
};

// --- 3. CHRONOMETER ---
function startClock() {
    const updateTime = () => {
        const now = new Date();
        document.getElementById('comp-time').textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        document.getElementById('comp-date').textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };
    updateTime();
    setInterval(updateTime, 1000);
}

// --- 4. WEATHER PIPELINE ---
const WeatherPipeline = {
    getIcon(code) {
        const c = parseInt(code);
        // Map Tomorrow.io codes to minimal SVGs
        if ([1000, 1100].includes(c)) return `<svg fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`;
        if ([1101, 1102].includes(c)) return `<svg fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M16 5l.01-.01"></path></svg>`;
        if ([4000, 4200, 4201].includes(c)) return `<svg fill="none" stroke="currentColor" stroke-
