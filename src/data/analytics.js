import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@farmer-support-system/analytics-v1';
let writeQueue = Promise.resolve();

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function newState() {
  return { users: [], events: [] };
}

async function readState() {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return newState();

  const state = JSON.parse(stored);
  if (!state || !Array.isArray(state.users) || !Array.isArray(state.events)) {
    throw new Error('Stored analytics data is invalid. Clear the app data or restore a valid analytics backup.');
  }
  return state;
}

function updateState(update) {
  const operation = writeQueue.then(async () => {
    const state = await readState();
    const result = update(state);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return result;
  });
  writeQueue = operation.catch(() => {});
  return operation;
}

export function createAnalyticsSessionId() {
  return makeId();
}

export function recordRegistration(userId, role = 'user') {
  return updateState((state) => {
    const registeredAt = new Date().toISOString();
    const existingUser = state.users.find((user) => user.userId === userId);
    if (existingUser) {
      existingUser.role = role;
      existingUser.registeredAt = existingUser.registeredAt || registeredAt;
    } else {
      state.users.push({ userId, role, firstSeenAt: registeredAt, registeredAt });
    }
    state.events.push({
      id: makeId(),
      type: 'registration',
      userId,
      role,
      timestamp: registeredAt,
      outcome: 'success',
    });
  });
}

export function recordSessionStart(userId, role, sessionId) {
  return updateState((state) => {
    const timestamp = new Date().toISOString();
    const existingUser = state.users.find((user) => user.userId === userId);
    if (existingUser) {
      existingUser.role = role;
    } else {
      state.users.push({ userId, role, firstSeenAt: timestamp, registeredAt: null });
    }
    state.events.push({
      id: makeId(),
      type: 'session_start',
      userId,
      role,
      sessionId,
      timestamp,
      outcome: 'success',
    });
  });
}

export function recordSessionEnd(sessionId) {
  return updateState((state) => {
    const started = state.events.find((event) => event.type === 'session_start' && event.sessionId === sessionId);
    if (!started || state.events.some((event) => event.type === 'session_end' && event.sessionId === sessionId)) return;

    const endedAt = new Date();
    const startedAt = new Date(started.timestamp);
    const durationMs = Math.max(0, endedAt.getTime() - startedAt.getTime());
    state.events.push({
      id: makeId(),
      type: 'session_end',
      userId: started.userId,
      role: started.role,
      sessionId,
      timestamp: endedAt.toISOString(),
      durationMs,
      outcome: 'success',
    });
  });
}

export function recordFeatureUsage(session, feature, outcome = 'success') {
  if (!session || !session.userId || !session.sessionId) {
    return Promise.reject(new Error('A valid signed-in session is required to record usage.'));
  }
  const cleanFeature = String(feature).trim().slice(0, 80);
  if (!cleanFeature) return Promise.reject(new Error('Feature name cannot be empty.'));

  return updateState((state) => {
    state.events.push({
      id: makeId(),
      type: 'feature_use',
      userId: session.userId,
      role: session.role,
      sessionId: session.sessionId,
      feature: cleanFeature,
      timestamp: new Date().toISOString(),
      outcome: outcome === 'failure' ? 'failure' : 'success',
    });
  });
}

export async function getAnalyticsData() {
  await writeQueue;
  return readState();
}
