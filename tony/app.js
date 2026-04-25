/**
 * TONY KIOSK ENGINE // V0.3.0
 * Target: Raspberry Pi 3 Model B (1GB RAM)
 * Engine: LocalStorage + Asynchronous Polling
 */

const CONFIG = {
    location: {
        lat: 44.9483,
        lon: -93.3666
    },
    api: {
        weatherProxy: `https://kzick-weather.askozicki.workers.dev?lat=44.9483&lon=-93.3666`,
        weatherInterval: 5 * 60 * 1000, 
        sportsLiveInterval: 5 * 60 * 1000,
        sportsIdleInterval: 6 * 60 * 60 * 1000,
        telemetryInterval: 60 * 1000
    },
    teams: {
        pro: [
            { id: '15', league: 'football/nfl', name: 'Vikings' },
            { id: '9', league: 'football/nfl', name: 'Packers' },
            { id: '10', league: 'baseball/mlb', name: 'Twins' },
            { id: '8', league: 'baseball/mlb', name: 'Brewers' }
        ],
        college: [
            { id: '275', league: 'football/college-football', name: 'Badgers FB' },
            { id: '135', league: 'football/college-football', name: 'Gophers FB' },
            { id: '275', league: 'basketball/mens-college-basketball', name: 'Badgers MBB' },
            { id: '275', league: 'basketball/womens-college-basketball', name: 'Badgers WBB' }
        ]
    }
};

let sportsIntervalTimer = null;

// --- 1. SYSTEM STATUS & TELEMETRY ---
const SystemState = {
    setOnline(isOnline) {
        const dot = document.getElementById('sys-status-dot');
        const text = document.getElementById('sys-status-text');
        if (isOnline) {
            dot.className = "text-green-500 animate-[blink_2s_step-start_infinite]";
            text.textContent = "ONLINE";
            text.className = "text-slate-300";
        } else {
            dot.className = "text-red-500";
            text.textContent = "OFFLINE";
            text.className = "text-red-500";
        }
    },
    
    async pollTelemetry() {
        try {
            // Append timestamp to bust browser cache on local static file
            const res = await fetch(`system.json?_t=${Date.now()}`);
            if (!res.ok) throw new Error("I/O Error");
            const data = await res.json();
            document.getElementById('sys-telemetry').textContent = `CPU: ${data.cpu_temp}°C | LOAD: ${data.load_1m}`;
        } catch (e) {
            document.getElementById('sys-telemetry').textContent = `SYS_POLLING_FAILED`;
        }
    }
};

// --- 2. PERSISTENCE LAYER ---
const StorageEngine = {
    get(key) {
        const cached = localStorage.getItem(`tony_v03_${key}`);
        return cached ? JSON.parse(cached) : null;
    },
    
    set(key, data) {
        try {
            localStorage.setItem(`tony_v03_${key}`, JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));
        } catch (e) {
            console.error("[Storage] Write limit exceeded.");
            localStorage.clear();
        }
    },
    
    async fetch(key, url, ttlMs) {
        const cached = this.get(key);
        if (cached && (Date.now() - cached.timestamp < ttlMs)) {
            return cached.data;
        }
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            this.set(key, data);
            SystemState.setOnline(true);
            return data;
        } catch (error) {
            console.warn(`[Network] ${key} degraded. Falling back to persistent cache.`);
            SystemState.setOnline(false);
            return cached ? cached.data : null;
        }
    }
};

