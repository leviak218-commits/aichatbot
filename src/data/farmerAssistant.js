const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

async function request(path, options) {
  if (!API_BASE_URL) {
    throw new Error('Set EXPO_PUBLIC_API_URL in the project root .env file and restart Expo.');
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
  } catch {
    throw new Error('Could not reach the assistant server. Check the server address and network connection.');
  }

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.error || 'The assistant request failed. Please try again.');
  }
  return result;
}

export function getChatHistory(userId) {
  return request(`/api/chat/history?userId=${encodeURIComponent(userId)}`);
}

export function clearChatHistory(userId) {
  return request(`/api/chat/history?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

export function sendChatMessage({ userId, message, language }) {
  return request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ userId, message, language }),
  });
}
