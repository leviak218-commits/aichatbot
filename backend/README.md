# Farmer assistant setup

## Requirements

- Node.js 20 or newer
- A Google Gemini API key
- Optional: a Firebase project with Firestore enabled and a service account for saved chat history

## Configure the API

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `GEMINI_API_KEY` from Google AI Studio. Keep this key in `backend/.env`; never add it to the Expo app or a `EXPO_PUBLIC_` variable. The default primary model is `gemini-3.8-flash`; `gemini-3.5-flash-lite` is used automatically if the primary model is temporarily overloaded. Both can be configured with `GEMINI_MODEL` and `GEMINI_FALLBACK_MODEL`.
3. To enable saved chat history, set `GOOGLE_CLOUD_PROJECT` and `GOOGLE_APPLICATION_CREDENTIALS` in `backend/.env`, then save a Firebase service-account key at the configured path. Keep the credentials file private. Without Firebase configuration, Gemini chat still works but conversation history is not saved.
4. Install and start the API:

   ```sh
   cd backend
   npm install
   npm start
   ```

The API listens on port 3000 by default. `GET /api/health` can be used to check that it is running.

For local development, start both the API and Expo together from the project root with `npm run start:dev`. The API reads `backend/.env`; Expo reads the root `.env`.

Android builds using a local `http://` API need to be rebuilt after app config changes; this project includes a config plugin that permits cleartext traffic for that development setup. Do not use this setting for production: deploy the API over HTTPS and set `EXPO_PUBLIC_API_URL` to that HTTPS address before creating the release APK.

## Use the assistant from phones outside your local network

The LAN URL in the root `.env` (for example `http://10.x.x.x:3000`) is private to your local network. It will not work for users on mobile data or other Wi-Fi networks, and your computer must stay on with the backend running. To share the app, deploy the API to a public HTTPS host. The root `render.yaml` is a Render Blueprint for this backend:

1. Push the project to a Git repository and create a Render Blueprint from that repository.
2. Set `GEMINI_API_KEY` as a secret in the Render service environment, then deploy. Firestore is optional; without it, Gemini responses work but chat history is not persisted.
3. Open `https://<your-service>.onrender.com/api/health` and confirm it returns `{"status":"ok"}`.
4. Set the root `.env` value `EXPO_PUBLIC_API_URL=https://<your-service>.onrender.com`, rebuild the APK, and distribute the new APK. The URL is compiled into the app; changing `.env` does not update an APK already installed.

The current app login is local-only and the API accepts a client-provided user ID. Do not treat the public deployment as production-safe for private conversations or unrestricted use until real authentication and server-side token verification are added; the Gemini API key itself must remain only in the backend environment.

## Connect the Expo app

1. Copy the project-root `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_API_URL` to the API's reachable address, for example `http://192.168.1.20:3000`. Use the computer's LAN address on a physical phone; `localhost` on a phone points to the phone itself. Use an HTTPS URL for a deployed API.
3. Restart the Expo development server after changing `.env`, then run `npm run start` from the project root.
4. Sign in, open **Profile**, and select **AI Farmer Assistant**.

For browser clients, set `CORS_ORIGIN` in `backend/.env` to the exact Expo web origin (for example `http://localhost:8081`). Native iOS and Android requests do not use browser CORS.

When Firestore is configured, chat turns are stored under `farmerChats/{sha256(userId)}/messages`. This app's existing sign-in is local to the device and does not provide a verified server identity. Before using this API for private or multi-user production data, add a real authentication provider and verify its ID tokens in the backend; a client-supplied username is not authentication.

## API tests

```sh
cd backend
npm test
```

The tests use mocked Gemini and Firestore services and do not require cloud credentials.