// --- 3. CHRONOMETER ---
function startClock() {
    const updateTime = () => {
        const now = new Date();
        document.getElementById('comp-hour').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', hour12: true }).split(' ')[0].split(':')[0];
        document.getElementById('comp-minute').textContent = now.toLocaleTimeString('en-US', { minute: '2-digit' });
        document.getElementById('comp-date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    };
    updateTime();
    setInterval(updateTime, 1000);
}

// --- 4. WEATHER PIPELINE ---
const WeatherPipeline = {
    getIcon(code) {
        const c = parseInt(code);
        if ([1000, 1100].includes(c)) return `<svg fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`;
        if ([1101, 1102].includes(c)) return `<svg fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M16 5l.01-.01"></path></svg>`;
        if ([4000, 4200, 4201].includes(c)) return `<svg fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 14.99A4 4 0 0015 11H9.5a5.5 5.5 0 00-5.5 5.5v.5h15v-2zM12 21v-4m-4 4v-4m8 4v-4"></path></svg>`;
        if ([5000, 5001, 5100, 5101].includes(c)) return `<svg fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v18m0-18l-4 4m4-4l4 4m-4 14l-4-4m4 4l4-4M5.636 6.636l12.728 12.728m-12.728 0L18.364 6.636"></path></svg>`;
        return `<svg fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>`;
    },

    processAQI(value) {
        const val = value || 1;
        let desc = 'GOOD'; let color = 'text-green-500'; let stroke = 'stroke-green-500';
        
        if (val > 50) { desc = 'MODERATE'; color = 'text-yellow-500'; stroke = 'stroke-yellow-500'; }
        if (val > 100) { desc = 'SENSITIVE'; color = 'text-orange-500'; stroke = 'stroke-orange-500'; }
        if (val > 150) { desc = 'UNHEALTHY'; color = 'text-red-500'; stroke = 'stroke-red-500'; }

        document.getElementById('aqi-value').textContent = val;
        document.getElementById('aqi-value').className = `font-mono text-3xl text-white font-bold tracking-tighter ${color}`;

        const cap = Math.min(val, 200);
        const offset = 264 - ((cap / 200) * 264);
        const ring = document.getElementById('aqi-ring');
        ring.style.strokeDashoffset = offset;
        ring.setAttribute('class', `transition-all duration-1000 ${stroke}`);
    },

    calculateGoldenHour(sunsetTime) {
        if (!sunsetTime) return "--:--";
        const sunset = new Date(sunsetTime);
        // Golden Hour approximation: T-Minus 60 minutes from Sunset
        const golden = new Date(sunset.getTime() - (60 * 60 * 1000));
        return golden.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    },

    async sync() {
        const data = await StorageEngine.fetch('weather', CONFIG.api.weatherProxy, CONFIG.api.weatherInterval);
        if (!data) return;

        try {
            const timelines = data.data?.timelines || data.timelines;
            const current = timelines.minutely?.[0]?.values || timelines.hourly?.[0]?.values || timelines.daily?.[0]?.values;
            const daily = timelines.daily || [];
            const today = daily[0]?.values || current;

            // Anchor Payload
            const curTemp = Math.round(current.temperature || 0);
            document.getElementById('current-temp').textContent = `${curTemp}°`;
            document.getElementById('current-icon').innerHTML = this.getIcon(current.weatherCode);
            document.getElementById('current-icon').firstElementChild.classList.remove('animate-[blink_2s_step-start_infinite]', 'opacity-30');
            document.getElementById('high-temp').textContent = `${Math.round(today.temperatureMax || curTemp)}°`;
            document.getElementById('low-temp').textContent = `${Math.round(today.temperatureMin || curTemp)}°`;

            // Atmospherics Payload
            document.getElementById('dew-point').textContent = `${Math.round(current.dewPoint || 0)}°`;
            document.getElementById('wind-speed').textContent = `${Math.round(current.windSpeed || 0)} mph`;
            document.getElementById('wind-dir-icon').style.transform = `rotate(${current.windDirection || 0}deg)`;
            this.processAQI(Math.round(current.epaPrimaryAQI || current.epaIndex || 25));

            // Solar Payload
            if (today.sunriseTime) {
                document.getElementById('sunrise-time').textContent = new Date(today.sunriseTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                document.getElementById('sunset-time').textContent = new Date(today.sunsetTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                document.getElementById('golden-hour-time').textContent = this.calculateGoldenHour(today.sunsetTime);
            }

            // Horizon Payload
            let forecastHTML = '';
            daily.slice(1, 6).forEach(day => {
                const date = new Date(day.startTime || day.time);
                const v = day.values;
                forecastHTML += `
                    <div class="flex flex-col items-center justify-between h-full py-2">
                        <span class="text-xs font-mono text-slate-500 tracking-widest">${date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</span>
                        <div class="w-12 h-12 text-slate-300 my-2">${this.getIcon(v.weatherCodeMax || v.weatherCode)}</div>
                        <div class="flex items-center gap-3 font-mono text-lg">
                            <span class="text-red-400">${Math.round(v.temperatureMax || 0)}°</span>
                            <span class="text-blue-400">${Math.round(v.temperatureMin || 0)}°</span>
                        </div>
                        <div class="flex flex-col items-center mt-2 gap-1 text-[10px] font-mono tracking-widest text-slate-600">
                            <span class="text-cyan-600/80">💧 ${Math.round(v.precipitationProbabilityMax || 0)}%</span>
                            <span class="text-slate-500">🌬️ ${Math.round(v.windSpeedMax || 0)}</span>
                            <span class="text-purple-500/70">☀️ UV ${Math.round(v.uvIndexMax || 0)}</span>
                        </div>
                    </div>
                `;
            });
            document.getElementById('forecast-container').innerHTML = forecastHTML;

        } catch (e) {
            console.error("[Pipeline] Meteorological parse fault:", e);
        }
    }
};

// --- 5. SPORTS PIPELINE ---
const SportsPipeline = {
    async fetchTeamData(teamConfig) {
        const url = `https://site.api.espn.com/apis/site/v2/sports/${teamConfig.league}/teams/${teamConfig.id}/schedule`;
        const ttl = (sportsIntervalTimer && sportsIntervalTimer._repeat === CONFIG.api.sportsLiveInterval) ? CONFIG.api.sportsLiveInterval : CONFIG.api.sportsIdleInterval;
        return await StorageEngine.fetch(`sports_${teamConfig.league}_${teamConfig.id}`, url, ttl);
    },

    getFallbackLogo() {
        return `<svg class="w-full h-full p-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>`;
    },

    parseGameEvent(event, teamId) {
        if (!event) return null;
        const comp = event.competitions[0];
        const home = comp.competitors.find(c => c.homeAway === 'home');
        const away = comp.competitors.find(c => c.homeAway === 'away');
        const myTeam = home.team.id === teamId ? home : away;
        const opponent = home.team.id === teamId ? away : home;
        
        let record = myTeam.records?.[0]?.summary || '';
        if (!record && myTeam.team.standings) {
            record = myTeam.team.standings.summary || '';
        }

        const broadcast = comp.broadcasts?.[0]?.names?.[0] || null;
        const myLogo = myTeam.team.logos?.[0]?.href || null;
        const oppLogo = opponent.team.logos?.[0]?.href || null;
        
        return {
            date: new Date(comp.date),
            state: comp.status.type.state,
            detail: comp.status.type.shortDetail,
            broadcast: broadcast,
            myTeam: {
                name: myTeam.team.abbreviation || myTeam.team.shortDisplayName,
                score: myTeam.score?.value || '-',
                record: record,
                logo: myLogo,
                isWinner: myTeam.winner
            },
            opponent: {
                name: opponent.team.abbreviation || opponent.team.shortDisplayName,
                score: opponent.score?.value || '-',
                record: opponent.records?.[0]?.summary || '',
                logo: oppLogo,
                isWinner: opponent.winner
            }
        };
    },

    renderTeamRow(teamConfig, data) {
        if (!data || !data.events || data.events.length === 0) {
            return this.buildHtmlRow(teamConfig, null, 'OFFSEASON');
        }

        const events = data.events;
        let targetEvent = events.find(e => e.competitions[0].status.type.state === 'in');
        let isLive = !!targetEvent;

        if (!targetEvent) {
            const now = new Date();
            const futureGames = events.filter(e => new Date(e.competitions[0].date) > now);
            targetEvent = futureGames.length > 0 ? futureGames[0] : events[events.length - 1];
        }

        const game = this.parseGameEvent(targetEvent, teamConfig.id);
        if (!game) return this.buildHtmlRow(teamConfig, null, 'OFFSEASON');

        const daysDiff = (game.date - new Date()) / (1000 * 60 * 60 * 24);
        if (game.state === 'post' && daysDiff < -14) {
            return this.buildHtmlRow(teamConfig, game, 'OFFSEASON');
        }

        return this.buildHtmlRow(teamConfig, game, isLive ? 'LIVE' : game.state);
    },

    buildHtmlRow(teamConfig, game, viewState) {
        const logoHtml = game?.myTeam?.logo 
            ? `<img src="${game.myTeam.logo}" class="w-10 h-10 object-contain drop-shadow-md">`
            : `<div class="w-10 h-10 text-slate-600 bg-slate-800 rounded-full">${this.getFallbackLogo()}</div>`;

        // Memory Optimization: Shallow DOM for Offseason
        if (viewState === 'OFFSEASON') {
            return `
                <div class="bg-slate-900/40 border border-slate-800/50 rounded-xl px-4 py-2 flex justify-between items-center h-10 w-full opacity-60">
                    <div class="flex items-center gap-3">
                        ${logoHtml.replace('w-10 h-10', 'w-6 h-6 grayscale')}
                        <div class="font-bold text-xs text-slate-500">${teamConfig.name}</div>
                    </div>
                    <div class="font-mono text-[10px] text-slate-600 tracking-widest">HIBERNATION</div>
                </div>
            `;
        }

        const isLive = viewState === 'LIVE';
        const bgClass = isLive ? 'bg-slate-800/90 border-slate-600' : 'bg-slate-900/50 border-slate-700/50';
        
        let statusHtml = '';
        let matchUpHtml = `vs ${game.opponent.name} <span class="text-slate-600 ml-1 font-mono">(${game.opponent.record})</span>`;
        
        const broadcastPill = game.broadcast ? `<span class="border border-slate-600 text-slate-400 px-1.5 py-0.5 rounded text-[8px] mr-2">${game.broadcast}</span>` : '';

        if (isLive) {
            statusHtml = `
                <div class="flex flex-col items-end">
                    <span class="text-white font-mono text-lg">${game.myTeam.score} - ${game.opponent.score}</span>
                    <span class="bg-red-900/40 text-red-500 border border-red-500/50 px-2 py-0.5 rounded text-[10px] animate-[blink_2s_step-start_infinite] mt-1">${game.detail}</span>
                </div>`;
        } else if (viewState === 'post') {
            const winColor = game.myTeam.isWinner ? 'text-white' : 'text-slate-500';
            statusHtml = `
                <div class="flex flex-col items-end">
                    <span class="${winColor} font-mono text-lg">${game.myTeam.score} - ${game.opponent.score}</span>
                    <span class="text-slate-500 text-[10px] font-mono mt-1">${game.date.toLocaleDateString('en-US', { month:'short', day:'numeric' })}</span>
                </div>`;
        } else {
            statusHtml = `
                <div class="flex flex-col items-end">
                    <div class="flex items-center text-slate-300 font-mono text-sm">${broadcastPill}${game.date.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })}</div>
                    <span class="text-slate-500 text-[10px] font-mono mt-1">${game.date.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}</span>
                </div>`;
        }

        return `
            <div class="${bgClass} border rounded-2xl p-4 flex justify-between items-center h-20 w-full transition-colors">
                <div class="flex items-center gap-4">
                    ${logoHtml}
                    <div class="flex flex-col justify-center">
                        <div class="font-bold text-sm text-slate-200">${teamConfig.name} <span class="text-[10px] font-mono text-slate-500 ml-2">${game.myTeam.record}</span></div>
                        <div class="text-xs text-slate-400 mt-1">${matchUpHtml}</div>
                    </div>
                </div>
                ${statusHtml}
            </div>
        `;
    },

    async sync() {
        let anyGameLive = false;

        const renderSection = async (teams, containerId) => {
            const data = await Promise.all(teams.map(t => this.fetchTeamData(t)));
            let html = '';
            teams.forEach((team, idx) => {
                const rowHtml = this.renderTeamRow(team, data[idx]);
                if (rowHtml.includes('LIVE')) anyGameLive = true;
                html += rowHtml;
            });
            document.getElementById(containerId).innerHTML = html;
        };

        await renderSection(CONFIG.teams.pro, 'pro-sports-container');
        await renderSection(CONFIG.teams.college, 'college-sports-container');

        const targetInterval = anyGameLive ? CONFIG.api.sportsLiveInterval : CONFIG.api.sportsIdleInterval;
        if (!sportsIntervalTimer || sportsIntervalTimer._repeat !== targetInterval) {
            if (sportsIntervalTimer) clearInterval(sportsIntervalTimer);
            sportsIntervalTimer = setInterval(() => this.sync(), targetInterval);
            sportsIntervalTimer._repeat = targetInterval;
            console.log(`[Engine] Polling shifted: ${targetInterval}ms`);
        }
    }
};

// --- 6. INITIALIZATION SEQUENCE ---
function boot() {
    // 1. Storage Read (Synchronous paint)
    const cachedWeather = StorageEngine.get('weather');
    if (cachedWeather) WeatherPipeline.sync(); // Paints immediately with stale data

    // 2. Chronometer
    startClock();
    
    // 3. Network Fetch
    SystemState.pollTelemetry();
    WeatherPipeline.sync();
    SportsPipeline.sync();

    // 4. Daemons
    setInterval(() => WeatherPipeline.sync(), CONFIG.api.weatherInterval);
    setInterval(() => SystemState.pollTelemetry(), CONFIG.api.telemetryInterval);
}

document.addEventListener('DOMContentLoaded', boot);
