import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createApp } from './app.js';
import { createGeminiAnswerGenerator } from './gemini.js';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is required. Add it to backend/.env before starting the API.');
}

let firestore;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT) {
  const firebaseApp = initializeApp({
    credential: applicationDefault(),
    ...(process.env.GOOGLE_CLOUD_PROJECT && { projectId: process.env.GOOGLE_CLOUD_PROJECT }),
  });
  firestore = getFirestore(firebaseApp);
}
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';

const app = createApp({
  db: firestore,
  generateAnswer: createGeminiAnswerGenerator({ client: gemini, model, fallbackModel }),
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Farmer assistant API listening on port ${port}.`);
});
