// 1. Time & Date Management (Local)
function updateClock() {
  const now = new Date();
  document.getElementById('time').innerText = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  document.getElementById('date').innerText = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
setInterval(updateClock, 1000);
updateClock();

// 2. Weather & Sun Management (Open-Meteo)
async function fetchWeather() {
  try {
    const lat = 44.8880;
    const lon = -93.1466;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=America%2FChicago`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();

    // Right Now Card
    document.getElementById('current-temp').innerText = Math.round(data.current_weather.temperature) + '°';
    document.getElementById('today-high').innerText = Math.round(data.daily.temperature_2m_max[0]) + '°';
    document.getElementById('today-low').innerText = Math.round(data.daily.temperature_2m_min[0]) + '°';

    // Sun Cycle Card
    const sunriseStr = new Date(data.daily.sunrise[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const sunsetDate = new Date(data.daily.sunset[0]);
    const sunsetStr = sunsetDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    
    // Golden Hour: 1 hour before sunset
    const goldenStart = new Date(sunsetDate.getTime() - (60 * 60 * 1000));
    
    document.getElementById('sunrise').innerText = sunriseStr;
    document.getElementById('sunset').innerText = sunsetStr;
    document.getElementById('golden-hour-range').innerText = `${goldenStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} to ${sunsetStr}`;

    // Horizon Card (5-Day Forecast)
    const forecastContainer = document.getElementById('forecast-container');
    forecastContainer.innerHTML = ''; // Clear loading text
    
    for (let i = 1; i <= 5; i++) {
      const dateObj = new Date(data.daily.time[i]);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const high = Math.round(data.daily.temperature_2m_max[i]);
      const low = Math.round(data.daily.temperature_2m_min[i]);
      const precip = data.daily.precipitation_probability_max[i];

      forecastContainer.innerHTML += `
        <div class="forecast-day">
          <strong>${dayName}</strong>
          H: ${high}° / L: ${low}°<br>
          <span style="color: var(--text-muted)">💧 ${precip}%</span>
        </div>
      `;
    }
  } catch (error) {
    console.error("Failed to fetch weather. Will retry. Error:", error);
  }
}
fetchWeather();
setInterval(fetchWeather, 30 * 60 * 1000); // 30 minutes

// 3. Sports Management (MLB API)
async function fetchSportsSchedule(teamId, elementPrefix) {
  try {
    // Look at a 10-day window to easily find Last and Next games
    const today = new Date();
    const start = new Date(today); start.setDate(start.getDate() - 5);
    const end = new Date(today); end.setDate(end.getDate() + 5);
    
    const formatDate = (d) => d.toISOString().split('T')[0];
    const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${teamId}&startDate=${formatDate(start)}&endDate=${formatDate(end)}&hydrate=team,linescore`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error("MLB API network failure");
    const data = await res.json();
    
    let lastGameStr = "No recent games";
    let nextGameStr = "No upcoming games";

    // Filter games
    if (data.dates) {
      const allGames = data.dates.map(d => d.games).flat();
      const completedGames = allGames.filter(g => g.status.statusCode === 'F');
      const futureGames = allGames.filter(g => g.status.statusCode === 'S' || g.status.statusCode === 'P');
      
      if (completedGames.length > 0) {
        const last = completedGames[completedGames.length - 1]; // most recent
        const isHome = last.teams.home.team.id === teamId;
        const myScore = isHome ? last.teams.home.score : last.teams.away.score;
        const oppScore = isHome ? last.teams.away.score : last.teams.home.score;
        const oppName = isHome ? last.teams.away.team.teamName : last.teams.home.team.teamName;
        lastGameStr = `${myScore}-${oppScore} vs ${oppName}`;
      }

      if (futureGames.length > 0) {
        const next = futureGames[0]; // immediate next
        const isHome = next.teams.home.team.id === teamId;
        const oppName = isHome ? next.teams.away.team.teamName : next.teams.home.team.teamName;
        const nextDate = new Date(next.gameDate);
        nextGameStr = `${nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} vs ${oppName} @ ${nextDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
      }
    }

    document.getElementById(`${elementPrefix}-last`).innerText = lastGameStr;
    document.getElementById(`${elementPrefix}-next`).innerText = nextGameStr;

  } catch (error) {
    console.error(`Failed to fetch sports for ${teamId}`, error);
  }
}

function updateAllSports() {
  fetchSportsSchedule(142, 'twins');
  fetchSportsSchedule(158, 'brewers');
}

updateAllSports();
setInterval(updateAllSports, 6 * 60 * 60 * 1000); // 6 hours (Future iterations can poll faster during live windows)
