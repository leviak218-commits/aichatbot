export function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function eventDateKey(event) {
  return dateKey(new Date(event.timestamp));
}

export function parseDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export function shiftDate(date, numberOfDays) {
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  shifted.setDate(shifted.getDate() + numberOfDays);
  return shifted;
}

export function dateRangeForPreset(preset, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === 'Yesterday') {
    const yesterday = shiftDate(today, -1);
    return { start: yesterday, end: yesterday };
  }
  const days = preset === 'Last 7 Days' ? 7 : preset === 'Last 30 Days' ? 30 : 1;
  return { start: shiftDate(today, 1 - days), end: today };
}

function eventsForRange(events, start, end) {
  const firstDay = dateKey(start);
  const lastDay = dateKey(end);
  return events.filter((event) => (
    event.role === 'user'
    && typeof event.timestamp === 'string'
    && eventDateKey(event) >= firstDay
    && eventDateKey(event) <= lastDay
  ));
}

function dayKeys(start, end) {
  const keys = [];
  for (let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate()); cursor <= end; cursor = shiftDate(cursor, 1)) {
    keys.push(dateKey(cursor));
  }
  return keys;
}

function tallyByFeature(events) {
  const counts = new Map();
  events.forEach((event) => {
    if (event.type !== 'feature_use' || typeof event.feature !== 'string') return;
    counts.set(event.feature, (counts.get(event.feature) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([feature, count]) => ({ feature, count }))
    .sort((a, b) => b.count - a.count || a.feature.localeCompare(b.feature));
}

function getSessions(events, start, end) {
  const allStarts = events.filter((event) => event.type === 'session_start' && event.role === 'user');
  const rangeStarts = eventsForRange(allStarts, start, end);
  const endsBySession = new Map(
    events.filter((event) => event.type === 'session_end').map((event) => [event.sessionId, event]),
  );
  return { allStarts, rangeStarts, endsBySession };
}

export function buildDailyRows(events, users, start, end) {
  const rangeEvents = eventsForRange(events, start, end);
  const { rangeStarts, endsBySession } = getSessions(events, start, end);
  const rows = dayKeys(start, end).map((date) => {
    const dayStarts = rangeStarts.filter((event) => eventDateKey(event) === date);
    const dayEvents = rangeEvents.filter((event) => eventDateKey(event) === date);
    const dayFeatures = tallyByFeature(dayEvents);
    const durations = dayStarts
      .map((event) => endsBySession.get(event.sessionId))
      .filter((event) => event && Number.isFinite(event.durationMs))
      .map((event) => event.durationMs);
    const featureSuccesses = dayEvents.filter((event) => event.type === 'feature_use' && event.outcome === 'success').length;
    const featureFailures = dayEvents.filter((event) => event.type === 'feature_use' && event.outcome === 'failure').length;

    return {
      date,
      usersAccessed: new Set(dayStarts.map((event) => event.userId)).size,
      uniqueUsers: new Set(dayStarts.map((event) => event.userId)).size,
      visits: dayStarts.length,
      newRegistrations: dayEvents.filter((event) => event.type === 'registration').length,
      mostUsedFeature: dayFeatures[0] ? dayFeatures[0].feature : '—',
      features: dayFeatures,
      averageDurationMs: durations.length ? durations.reduce((total, duration) => total + duration, 0) / durations.length : null,
      successfulActivities: featureSuccesses,
      failedActivities: featureFailures,
    };
  });
  return rows.map((row) => ({
    ...row,
    newRegistrations: row.newRegistrations || users.filter((user) => user.role === 'user' && user.registeredAt && dateKey(new Date(user.registeredAt)) === row.date).length,
  }));
}

export function summarizeUsage(events, users, start, end, now = new Date()) {
  const { allStarts, rangeStarts } = getSessions(events, start, end);
  const knownUsers = users.filter((user) => user.role === 'user');
  const todayKey = dateKey(now);
  const todayUsers = new Set(allStarts.filter((event) => eventDateKey(event) === todayKey).map((event) => event.userId));
  const activeUserIds = new Set(allStarts.map((event) => event.userId));
  const rangeEvents = eventsForRange(events, start, end);
  const featureUsage = tallyByFeature(rangeEvents);
  const startsBySession = new Map(
    events.filter((event) => event.type === 'session_start').map((event) => [event.sessionId, event]),
  );
  const durations = events
    .filter((event) => event.type === 'session_end' && event.role === 'user' && Number.isFinite(event.durationMs))
    .filter((event) => {
      const startEvent = startsBySession.get(event.sessionId);
      return startEvent && eventDateKey(startEvent) >= dateKey(start) && eventDateKey(startEvent) <= dateKey(end);
    })
    .map((event) => event.durationMs);

  return {
    registeredUsers: knownUsers.length,
    activeUsers: activeUserIds.size,
    todayActiveUsers: todayUsers.size,
    newRegistrationsToday: events.filter((event) => event.type === 'registration' && event.role === 'user' && eventDateKey(event) === todayKey).length,
    visits: rangeStarts.length,
    sessions: rangeStarts.length,
    averageDurationMs: durations.length ? durations.reduce((total, duration) => total + duration, 0) / durations.length : null,
    mostUsedFeature: featureUsage[0] ? featureUsage[0].feature : '—',
    featureUsage,
  };
}

export function compareUsagePeriods(events, currentStart, currentEnd, previousStart, previousEnd) {
  const current = eventsForRange(events, currentStart, currentEnd);
  const previous = eventsForRange(events, previousStart, previousEnd);
  const getStats = (periodEvents) => {
    const starts = periodEvents.filter((event) => event.type === 'session_start');
    return {
      visits: starts.length,
      uniqueUsers: new Set(starts.map((event) => event.userId)).size,
    };
  };
  const currentStats = getStats(current);
  const previousStats = getStats(previous);
  return {
    current: currentStats,
    previous: previousStats,
    visitsChange: percentageChange(currentStats.visits, previousStats.visits),
    usersChange: percentageChange(currentStats.uniqueUsers, previousStats.uniqueUsers),
  };
}

export function percentageChange(current, previous) {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function getPeakHours(events, start, end) {
  const counts = new Array(24).fill(0);
  eventsForRange(events, start, end)
    .filter((event) => event.type === 'session_start')
    .forEach((event) => {
      const hour = new Date(event.timestamp).getHours();
      if (Number.isInteger(hour) && hour >= 0 && hour < 24) counts[hour] += 1;
    });
  return counts.map((visits, hour) => ({ hour, visits })).sort((a, b) => b.visits - a.visits || a.hour - b.hour).slice(0, 3);
}

export function calendarComparisonRange(type, offset = 0, now = new Date()) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (type === 'week') {
    const mondayOffset = (date.getDay() + 6) % 7;
    const start = shiftDate(date, -mondayOffset + offset * 7);
    const end = shiftDate(start, 6);
    return { start, end: end > date && offset === 0 ? date : end };
  }
  const start = new Date(date.getFullYear(), date.getMonth() + offset, 1);
  const end = new Date(date.getFullYear(), date.getMonth() + offset + 1, 0);
  return { start, end: end > date && offset === 0 ? date : end };
}

export function formatDuration(durationMs) {
  if (!Number.isFinite(durationMs)) return '—';
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function formatPercentage(value) {
  if (value === null) return 'No prior-period baseline';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatHour(hour) {
  const suffix = hour < 12 ? 'AM' : 'PM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:00 ${suffix}`;
}

export function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsv(rows) {
  const columns = [
    ['Date', (row) => row.date],
    ['Users accessed', (row) => row.usersAccessed],
    ['Unique users (DAU)', (row) => row.uniqueUsers],
    ['Total visits', (row) => row.visits],
    ['New registrations', (row) => row.newRegistrations],
    ['Most-used feature', (row) => row.mostUsedFeature],
    ['Average time spent', (row) => formatDuration(row.averageDurationMs)],
    ['Successful activities', (row) => row.successfulActivities],
    ['Failed activities', (row) => row.failedActivities],
  ];
  return [
    columns.map(([heading]) => csvCell(heading)).join(','),
    ...rows.map((row) => columns.map(([, value]) => csvCell(value(row))).join(',')),
  ].join('\r\n');
}
