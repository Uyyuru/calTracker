# Calorie Tracker API

Express + MongoDB backend for the Personal Calorie Tracker. The web app should talk to this API only.

## Setup

1. Install [MongoDB](https://www.mongodb.com/) and keep it running locally.
2. From `backend`:

```bash
npm install
```

3. Copy `.env` values. Required:

- `MONGO_URI` — e.g. `mongodb://127.0.0.1:27017/calorieTracker`
- `JWT_SECRET` — long random string
- `PORT` — defaults to `5000`

Required for image extract:

- `GEMINI_API_KEY` — from Google AI Studio
- `GEMINI_MODEL` — e.g. `gemini-2.5-flash`

Required for image and PDF storage:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_URL` — `cloudinary://key:secret@cloud_name`

Optional:

- `FRONTEND_ORIGIN` — defaults to `http://localhost:5173`

4. Start:

```bash
npm start
```

Dev reload: `npm run dev`. Health check: `GET http://localhost:5000/health`.

## Auth

All routes except `/health`, `POST /api/auth/register`, and `POST /api/auth/login` need:

`Authorization: Bearer <token>`

Password rules come from `validator.isStrongPassword` (length 8+, mixed case, number, symbol).

## Main endpoints

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/register` | `{ username, email, password }` |
| POST | `/api/auth/login` | `{ email, password }` |
| GET | `/api/auth/me` | Current user |
| GET/PUT | `/api/goals` | One goals document per user (upsert) |
| POST | `/api/meals` | Food entry |
| GET | `/api/meals` | `page`, `limit`, `from`, `to`, `mealType` |
| GET/PATCH/DELETE | `/api/meals/:id` | Owner only |
| GET | `/api/reports/weekly` | Daily calorie trend |
| GET | `/api/reports/macros` | `groupBy=day\|week` |
| GET | `/api/reports/micros` | Micronutrient totals |
| GET | `/api/reports/goals-vs-actual` | Target vs intake for range |
| POST | `/api/extract/image` | multipart field `image` (JPEG, PNG, WebP, 8 MB). Returns `{ suggestion, file }`. Does not save the meal |
| POST | `/api/extract/pdf` | multipart field `file` (PDF, 12 MB). Returns `{ entries, file }` and stores the PDF on an import job |
| POST | `/api/extract/discard` | `{ publicId, resourceType }` removes an unsaved image |
| GET | `/api/imports` | Saved PDF import jobs, with a signed `secureUrl` |

List APIs return `{ items, page, limit, total, totalPages }`.

Date filters use `consumedAt`. Date-only `to` includes the whole day.

## Assumptions

- One food-entry document per item (not a nested day/meal array).
- Meal types: `breakfast`, `lunch`, `dinner`, `snack`.
- Units: `g`, `ml`, `serving`, `piece`.
- Micros are optional. A missing value is stored as `null` and is not treated as zero. A stored `0` is a real measurement.
- Reports are computed from meals + current goals (no summary collection).
- Image extract uploads the photo, then pre-fills JSON. Save with `POST /api/meals`, `source: "ai_photo"`, and the returned `imagePublicId`.
- PDF extract uploads the file, stores it on an import job, and returns rows. Save each row with `POST /api/meals` and `source: "pdf_import"`.
- Stored files use Cloudinary authenticated delivery. Responses include a signed URL that expires after one hour. The `publicId` is the permanent id.
- Login is email + password. Username is not unique.
