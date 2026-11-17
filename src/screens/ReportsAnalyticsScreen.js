import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAnalyticsData } from '../data/analytics';
import { LocalizedText as Text } from '../i18n/LocalizedText';
import { LocalizedTextInput as TextInput } from '../i18n/LocalizedTextInput';
import { exportCsvFile } from '../data/csvExport';
import {
  buildCsv,
  buildDailyRows,
  calendarComparisonRange,
  dateKey,
  dateRangeForPreset,
  formatDuration,
  formatHour,
  formatPercentage,
  getPeakHours,
  parseDateKey,
  percentageChange,
  shiftDate,
  summarizeUsage,
  compareUsagePeriods,
} from '../data/reporting';

const PRESETS = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Custom'];
const PAGE_SIZE = 8;
const COLORS = ['#23613A', '#E47B35', '#467BB5', '#8B66AF', '#D6A42B', '#4A9A8F'];

function htmlEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function ChartCard({ title, subtitle, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

function MetricCard({ label, value, detail, color }) {
  return (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.metricDetail} numberOfLines={2}>{detail}</Text>
    </View>
  );
}

function LineChart({ rows }) {
  const width = 320;
  const height = 150;
  const padding = 24;
  const values = rows.map((row) => row.uniqueUsers);
  const max = Math.max(1, ...values);
  const points = values.map((value, index) => {
    const x = rows.length < 2 ? width / 2 : padding + (index * (width - padding * 2)) / (rows.length - 1);
    const y = height - padding - ((height - padding * 2) * value) / max;
    return `${x},${y}`;
  });

  if (!rows.length) return <Text style={styles.emptyChart}>No daily activity in this date range.</Text>;
  return (
    <View style={styles.chartWrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E2E9DF" />
        <Line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#F0F3EE" />
        {points.length > 1 && <Polyline points={points.join(' ')} fill="none" stroke="#23613A" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
        {points.map((point, index) => {
          const [cx, cy] = point.split(',');
          return <Circle key={rows[index].date} cx={cx} cy={cy} r="4" fill="#FFFFFF" stroke="#23613A" strokeWidth="2" />;
        })}
        {rows.length < 10 && rows.map((row, index) => {
          const x = rows.length < 2 ? width / 2 : padding + (index * (width - padding * 2)) / (rows.length - 1);
          return <SvgText key={row.date} x={x} y={height - 5} fill="#718075" fontSize="9" textAnchor="middle">{row.date.slice(5)}</SvgText>;
        })}
      </Svg>
      <Text style={styles.chartHint}>Unique signed-in users per day</Text>
    </View>
  );
}

function BarChart({ rows }) {
  const visibleRows = rows.slice(-14).reverse();
  const max = Math.max(1, ...visibleRows.map((row) => row.visits));
  if (!visibleRows.length) return <Text style={styles.emptyChart}>No visits in this date range.</Text>;

  return (
    <View style={styles.barChart}>
      {visibleRows.map((row) => (
        <View key={row.date} style={styles.barRow}>
          <Text style={styles.barDate}>{row.date.slice(5)}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${row.visits ? Math.max(5, (row.visits / max) * 100) : 0}%` }]} />
          </View>
          <Text style={styles.barValue}>{row.visits}</Text>
        </View>
      ))}
      <Text style={styles.chartHint}>App visits (one visit per signed-in session)</Text>
    </View>
  );
}

function DonutChart({ features }) {
  const data = features.slice(0, 6);
  const total = data.reduce((sum, item) => sum + item.count, 0);
  if (!total) return <Text style={styles.emptyChart}>Feature usage will appear after farmers use the app.</Text>;
  const radius = 43;
  const circumference = 2 * Math.PI * radius;
  let consumed = 0;

  return (
    <View style={styles.donutLayout}>
      <Svg width={132} height={132} viewBox="0 0 120 120">
        <Circle cx="60" cy="60" r={radius} fill="none" stroke="#EDF1EA" strokeWidth="18" />
        {data.map((feature, index) => {
          const dash = (feature.count / total) * circumference;
          const offset = -consumed;
          consumed += dash;
          return (
            <Circle
              key={feature.feature}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={COLORS[index % COLORS.length]}
              strokeWidth="18"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={offset}
              rotation="-90"
              origin="60, 60"
            />
          );
        })}
        <SvgText x="60" y="57" textAnchor="middle" fill="#17391F" fontSize="19" fontWeight="700">{total}</SvgText>
        <SvgText x="60" y="71" textAnchor="middle" fill="#718075" fontSize="8">ACTIONS</SvgText>
      </Svg>
      <View style={styles.legend}>
        {data.map((feature, index) => (
          <View key={feature.feature} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: COLORS[index % COLORS.length] }]} />
            <Text style={styles.legendText} numberOfLines={1}>{feature.feature}</Text>
            <Text style={styles.legendCount}>{feature.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ComparisonCard({ title, current, previous, label }) {
  const change = percentageChange(current, previous);
  return (
    <View style={styles.comparisonCard}>
      <Text style={styles.comparisonTitle}>{title}</Text>
      <Text style={styles.comparisonValue}>{current} <Text style={styles.comparisonUnit}>{label}</Text></Text>
      <Text style={[styles.comparisonChange, change !== null && change < 0 && styles.negativeChange]}>
        {formatPercentage(change)} vs prior period
      </Text>
      <Text style={styles.comparisonPrevious}>Previous: {previous}</Text>
    </View>
  );
}

function createReportHtml(rows, summary, start, end) {
  const chartWidth = 600;
  const chartHeight = 140;
  const chartPadding = 16;
  const maxUsers = Math.max(1, ...rows.map((row) => row.uniqueUsers));
  const maxVisits = Math.max(1, ...rows.map((row) => row.visits));
  const points = rows.map((row, index) => {
    const x = rows.length < 2 ? chartWidth / 2 : chartPadding + (index * (chartWidth - chartPadding * 2)) / (rows.length - 1);
    const y = chartHeight - chartPadding - ((chartHeight - chartPadding * 2) * row.uniqueUsers) / maxUsers;
    return `${x},${y}`;
  }).join(' ');
  const visitBars = rows.slice(-20).map((row, index, visibleRows) => {
    const barWidth = (chartWidth - chartPadding * 2) / visibleRows.length - 5;
    const barHeight = ((chartHeight - chartPadding * 2) * row.visits) / maxVisits;
    const x = chartPadding + index * ((chartWidth - chartPadding * 2) / visibleRows.length);
    const y = chartHeight - chartPadding - barHeight;
    return `<rect x="${x}" y="${y}" width="${Math.max(2, barWidth)}" height="${barHeight}" rx="2" fill="#E47B35"><title>${htmlEscape(row.date)}: ${row.visits}</title></rect>`;
  }).join('');
  const tableRows = rows.map((row) => `
    <tr>
      <td>${htmlEscape(row.date)}</td><td>${row.usersAccessed}</td><td>${row.uniqueUsers}</td>
      <td>${row.visits}</td><td>${row.newRegistrations}</td><td>${htmlEscape(row.mostUsedFeature)}</td>
      <td>${htmlEscape(formatDuration(row.averageDurationMs))}</td><td>${row.successfulActivities}</td><td>${row.failedActivities}</td>
    </tr>`).join('');
  const featureRows = summary.featureUsage.map((item) => `<li>${htmlEscape(item.feature)}: ${item.count}</li>`).join('');

  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    body{font-family:Arial,sans-serif;color:#17391f;padding:24px}h1{margin-bottom:4px}
    .muted{color:#647568}.stats{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0}
    .stat{background:#edf4ee;border-radius:8px;padding:12px;min-width:130px}
    .stat strong{display:block;font-size:22px;margin-top:5px}
    table{border-collapse:collapse;width:100%;font-size:10px;margin-top:14px}
    th,td{border:1px solid #dce4d9;padding:7px;text-align:left}th{background:#edf4ee}
    @media print{body{padding:0}}
  </style></head><body>
    <h1>Farmer Support System</h1><h2>Reports &amp; Analytics</h2>
    <p class="muted">Report range: ${htmlEscape(dateKey(start))} to ${htmlEscape(dateKey(end))} · Generated: ${htmlEscape(new Date().toLocaleString())}</p>
    <div class="stats">
      <div class="stat">Registered users<strong>${summary.registeredUsers}</strong></div>
      <div class="stat">Active users<strong>${summary.activeUsers}</strong></div>
      <div class="stat">Today's active<strong>${summary.todayActiveUsers}</strong></div>
      <div class="stat">New today<strong>${summary.newRegistrationsToday}</strong></div>
      <div class="stat">Visits in range<strong>${summary.visits}</strong></div>
      <div class="stat">Average session<strong>${htmlEscape(formatDuration(summary.averageDurationMs))}</strong></div>
    </div>
    <h3>Daily active users</h3>
    ${rows.length ? `<svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="Daily active users line chart" style="width:100%;max-height:220px"><line x1="${chartPadding}" y1="${chartHeight - chartPadding}" x2="${chartWidth - chartPadding}" y2="${chartHeight - chartPadding}" stroke="#dce4d9"/>${points.includes(' ') ? `<polyline points="${points}" fill="none" stroke="#23613A" stroke-width="3"/>` : ''}</svg>` : '<p class="muted">No activity to chart.</p>'}
    <h3>Daily visits (most recent 20 days)</h3>
    ${rows.length ? `<svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="Daily visits bar chart" style="width:100%;max-height:220px"><line x1="${chartPadding}" y1="${chartHeight - chartPadding}" x2="${chartWidth - chartPadding}" y2="${chartHeight - chartPadding}" stroke="#dce4d9"/>${visitBars}</svg>` : '<p class="muted">No visits to chart.</p>'}
    <h3>Feature usage</h3><ul>${featureRows || '<li>No recorded feature activity.</li>'}</ul>
    <h3>Daily usage details</h3><table><thead><tr><th>Date</th><th>Users</th><th>Unique</th><th>Visits</th><th>New</th><th>Top feature</th><th>Avg. time</th><th>Success</th><th>Failed</th></tr></thead>
    <tbody>${tableRows || '<tr><td colspan="9">No usage records for this period.</td></tr>'}</tbody></table>
    <p class="muted">Daily active users are unique registered user identifiers with at least one sign-in during the local calendar day. Analytics are stored on this device.</p>
  </body></html>`;
}

export default function ReportsAnalyticsScreen({ onBack, plants = [] }) {
  const [preset, setPreset] = useState('Last 7 Days');
  const [customStart, setCustomStart] = useState(dateKey(dateRangeForPreset('Last 7 Days').start));
  const [customEnd, setCustomEnd] = useState(dateKey(new Date()));
  const [sort, setSort] = useState({ key: 'date', direction: 'desc' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [snapshot, setSnapshot] = useState({ users: [], events: [] });
  const [directoryView, setDirectoryView] = useState('users');
  const [communityVisible, setCommunityVisible] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [plantFollowers, setPlantFollowers] = useState({});
  const [followersUnavailable, setFollowersUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const range = useMemo(() => {
    if (preset !== 'Custom') return dateRangeForPreset(preset);
    const start = parseDateKey(customStart);
    const end = parseDateKey(customEnd);
    if (!start || !end || start > end) return null;
    return { start, end };
  }, [preset, customEnd, customStart]);

  const refresh = useCallback(async (showIndicator = true) => {
    if (showIndicator) setRefreshing(true);
    setError('');
    try {
      const data = await getAnalyticsData();
      setSnapshot(data);
      try {
        const keys = await AsyncStorage.getAllKeys();
        const followedKeys = keys.filter((key) => key.startsWith('followed-crops:'));
        const entries = followedKeys.length ? await AsyncStorage.multiGet(followedKeys) : [];
        const followers = {};
        entries.forEach(([key, value]) => {
          if (!value) return;
          try {
            const userId = key.slice('followed-crops:'.length);
            const followedCrops = JSON.parse(value);
            Object.entries(followedCrops).forEach(([plantId, details]) => {
              if (details) {
                if (!followers[plantId]) followers[plantId] = [];
                followers[plantId].push(userId);
              }
            });
          } catch {
            // Ignore malformed follow data while preserving the analytics report.
          }
        });
        setPlantFollowers(followers);
        setFollowersUnavailable(false);
      } catch {
        setPlantFollowers({});
        setFollowersUnavailable(true);
      }
      return true;
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to load analytics data.');
      return false;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh(false);
  }, [refresh]);

  const summary = useMemo(() => range
    ? summarizeUsage(snapshot.events, snapshot.users, range.start, range.end)
    : null, [range, snapshot]);

  const rows = useMemo(() => range
    ? buildDailyRows(snapshot.events, snapshot.users, range.start, range.end)
    : [], [range, snapshot]);
  const hasRangeData = rows.some((row) => (
    row.visits > 0
    || row.newRegistrations > 0
    || row.successfulActivities > 0
    || row.failedActivities > 0
  ));

  const weekly = useMemo(() => {
    const current = calendarComparisonRange('week');
    const previous = calendarComparisonRange('week', -1);
    return { current, previous };
  }, []);
  const monthly = useMemo(() => {
    const current = calendarComparisonRange('month');
    const previous = calendarComparisonRange('month', -1);
    return { current, previous };
  }, []);

  const weeklyStats = useMemo(() => (
    range ? compareUsagePeriods(snapshot.events, weekly.current.start, weekly.current.end, weekly.previous.start, weekly.previous.end) : null
  ), [range, snapshot, weekly]);
  const monthlyStats = useMemo(() => (
    range ? compareUsagePeriods(snapshot.events, monthly.current.start, monthly.current.end, monthly.previous.start, monthly.previous.end) : null
  ), [range, snapshot, monthly]);
  const peakHours = useMemo(() => range ? getPeakHours(snapshot.events, range.start, range.end) : [], [range, snapshot]);
  const growth = useMemo(() => {
    if (!range) return null;
    const rangeDays = Math.round((range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const previousStart = shiftDate(range.start, -rangeDays);
    const previousEnd = shiftDate(range.start, -1);
    const countUniqueUsers = (start, end) => new Set(snapshot.events
      .filter((event) => event.type === 'session_start' && event.role === 'user')
      .filter((event) => {
        const day = dateKey(new Date(event.timestamp));
        return day >= dateKey(start) && day <= dateKey(end);
      })
      .map((event) => event.userId)).size;
    return percentageChange(countUniqueUsers(range.start, range.end), countUniqueUsers(previousStart, previousEnd));
  }, [range, snapshot]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = rows.filter((row) => !needle || [
      row.date,
      row.mostUsedFeature,
      ...row.features.map((feature) => feature.feature),
    ].join(' ').toLowerCase().includes(needle));
    return filtered.sort((left, right) => {
      const a = left[sort.key];
      const b = right[sort.key];
      const comparison = typeof a === 'number' && typeof b === 'number'
        ? a - b
        : String(a ?? '').localeCompare(String(b ?? ''));
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [rows, search, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const demoFarmer = snapshot.users.find((user) => user.userId === 'farmer') || {
    userId: 'farmer',
    role: 'user',
    registeredAt: null,
  };
  const allRegisteredUsers = [
    ...snapshot.users.filter((user) => user.registeredAt && user.userId !== 'farmer'),
    { ...demoFarmer, isDemo: true },
  ].sort((left, right) => String(right.registeredAt || '').localeCompare(String(left.registeredAt || '')));
  const registeredUsers = allRegisteredUsers
    .filter((user) => `${user.userId} ${user.role}`.toLowerCase().includes(userSearch.trim().toLowerCase()))

  useEffect(() => {
    setPage(0);
  }, [preset, customStart, customEnd, search]);

  const switchSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const exportCsv = async () => {
    if (!range) return;
    try {
      const filename = `farmer-usage-${dateKey(range.start)}-to-${dateKey(range.end)}.csv`;
      await exportCsvFile(buildCsv(filteredRows), filename);
    } catch (exportError) {
      Alert.alert('CSV export failed', exportError instanceof Error ? exportError.message : 'Unable to export CSV.');
    }
  };

  const exportPdf = async (print = false) => {
    if (!range || !summary) return;
    try {
      const html = createReportHtml(filteredRows, summary, range.start, range.end);
      if (print) {
        await Print.printAsync({ html });
        return;
      }
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
        return;
      }
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const available = await Sharing.isAvailableAsync();
      if (!available) throw new Error('File sharing is not available on this device.');
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Download usage report PDF' });
    } catch (exportError) {
      Alert.alert(print ? 'Print failed' : 'PDF export failed', exportError instanceof Error ? exportError.message : 'Unable to export report.');
    }
  };

  const generateReport = async () => {
    if (!range) {
      Alert.alert('Invalid date range', 'Enter valid dates in YYYY-MM-DD format. The start date must be on or before the end date.');
      return;
    }
    const loaded = await refresh();
    if (!loaded) return;
    Alert.alert('Report generated', `${filteredRows.length} daily records from ${dateKey(range.start)} to ${dateKey(range.end)}.`);
  };

  const header = (key, label) => (
    <Pressable onPress={() => switchSort(key)} style={styles.tableHeaderCell}>
      <Text style={styles.tableHeaderText}>{label}{sort.key === key ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}</Text>
    </Pressable>
  );

  return (
    <>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}><Text style={styles.backText}>‹  Library</Text></Pressable>
        <Text style={styles.adminBadge}>ADMIN REPORT</Text>
      </View>
      <Text style={styles.eyebrow}>FARMER SUPPORT SYSTEM</Text>
      <Text style={styles.title}>Reports &amp; Analytics</Text>
      <Text style={styles.subtitle}>Understand how farmers use crop guidance and grow the field library.</Text>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Application overview</Text>
        <Text style={styles.noticeText}>A crop guidance library for farmers, with practical planting seasons, harvest information, soil and watering advice, pest guidance, photos, and videos.</Text>
        <Text style={styles.noticeText}>Purpose: make accessible crop-care information available to village farmers and help administrators maintain accurate local guides.</Text>
        <Text style={styles.noticeText}>Developed by: project author is not identified in the repository. Organization details: not provided. Target users: farmers and village administrators.</Text>
        <Text style={styles.noticeText}>Technologies: Expo SDK 57, React Native, JavaScript, and device-local AsyncStorage analytics.</Text>
        <Text style={styles.noticeText}>Access limitation: reports are hidden from non-admin roles in the existing client app, but the demo account and role check are client-side—not production-grade authentication or server-enforced authorization.</Text>
      </View>

      <View style={styles.rangeCard}>
        <Text style={styles.sectionTitle}>Date range</Text>
        <View style={styles.presetRow}>
          {PRESETS.map((item) => (
            <Pressable key={item} onPress={() => setPreset(item)} style={[styles.presetButton, preset === item && styles.presetSelected]}>
              <Text style={[styles.presetText, preset === item && styles.presetTextSelected]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        {preset === 'Custom' && (
          <View style={styles.customDates}>
            <View style={styles.dateInputWrap}>
              <Text style={styles.inputLabel}>Start (YYYY-MM-DD)</Text>
              <TextInput value={customStart} onChangeText={setCustomStart} maxLength={10} autoCapitalize="none" placeholder="2026-01-01" placeholderTextColor="#9AA69B" style={styles.dateInput} />
            </View>
            <View style={styles.dateInputWrap}>
              <Text style={styles.inputLabel}>End (YYYY-MM-DD)</Text>
              <TextInput value={customEnd} onChangeText={setCustomEnd} maxLength={10} autoCapitalize="none" placeholder="2026-01-31" placeholderTextColor="#9AA69B" style={styles.dateInput} />
            </View>
          </View>
        )}
        <Text style={[styles.rangeLabel, !range && styles.errorText]}>
          {range ? `${dateKey(range.start)}  —  ${dateKey(range.end)}` : 'Enter a valid start and end date (YYYY-MM-DD).'}
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorTitle}>Unable to load analytics</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable onPress={() => refresh()} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View>
      ) : loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color="#23613A" /><Text style={styles.loadingText}>Loading real usage records…</Text></View>
      ) : summary && range ? (
        <>
          <View style={styles.actionRow}>
            <ActionButton label="Generate Report" onPress={generateReport} primary />
            <ActionButton label={refreshing ? 'Refreshing…' : 'Refresh Data'} onPress={() => refresh()} disabled={refreshing} />
          </View>
          <View style={styles.actionRow}>
            <ActionButton label="Print Report" onPress={() => exportPdf(true)} />
            <ActionButton label="Download PDF" onPress={() => exportPdf(false)} />
            <ActionButton label="Export CSV" onPress={exportCsv} />
          </View>

          <View style={styles.metricsGrid}>
            <MetricCard label="Registered users" value={summary.registeredUsers} detail="Farmers recorded on this device" color="#23613A" />
            <MetricCard label="Active users" value={summary.activeUsers} detail="Unique farmers with a recorded sign-in" color="#467BB5" />
            <MetricCard label="Today's active users" value={summary.todayActiveUsers} detail="Unique farmer IDs signed in today" color="#E47B35" />
            <MetricCard label="New registrations today" value={summary.newRegistrationsToday} detail="New farmer accounts recorded today" color="#8B66AF" />
            <MetricCard label="Total visits" value={summary.visits} detail="Sign-in sessions in selected range" color="#4A9A8F" />
            <MetricCard label="Total user sessions" value={summary.sessions} detail="Recorded farmer sessions in range" color="#D6A42B" />
            <MetricCard label="Average session duration" value={formatDuration(summary.averageDurationMs)} detail="Completed sessions only" color="#467BB5" />
            <MetricCard label="Most-used feature" value={summary.mostUsedFeature} detail="Recorded feature actions in range" color="#23613A" />
          </View>
          <Text style={styles.disclaimer}>Daily active user = one unique signed-in farmer account per local calendar day. A dashboard refresh does not create a usage event. Session duration includes completed sessions only; sign out to record one.</Text>

          <Pressable accessibilityRole="button" onPress={() => setCommunityVisible(true)} style={styles.communityLaunch}>
            <View style={styles.communityIcon}><Text style={styles.communityIconText}>◎</Text></View>
            <View style={styles.communityLaunchCopy}>
              <Text style={styles.directoryTitle}>Community</Text>
              <Text style={styles.directorySubtitle}>View registered users and crop followers</Text>
            </View>
            <Text style={styles.communityArrow}>›</Text>
          </Pressable>

          {!hasRangeData && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No usage data for this date range</Text>
              <Text style={styles.emptyCopy}>This report shows recorded application events only. Sign in as a farmer, use a crop guide, then refresh the report.</Text>
            </View>
          )}

          <View style={styles.chartGrid}>
            <ChartCard title="Daily active users" subtitle="Unique signed-in farmer accounts">
              <LineChart rows={rows} />
            </ChartCard>
            <ChartCard title="Daily application visits" subtitle="One visit per signed-in session">
              <BarChart rows={rows} />
            </ChartCard>
            <ChartCard title="Feature usage" subtitle="Most popular actions in the selected range">
              <DonutChart features={summary.featureUsage} />
            </ChartCard>
            <ChartCard title="Peak usage times" subtitle="Most common sign-in hours, device local time">
              {summary.visits ? peakHours.map((item) => (
                <View key={item.hour} style={styles.peakRow}>
                  <Text style={styles.peakTime}>{formatHour(item.hour)}</Text>
                  <Text style={styles.peakVisits}>{item.visits} {item.visits === 1 ? 'visit' : 'visits'}</Text>
                </View>
              )) : <Text style={styles.emptyChart}>No visits to calculate peak times.</Text>}
            </ChartCard>
          </View>

          <Text style={styles.sectionTitle}>Usage comparisons</Text>
          <View style={styles.comparisonGrid}>
            {weeklyStats && (
              <View style={styles.comparisonGroup}>
                <Text style={styles.comparisonGroupTitle}>This week vs last week</Text>
                <ComparisonCard title="Visits" current={weeklyStats.current.visits} previous={weeklyStats.previous.visits} label="visits" />
                <ComparisonCard title="Unique users" current={weeklyStats.current.uniqueUsers} previous={weeklyStats.previous.uniqueUsers} label="users" />
              </View>
            )}
            {monthlyStats && (
              <View style={styles.comparisonGroup}>
                <Text style={styles.comparisonGroupTitle}>This month vs last month</Text>
                <ComparisonCard title="Visits" current={monthlyStats.current.visits} previous={monthlyStats.previous.visits} label="visits" />
                <ComparisonCard title="Unique users" current={monthlyStats.current.uniqueUsers} previous={monthlyStats.previous.uniqueUsers} label="users" />
              </View>
            )}
          </View>
          <Text style={styles.growthText}>User growth vs the previous {rows.length}-day period: {formatPercentage(growth)}</Text>

          <View style={styles.tableHeadingRow}>
            <View style={styles.tableHeadingCopy}>
              <Text style={styles.sectionTitle}>Daily usage report</Text>
              <Text style={styles.cardSubtitle}>Search dates or features; tap a column header to sort.</Text>
            </View>
          </View>
          <TextInput value={search} onChangeText={setSearch} placeholder="Search date or feature…" placeholderTextColor="#9AA69B" style={styles.searchInput} />
          {!filteredRows.length ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No usage records yet</Text>
              <Text style={styles.emptyCopy}>Reports are built from real sign-ins and feature actions. Use the app as a farmer, then return here to refresh.</Text>
            </View>
          ) : (
            <View style={styles.tableCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                  <View style={styles.tableHeader}>
                    {header('date', 'Date')}
                    {header('usersAccessed', 'Users')}
                    {header('uniqueUsers', 'Unique')}
                    {header('visits', 'Visits')}
                    {header('newRegistrations', 'New')}
                    {header('mostUsedFeature', 'Top feature')}
                    {header('averageDurationMs', 'Avg. time')}
                    {header('successfulActivities', 'Success')}
                    {header('failedActivities', 'Failed')}
                  </View>
                  {pageRows.map((row) => (
                    <View key={row.date} style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.dateCell]}>{row.date}</Text>
                      <Text style={styles.tableCell}>{row.usersAccessed}</Text>
                      <Text style={styles.tableCell}>{row.uniqueUsers}</Text>
                      <Text style={styles.tableCell}>{row.visits}</Text>
                      <Text style={styles.tableCell}>{row.newRegistrations}</Text>
                      <Text style={[styles.tableCell, styles.featureCell]} numberOfLines={1}>{row.mostUsedFeature}</Text>
                      <Text style={styles.tableCell}>{formatDuration(row.averageDurationMs)}</Text>
                      <Text style={styles.tableCell}>{row.successfulActivities}</Text>
                      <Text style={styles.tableCell}>{row.failedActivities}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
              <View style={styles.pagination}>
                <Text style={styles.paginationLabel}>{filteredRows.length} daily records</Text>
                <View style={styles.pageActions}>
                  <Pressable disabled={page === 0} onPress={() => setPage((current) => Math.max(0, current - 1))} style={[styles.pageButton, page === 0 && styles.pageDisabled]}><Text style={styles.pageButtonText}>‹</Text></Pressable>
                  <Text style={styles.pageCount}>{page + 1} / {pageCount}</Text>
                  <Pressable disabled={page + 1 >= pageCount} onPress={() => setPage((current) => Math.min(pageCount - 1, current + 1))} style={[styles.pageButton, page + 1 >= pageCount && styles.pageDisabled]}><Text style={styles.pageButtonText}>›</Text></Pressable>
                </View>
              </View>
            </View>
          )}

          <View style={styles.storageNotice}>
            <Text style={styles.storageTitle}>Analytics data scope</Text>
            <Text style={styles.storageCopy}>This project has no backend or shared database. Account and crop data are currently in memory, while this module stores non-password analytics locally on this device. Reports cannot include records from other installations, and reinstalling or clearing app storage removes these analytics.</Text>
          </View>
        </>
      ) : null}
      </ScrollView>
      <Modal visible={communityVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCommunityVisible(false)}>
        <View style={styles.communityWindow}>
          <View style={styles.communityHeader}>
            <View style={styles.communityHeaderCopy}>
              <Text style={styles.eyebrow}>COMMUNITY DIRECTORY</Text>
              <Text style={styles.communityWindowTitle}>Users &amp; plant follows</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close community directory" onPress={() => setCommunityVisible(false)} style={styles.closeButton}><Text style={styles.closeButtonText}>×</Text></Pressable>
          </View>
          <Text style={styles.communityWindowSubtitle}>Browse local accounts and see which crops farmers follow.</Text>
          <View accessibilityRole="tablist" style={styles.directoryTabs}>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: directoryView === 'users' }} onPress={() => setDirectoryView('users')} style={[styles.directoryTab, directoryView === 'users' && styles.directoryTabSelected]}>
              <Text style={[styles.directoryTabText, directoryView === 'users' && styles.directoryTabTextSelected]}>Users ({allRegisteredUsers.length})</Text>
            </Pressable>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: directoryView === 'plants' }} onPress={() => setDirectoryView('plants')} style={[styles.directoryTab, directoryView === 'plants' && styles.directoryTabSelected]}>
              <Text style={[styles.directoryTabText, directoryView === 'plants' && styles.directoryTabTextSelected]}>Plant follows</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.communityList} contentContainerStyle={styles.communityListContent} keyboardShouldPersistTaps="handled">
            {directoryView === 'users' ? (
              <>
                <TextInput value={userSearch} onChangeText={setUserSearch} autoCapitalize="none" placeholder="Search username or role" placeholderTextColor="#9AA69B" style={styles.directorySearch} />
                {!registeredUsers.length ? (
                  <Text style={styles.directoryEmpty}>{userSearch ? 'No users match your search.' : 'No registered accounts are recorded on this device yet.'}</Text>
                ) : registeredUsers.map((user) => (
                  <View key={user.userId} style={styles.directoryRow}>
                    <View style={styles.userAvatar}><Text style={styles.userAvatarText}>{user.userId.slice(0, 1).toUpperCase()}</Text></View>
                    <View style={styles.directoryCopy}>
                      <Text style={styles.directoryName}>{user.userId}</Text>
                      <Text style={styles.directoryMeta}>{user.isDemo ? 'Demo farmer account · Built-in sample login' : `${user.role === 'admin' ? 'Administrator' : 'Farmer'} · Joined ${new Date(user.registeredAt).toLocaleDateString()}`}</Text>
                    </View>
                  </View>
                ))}
              </>
            ) : followersUnavailable ? (
              <Text style={styles.directoryEmpty}>Plant follow records are unavailable. Refresh the report to try again.</Text>
            ) : plants.length ? [...plants]
              .sort((left, right) => (plantFollowers[right.id]?.length || 0) - (plantFollowers[left.id]?.length || 0))
              .map((plant) => {
                const userIds = plantFollowers[plant.id] || [];
                return (
                  <View key={plant.id} style={styles.directoryRow}>
                    <View style={styles.plantAvatar}><Text style={styles.plantAvatarText}>{plant.name.slice(0, 1).toUpperCase()}</Text></View>
                    <View style={styles.directoryCopy}>
                      <Text style={styles.directoryName}>{plant.name}</Text>
                      <Text style={styles.directoryMeta}>{plant.category} · {userIds.length} {userIds.length === 1 ? 'follower' : 'followers'}</Text>
                      <Text style={styles.followerNames}>{userIds.length ? userIds.join(', ') : 'No users following this crop yet'}</Text>
                    </View>
                  </View>
                );
              }) : <Text style={styles.directoryEmpty}>No crop guides are available.</Text>}
            <Text style={styles.directoryFootnote}>Only accounts and follows stored in this app installation are included. Passwords are never shown.</Text>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function ActionButton({ label, onPress, primary, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.actionButton, primary && styles.actionPrimary, disabled && styles.actionDisabled]}>
      <Text style={[styles.actionText, primary && styles.actionPrimaryText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F7F8F2', flex: 1 },
  content: { padding: 20, paddingBottom: 48, paddingTop: 24 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  backButton: { paddingVertical: 8 },
  backText: { color: '#23613A', fontSize: 14, fontWeight: '800' },
  adminBadge: { backgroundColor: '#FFF1E4', borderRadius: 7, color: '#9A4E1B', fontSize: 9, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6 },
  eyebrow: { color: '#E47B35', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 18 },
  title: { color: '#17391F', fontSize: 29, fontWeight: '900', marginTop: 5 },
  subtitle: { color: '#718075', fontSize: 14, lineHeight: 21, marginTop: 6 },
  notice: { backgroundColor: '#FFFFFF', borderColor: '#E2E9DF', borderRadius: 15, borderWidth: 1, gap: 8, marginTop: 18, padding: 15 },
  noticeTitle: { color: '#17391F', fontSize: 15, fontWeight: '900' },
  noticeText: { color: '#536157', fontSize: 12, lineHeight: 18 },
  rangeCard: { backgroundColor: '#FFFFFF', borderColor: '#E2E9DF', borderRadius: 15, borderWidth: 1, marginTop: 15, padding: 15 },
  sectionTitle: { color: '#17391F', fontSize: 19, fontWeight: '900' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 },
  presetButton: { backgroundColor: '#F3F6F1', borderColor: '#E2E9DF', borderRadius: 9, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  presetSelected: { backgroundColor: '#23613A', borderColor: '#23613A' },
  presetText: { color: '#526E5F', fontSize: 11, fontWeight: '700' },
  presetTextSelected: { color: '#FFFFFF' },
  customDates: { flexDirection: 'row', gap: 10, marginTop: 12 },
  dateInputWrap: { flex: 1 },
  inputLabel: { color: '#718075', fontSize: 10, fontWeight: '700', marginBottom: 5 },
  dateInput: { borderColor: '#DCE4D9', borderRadius: 9, borderWidth: 1, color: '#17391F', fontSize: 12, paddingHorizontal: 10, paddingVertical: 10 },
  rangeLabel: { color: '#718075', fontSize: 11, fontWeight: '700', marginTop: 12 },
  errorText: { color: '#B84D3B' },
  loading: { alignItems: 'center', paddingVertical: 42 },
  loadingText: { color: '#718075', fontSize: 13, marginTop: 12 },
  errorBanner: { backgroundColor: '#FFF0ED', borderRadius: 12, marginTop: 18, padding: 16 },
  errorTitle: { color: '#96392D', fontSize: 15, fontWeight: '800' },
  errorMessage: { color: '#744840', fontSize: 12, lineHeight: 18, marginTop: 5 },
  retryButton: { alignSelf: 'flex-start', backgroundColor: '#96392D', borderRadius: 8, marginTop: 11, paddingHorizontal: 12, paddingVertical: 9 },
  retryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#DCE4D9', borderRadius: 9, borderWidth: 1, flexGrow: 1, paddingHorizontal: 10, paddingVertical: 11 },
  actionPrimary: { backgroundColor: '#23613A', borderColor: '#23613A' },
  actionDisabled: { opacity: 0.55 },
  actionText: { color: '#23613A', fontSize: 11, fontWeight: '800', textAlign: 'center' },
  actionPrimaryText: { color: '#FFFFFF' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 15 },
  metricCard: { backgroundColor: '#FFFFFF', borderColor: '#E7ECE3', borderLeftWidth: 4, borderRadius: 11, borderWidth: 1, flexBasis: '47%', flexGrow: 1, minHeight: 95, padding: 12 },
  metricLabel: { color: '#718075', fontSize: 10, fontWeight: '800' },
  metricValue: { color: '#17391F', fontSize: 23, fontWeight: '900', marginTop: 6 },
  metricDetail: { color: '#849086', fontSize: 9, lineHeight: 13, marginTop: 3 },
  disclaimer: { color: '#718075', fontSize: 10, lineHeight: 16, marginTop: 10 },
  communityLaunch: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#DFE8DC', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 19, minHeight: 80, padding: 14 },
  communityIcon: { alignItems: 'center', backgroundColor: '#EAF1E5', borderRadius: 23, height: 46, justifyContent: 'center', width: 46 },
  communityIconText: { color: '#23613A', fontSize: 27, fontWeight: '700', lineHeight: 30 },
  communityLaunchCopy: { flex: 1 },
  directoryTitle: { color: '#17391F', fontSize: 18, fontWeight: '900' },
  directorySubtitle: { color: '#718075', fontSize: 12, lineHeight: 17, marginTop: 4 },
  communityArrow: { color: '#23613A', fontSize: 28, fontWeight: '600', paddingHorizontal: 4 },
  communityWindow: { backgroundColor: '#F7F8F2', flex: 1, paddingHorizontal: 18, paddingTop: 20 },
  communityHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  communityHeaderCopy: { flex: 1 },
  communityWindowTitle: { color: '#17391F', fontSize: 24, fontWeight: '900', marginTop: 5 },
  closeButton: { alignItems: 'center', backgroundColor: '#E7ECE3', borderRadius: 21, height: 42, justifyContent: 'center', marginLeft: 12, width: 42 },
  closeButtonText: { color: '#365540', fontSize: 28, fontWeight: '500', lineHeight: 31 },
  communityWindowSubtitle: { color: '#718075', fontSize: 14, lineHeight: 20, marginTop: 7 },
  directoryTabs: { backgroundColor: '#F1F4EF', borderRadius: 9, flexDirection: 'row', gap: 4, marginTop: 13, padding: 4 },
  directoryTab: { alignItems: 'center', borderRadius: 7, flex: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: 7 },
  directoryTabSelected: { backgroundColor: '#23613A' },
  directoryTabText: { color: '#536157', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  directoryTabTextSelected: { color: '#FFFFFF' },
  directorySearch: { backgroundColor: '#FFFFFF', borderColor: '#DCE4D9', borderRadius: 9, borderWidth: 1, color: '#17391F', fontSize: 13, marginTop: 12, minHeight: 43, paddingHorizontal: 11 },
  directoryEmpty: { color: '#718075', fontSize: 12, lineHeight: 18, paddingVertical: 20, textAlign: 'center' },
  communityList: { flex: 1, marginTop: 10 },
  communityListContent: { paddingBottom: 24 },
  directoryRow: { alignItems: 'center', borderBottomColor: '#EDF0EA', borderBottomWidth: 1, flexDirection: 'row', gap: 10, minHeight: 63, paddingVertical: 10 },
  userAvatar: { alignItems: 'center', backgroundColor: '#EAF1E5', borderRadius: 19, height: 38, justifyContent: 'center', width: 38 },
  userAvatarText: { color: '#23613A', fontSize: 15, fontWeight: '900' },
  plantAvatar: { alignItems: 'center', backgroundColor: '#FFF1E4', borderRadius: 19, height: 38, justifyContent: 'center', width: 38 },
  plantAvatarText: { color: '#9A4E1B', fontSize: 15, fontWeight: '900' },
  directoryCopy: { flex: 1 },
  directoryName: { color: '#17391F', fontSize: 14, fontWeight: '800' },
  directoryMeta: { color: '#718075', fontSize: 11, lineHeight: 16, marginTop: 3 },
  followerNames: { color: '#536157', fontSize: 12, lineHeight: 18, marginTop: 5 },
  directoryFootnote: { color: '#849086', fontSize: 10, lineHeight: 15, marginTop: 11 },
  chartGrid: { gap: 11, marginTop: 18 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#E7ECE3', borderRadius: 14, borderWidth: 1, padding: 14 },
  cardTitle: { color: '#17391F', fontSize: 15, fontWeight: '900' },
  cardSubtitle: { color: '#849086', fontSize: 10, lineHeight: 15, marginTop: 3 },
  chartWrap: { marginTop: 12 },
  chartHint: { color: '#849086', fontSize: 9, marginTop: 3, textAlign: 'center' },
  emptyChart: { color: '#849086', fontSize: 12, lineHeight: 18, paddingVertical: 25, textAlign: 'center' },
  barChart: { marginTop: 13 },
  barRow: { alignItems: 'center', flexDirection: 'row', gap: 7, marginBottom: 7 },
  barDate: { color: '#718075', fontSize: 9, width: 37 },
  barTrack: { backgroundColor: '#F1F4EF', borderRadius: 5, flex: 1, height: 10, overflow: 'hidden' },
  barFill: { backgroundColor: '#E47B35', borderRadius: 5, height: 10 },
  barValue: { color: '#526E5F', fontSize: 10, fontWeight: '700', textAlign: 'right', width: 22 },
  donutLayout: { alignItems: 'center', flexDirection: 'row', gap: 7, marginTop: 10 },
  legend: { flex: 1, gap: 9 },
  legendRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  legendDot: { borderRadius: 4, height: 8, width: 8 },
  legendText: { color: '#536157', flex: 1, fontSize: 10 },
  legendCount: { color: '#17391F', fontSize: 10, fontWeight: '800' },
  peakRow: { borderBottomColor: '#EDF1EA', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11 },
  peakTime: { color: '#536157', fontSize: 12, fontWeight: '700' },
  peakVisits: { color: '#23613A', fontSize: 12, fontWeight: '800' },
  comparisonGrid: { gap: 13, marginTop: 9 },
  comparisonGroup: { backgroundColor: '#FFFFFF', borderColor: '#E7ECE3', borderRadius: 13, borderWidth: 1, gap: 8, padding: 12 },
  comparisonGroupTitle: { color: '#17391F', fontSize: 13, fontWeight: '900', marginBottom: 2 },
  comparisonCard: { backgroundColor: '#F7F8F2', borderRadius: 9, flex: 1, padding: 10 },
  comparisonTitle: { color: '#718075', fontSize: 10, fontWeight: '700' },
  comparisonValue: { color: '#17391F', fontSize: 19, fontWeight: '900', marginTop: 4 },
  comparisonUnit: { color: '#849086', fontSize: 10, fontWeight: '600' },
  comparisonChange: { color: '#23613A', fontSize: 10, fontWeight: '800', marginTop: 4 },
  negativeChange: { color: '#B84D3B' },
  comparisonPrevious: { color: '#849086', fontSize: 9, marginTop: 3 },
  growthText: { color: '#536157', fontSize: 11, fontWeight: '700', lineHeight: 17, marginTop: 10 },
  tableHeadingRow: { marginTop: 23 },
  tableHeadingCopy: { flex: 1 },
  searchInput: { backgroundColor: '#FFFFFF', borderColor: '#DCE4D9', borderRadius: 10, borderWidth: 1, color: '#17391F', fontSize: 13, marginTop: 11, paddingHorizontal: 13, paddingVertical: 12 },
  tableCard: { backgroundColor: '#FFFFFF', borderColor: '#E2E9DF', borderRadius: 12, borderWidth: 1, marginTop: 10, overflow: 'hidden' },
  tableHeader: { backgroundColor: '#EDF4EE', flexDirection: 'row', minHeight: 43 },
  tableHeaderCell: { justifyContent: 'center', minWidth: 78, paddingHorizontal: 8 },
  tableHeaderText: { color: '#365540', fontSize: 9, fontWeight: '900' },
  tableRow: { borderBottomColor: '#EDF1EA', borderBottomWidth: 1, flexDirection: 'row', minHeight: 46 },
  tableCell: { alignSelf: 'center', color: '#536157', fontSize: 10, minWidth: 78, paddingHorizontal: 8 },
  dateCell: { color: '#17391F', fontWeight: '800', minWidth: 97 },
  featureCell: { maxWidth: 130 },
  pagination: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: 10 },
  paginationLabel: { color: '#718075', fontSize: 10 },
  pageActions: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  pageButton: { alignItems: 'center', backgroundColor: '#EAF1E5', borderRadius: 7, height: 30, justifyContent: 'center', width: 30 },
  pageDisabled: { opacity: 0.4 },
  pageButtonText: { color: '#23613A', fontSize: 19, fontWeight: '800' },
  pageCount: { color: '#536157', fontSize: 10, fontWeight: '700' },
  emptyState: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E9DF', borderRadius: 12, borderWidth: 1, marginTop: 10, padding: 24 },
  emptyTitle: { color: '#17391F', fontSize: 15, fontWeight: '900' },
  emptyCopy: { color: '#718075', fontSize: 12, lineHeight: 18, marginTop: 6, textAlign: 'center' },
  storageNotice: { backgroundColor: '#FFF8EE', borderColor: '#F3DFC3', borderRadius: 11, borderWidth: 1, marginTop: 18, padding: 13 },
  storageTitle: { color: '#8A5529', fontSize: 11, fontWeight: '900' },
  storageCopy: { color: '#806B58', fontSize: 10, lineHeight: 16, marginTop: 5 },
});
