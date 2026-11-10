# Along: share the ride

along: share the ride, a student ride-sharing web app.

## Configure the backend

Keep the existing `Backend/.env` and its MongoDB credentials. Add a private JWT signing secret and the frontend origin to that file:

```env
JWT_SECRET=<at least 32 random characters>
FRONTEND_ORIGIN=http://localhost:5173
```

Generate a secret locally with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Do not put `JWT_SECRET` or `MONGO_URL` in frontend files. `Backend/.env.example` contains placeholders only.

In one terminal:

```powershell
cd Backend
npm install
npm start
```

The API listens on `http://localhost:3002` after connecting to MongoDB.

## Run the frontend

In a second terminal:

```powershell
cd Frontend
npm install
npm run dev
```

Open http://localhost:5173. If Vite uses another port, set `FRONTEND_ORIGIN` in `Backend/.env` to that exact origin and restart the backend.

## Authentication API

- `POST /api/auth/signup` creates a passenger account and starts a session.
- `POST /api/auth/login` validates credentials and starts a session.
- `GET /api/auth/me` returns the current authenticated user.
- `PATCH /api/auth/role` validates and updates the account role (`passenger` or `driver`).
- `POST /api/auth/logout` clears the session cookie.
- `GET /api/auth/passenger/me` and `GET /api/auth/driver/me` demonstrate protected, role-specific backend routes.

Passwords are stored as bcrypt hashes. Sessions use an HttpOnly JWT cookie with an eight-hour lifetime. Ride posting, bookings, route matching, chat, and notifications are persisted in MongoDB; wallet and profile extras remain demonstration data.

Signup and login are limited to 10 attempts per IP per 15-minute window.

## Passenger ride requests

- `POST /api/rides/requests` creates a future ride request for the authenticated passenger.
- `GET /api/rides/requests/mine` lists that passenger's requests; `PATCH /api/rides/requests/:requestId/cancel` cancels an open request.
- `GET /api/rides/requests/open` lists open requests in a driver's service city.
- `POST /api/rides/requests/:requestId/decline` hides a request for that driver.
- `POST /api/rides/requests/:requestId/accept` accepts a request for one of the driver's rides, reserves seats, creates or links a booking, and notifies the passenger.

Chat endpoints are `GET /api/chat/conversations`, `GET /api/chat/:bookingId/messages`, and `POST /api/chat/:bookingId/messages`. Notifications are listed at `GET /api/notifications` and can be marked read at `PATCH /api/notifications/:notificationId/read` or `PATCH /api/notifications/read-all`.

API route matching uses the public OSRM driving service by default. Set `ROUTING_SERVICE_URL` in `Backend/.env` to use another compatible OSRM route endpoint; this setting does not change the browser map preview, which requests public OSRM directly. If API routing is unavailable, route matching reports unavailable results instead of substituting straight-line distance.

Set `ADMIN_EMAIL` in the backend environment (`Backend/.env` locally and the backend service environment on Render) to the normalized email of your existing registered account. On startup, the backend promotes that existing account without changing its password or creating a duplicate, and demotes any other legacy admin-role accounts. Startup fails if the setting is missing, invalid, or does not match an existing account. The same email check is enforced by admin API middleware; signup cannot claim the reserved address, and submitted roles are never trusted. For the ride assistant, set `AI_API_KEY` and optionally `AI_API_URL` and `AI_MODEL` in `Backend/.env`; the default provider is OpenAI-compatible chat completions using `gpt-4o-mini`. The key stays on the backend. Without it, the assistant returns a normal-search fallback. Requests are limited to 8 per authenticated user per 10 minutes, 1500 input characters, 300 output tokens, and a 10-second timeout.

## Checks

```powershell
cd Frontend
npm run build
cd ../Backend
$files = Get-ChildItem -Recurse -File -Filter '*.js'
foreach ($file in $files) { node --check $file.FullName; if ($LASTEXITCODE -ne 0) { throw "Syntax check failed: $($file.FullName)" } }
```
