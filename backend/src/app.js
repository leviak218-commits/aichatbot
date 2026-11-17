import { createHash, randomUUID } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

const MAX_MESSAGE_LENGTH = 2000;
const HISTORY_TURN_LIMIT = 50;
const CONTEXT_TURN_LIMIT = 6;
let lastTurnTimestamp = 0;

const systemInstructions = {
  en: 'You are a practical, careful farming assistant for farmers in India. Answer in clear English. Help with crops, seeds, fertilizers, soil, plant diseases, irrigation, and farming methods. Ask a concise follow-up when key details such as crop, growth stage, symptoms, soil, or location are missing. Give general guidance, explain uncertainty, and do not claim a definitive diagnosis. Never invent pesticide doses or override product labels; recommend local agricultural extension advice and soil testing for field-specific decisions. Keep advice actionable and easy to understand.',
  ta: 'நீங்கள் இந்திய விவசாயிகளுக்கு நடைமுறை மற்றும் கவனமான விவசாய உதவியாளர். தெளிவான தமிழில் பதிலளிக்கவும். பயிர்கள், விதைகள், உரங்கள், மண், தாவர நோய்கள், பாசனம் மற்றும் விவசாய முறைகள் குறித்து உதவவும். பயிர், வளர்ச்சி நிலை, அறிகுறிகள், மண் அல்லது இடம் போன்ற முக்கிய விவரங்கள் இல்லையெனில் சுருக்கமாகக் கேளுங்கள். பொதுவான வழிகாட்டுதலை வழங்கி, உறுதியின்மையை விளக்கவும்; உறுதியான நோயறிதல் எனக் கூற வேண்டாம். பூச்சிக்கொல்லி அளவுகளை ஊகிக்கவோ தயாரிப்பு லேபிளை மீறவோ வேண்டாம்; வயலுக்கேற்ற முடிவுகளுக்கு உள்ளூர் வேளாண் விரிவாக்க ஆலோசனையையும் மண் பரிசோதனையையும் பரிந்துரைக்கவும். நடைமுறைப்படியான எளிய ஆலோசனைகளை வழங்கவும்.',
};

function messagesFromTurnDocument(document) {
  const data = document.data();
  const timestamp = data.createdAt instanceof Date
    ? data.createdAt.toISOString()
    : data.createdAt?.toDate
      ? data.createdAt.toDate().toISOString()
      : data.createdAt || null;
  return [
    { id: `${document.id}-user`, role: 'user', text: data.userText, createdAt: timestamp },
    { id: `${document.id}-assistant`, role: 'assistant', text: data.assistantText, createdAt: timestamp },
  ];
}

function parseUserId(value) {
  return typeof value === 'string'
    && value.length >= 3
    && value.length <= 128
    && value.trim() === value
    && !/[\u0000-\u001f\u007f]/.test(value)
    ? value
    : null;
}

function getUserMessages(db, userId) {
  const documentId = createHash('sha256').update(userId).digest('hex');
  return db.collection('farmerChats').doc(documentId).collection('messages');
}

function nextTurnTimestamp() {
  lastTurnTimestamp = Math.max(Date.now(), lastTurnTimestamp + 1);
  return new Date(lastTurnTimestamp);
}

function responseError(res, status, message) {
  return res.status(status).json({ error: message });
}

