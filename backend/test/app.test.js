import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createApp } from '../src/app.js';
import { createGeminiAnswerGenerator } from '../src/gemini.js';

const servers = new Set();

test('Gemini generator falls back when the primary model is overloaded', async () => {
  const requests = [];
  const generateAnswer = createGeminiAnswerGenerator({
    model: 'primary-model',
    fallbackModel: 'fallback-model',
    client: {
      models: {
        generateContent: async (request) => {
          requests.push(request);
          if (request.model === 'primary-model') {
            const error = new Error('Model overloaded.');
            error.status = 503;
            throw error;
          }
          return { text: 'Try checking soil moisture.' };
        },
      },
    },
  });

  const answer = await generateAnswer({
    history: [{ role: 'user', text: 'I grow rice.' }],
    message: 'Should I irrigate?',
    systemInstruction: 'Answer carefully.',
  });

  assert.equal(answer, 'Try checking soil moisture.');
  assert.deepEqual(requests.map(({ model }) => model), ['primary-model', 'fallback-model']);
  assert.deepEqual(requests[0].contents, requests[1].contents);
});

test('Gemini generator does not fallback for non-overload errors', async () => {
  let requestCount = 0;
  const generateAnswer = createGeminiAnswerGenerator({
    model: 'primary-model',
    fallbackModel: 'fallback-model',
    client: {
      models: {
        generateContent: async () => {
          requestCount += 1;
          const error = new Error('Invalid API key.');
          error.status = 403;
          throw error;
        },
      },
    },
  });

  await assert.rejects(generateAnswer({ history: [], message: 'Hello', systemInstruction: 'Answer.' }));
  assert.equal(requestCount, 1);
});

async function startTestServer(options = {}) {
  const documentsByUser = new Map();
  let nextId = 0;
  const database = {
    collection: () => ({
      doc: (userId) => ({
        collection: () => {
          const messages = {
          doc: (id) => ({ id: id || `turn-${++nextId}`, userId }),
          orderBy: () => ({
            limit: (count) => ({
              get: async () => {
                const documents = documentsByUser.get(userId) || [];
                const recent = documents.slice().sort((left, right) => (
                  right.data.createdAt.getTime() - left.data.createdAt.getTime()
                )).slice(0, count);
                return { docs: recent.map(({ id, data }) => ({ id, ref: { id, userId }, data: () => data })) };
              },
            }),
          }),
          limit: (count) => ({
            get: async () => {
              const documents = (documentsByUser.get(userId) || []).slice(0, count);
              return { docs: documents.map(({ id, data }) => ({ id, ref: { id, userId }, data: () => data })) };
            },
          }),
          };
          return messages;
        },
      }),
    }),
    batch: () => {
      const writes = [];
      return {
        set: (reference, data) => writes.push({ reference, data }),
        delete: (reference) => writes.push({ reference, delete: true }),
        commit: async () => {
          writes.forEach(({ reference, data, delete: shouldDelete }) => {
            const documents = documentsByUser.get(reference.userId) || [];
            if (shouldDelete) {
              documentsByUser.set(reference.userId, documents.filter(({ id }) => id !== reference.id));
            } else {
              documents.push({ id: reference.id, data });
              documentsByUser.set(reference.userId, documents);
            }
          });
        },
      };
    },
  };
  const app = createApp({
    db: Object.hasOwn(options, 'db') ? options.db : database,
    generateAnswer: options.generateAnswer || (async () => 'Use a soil test to guide nutrient decisions.'),
    logger: { error() {} },
  });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  servers.add(server);
  return { baseUrl: `http://127.0.0.1:${server.address().port}`, documentsByUser };
}

afterEach(async () => {
  await Promise.all([...servers].map((server) => new Promise((resolve) => server.close(resolve))));
  servers.clear();
});

test('health endpoint is available', async () => {
  const { baseUrl } = await startTestServer();
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('Gemini chat works when Firestore history is not configured', async () => {
  let receivedHistory;
  const { baseUrl } = await startTestServer({
    db: null,
    generateAnswer: async ({ history }) => {
      receivedHistory = history;
      return 'Check the soil moisture before irrigating.';
    },
  });

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'farmer_1', message: 'Should I irrigate today?', language: 'en' }),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.assistantMessage.text, 'Check the soil moisture before irrigating.');
  assert.equal(result.historySaved, false);
  assert.deepEqual(receivedHistory, []);
});

test('Gemini overload returns a useful retry message', async () => {
  const { baseUrl } = await startTestServer({
    generateAnswer: async () => {
      const error = new Error('Model is temporarily overloaded.');
      error.status = 503;
      throw error;
    },
  });
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'farmer_1', message: 'How do I prepare soil?', language: 'en' }),
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: 'Gemini is temporarily busy. Please wait a moment and try again.',
  });
});

test('chat replies and saves both messages to the farmer history', async () => {
  const { baseUrl } = await startTestServer({
    generateAnswer: async ({ history, message, language, systemInstruction }) => {
      assert.equal(history.length, 0);
      assert.equal(message, 'How do I improve soil?');
      assert.equal(language, 'ta');
      assert.match(systemInstruction, /தமிழில்/);
      return 'மண் பரிசோதனை செய்யுங்கள்.';
    },
  });
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'farmer_1', message: 'How do I improve soil?', language: 'ta' }),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.userMessage.text, 'How do I improve soil?');
  assert.equal(result.assistantMessage.text, 'மண் பரிசோதனை செய்யுங்கள்.');

  const historyResponse = await fetch(`${baseUrl}/api/chat/history?userId=farmer_1`);
  assert.equal(historyResponse.status, 200);
  const history = await historyResponse.json();
  assert.deepEqual(history.messages.map(({ role }) => role), ['user', 'assistant']);
  assert.deepEqual(history.messages.map(({ text }) => text), [
    'How do I improve soil?',
    'மண் பரிசோதனை செய்யுங்கள்.',
  ]);
});

test('clear chat history deletes saved turns', async () => {
  const { baseUrl } = await startTestServer();
  await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'farmer_1', message: 'I grow rice.', language: 'en' }),
  });

  const clearResponse = await fetch(`${baseUrl}/api/chat/history?userId=farmer_1`, { method: 'DELETE' });
  assert.equal(clearResponse.status, 200);
  assert.deepEqual(await clearResponse.json(), { deleted: 1 });

  const historyResponse = await fetch(`${baseUrl}/api/chat/history?userId=farmer_1`);
  assert.deepEqual((await historyResponse.json()).messages, []);
});

test('invalid input is rejected without calling Gemini', async () => {
  let generated = false;
  const { baseUrl } = await startTestServer({
    generateAnswer: async () => {
      generated = true;
      return 'unexpected';
    },
  });
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'ab', message: 'A valid question', language: 'en' }),
  });
  assert.equal(response.status, 400);
  assert.equal(generated, false);
});

test('later questions include the saved conversation context', async () => {
  const receivedHistory = [];
  const { baseUrl } = await startTestServer({
    generateAnswer: async ({ history }) => {
      receivedHistory.push(history);
      return 'Check the crop stage and local soil test.';
    },
  });
  const send = (message) => fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'farmer_1', message, language: 'en' }),
  });

  assert.equal((await send('I grow rice.')).status, 200);
  assert.equal((await send('What should I check?')).status, 200);
  assert.deepEqual(receivedHistory[1].map(({ role, text }) => ({ role, text })), [
    { role: 'user', text: 'I grow rice.' },
    { role: 'model', text: 'Check the crop stage and local soil test.' },
  ]);
});