export function createApp({ db, generateAnswer, logger = console }) {
  const app = express();
  app.disable('x-powered-by');

  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin is not allowed by CORS.'));
    },
  }));
  app.use(express.json({ limit: '16kb' }));
  app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.get('/api/chat/history', async (req, res) => {
    const userId = parseUserId(req.query.userId);
    if (!userId) return responseError(res, 400, 'A valid userId is required.');
    if (!db) return res.json({ messages: [], historyAvailable: false });

    try {
      const snapshot = await getUserMessages(db, userId)
        .orderBy('createdAt', 'desc').limit(HISTORY_TURN_LIMIT).get();
      const messages = snapshot.docs.slice().reverse().flatMap(messagesFromTurnDocument);
      return res.json({ messages, historyAvailable: true });
    } catch (error) {
      logger.error('Could not load farmer chat history:', error);
      return res.json({ messages: [], historyAvailable: false });
    }
  });

  app.delete('/api/chat/history', async (req, res) => {
    const userId = parseUserId(req.query.userId);
    if (!userId) return responseError(res, 400, 'A valid userId is required.');
    if (!db) return res.json({ deleted: 0 });

    try {
      const messages = getUserMessages(db, userId);
      let deleted = 0;
      while (true) {
        const snapshot = await messages.limit(400).get();
        if (!snapshot.docs.length) break;
        const batch = db.batch();
        snapshot.docs.forEach((document) => batch.delete(document.ref));
        await batch.commit();
        deleted += snapshot.docs.length;
        if (snapshot.docs.length < 400) break;
      }
      return res.json({ deleted });
    } catch (error) {
      logger.error('Could not clear farmer chat history:', error);
      return responseError(res, 503, 'Chat history could not be cleared. Please try again.');
    }
  });

  app.post('/api/chat', async (req, res) => {
    const userId = parseUserId(req.body?.userId);
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const language = req.body?.language;
    if (!userId) return responseError(res, 400, 'A valid userId is required.');
    if (!message || message.length > MAX_MESSAGE_LENGTH) {
      return responseError(res, 400, `Message must contain 1 to ${MAX_MESSAGE_LENGTH} characters.`);
    }
    if (!Object.hasOwn(systemInstructions, language)) {
      return responseError(res, 400, 'Language must be en or ta.');
    }

    const messages = db ? getUserMessages(db, userId) : null;
    let history = [];
    if (messages) {
      try {
        const snapshot = await messages.orderBy('createdAt', 'desc').limit(CONTEXT_TURN_LIMIT).get();
        history = snapshot.docs.slice().reverse().flatMap(messagesFromTurnDocument)
          .map(({ role, text }) => ({ role: role === 'assistant' ? 'model' : 'user', text }));
      } catch (error) {
        logger.error('Could not load farmer chat context:', error);
      }
    }

    let answer;
    try {
      answer = await generateAnswer({ history, message, language, systemInstruction: systemInstructions[language] });
      if (typeof answer !== 'string' || !answer.trim()) throw new Error('Gemini returned an empty response.');
      answer = answer.trim();
    } catch (error) {
      logger.error('Gemini response generation failed:', error);
      if (error?.status === 429 || error?.status === 503) {
        return responseError(res, 503, 'Gemini is temporarily busy. Please wait a moment and try again.');
      }
      if (error?.status === 400 || error?.status === 401 || error?.status === 403) {
        return responseError(res, 503, 'Gemini rejected the request. Check GEMINI_API_KEY and GEMINI_MODEL in backend/.env.');
      }
      return responseError(res, 502, 'The AI assistant could not respond right now. Please try again.');
    }

    let historySaved = false;
    const turnReference = messages?.doc();
    const turnId = turnReference?.id || randomUUID();
    const createdAt = nextTurnTimestamp();
    const userMessage = {
      id: `${turnId}-user`,
      role: 'user',
      text: message,
      createdAt: createdAt.toISOString(),
    };
    const assistantMessage = {
      id: `${turnId}-assistant`,
      role: 'assistant',
      text: answer,
      createdAt: createdAt.toISOString(),
    };
    try {
      if (!messages) throw new Error('Firestore is not configured.');
      const batch = db.batch();
      batch.set(turnReference, {
        userText: userMessage.text,
        assistantText: assistantMessage.text,
        createdAt,
      });
      await batch.commit();
      historySaved = true;
    } catch (error) {
      logger.error('Could not save farmer chat history:', error);
    }
    return res.json({ userMessage, assistantMessage, historySaved });
  });

  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.too.large') {
      return responseError(res, 413, 'Request is too large.');
    }
    logger.error('Unhandled API error:', error);
    return responseError(res, 500, 'An unexpected server error occurred.');
  });

  return app;
}
