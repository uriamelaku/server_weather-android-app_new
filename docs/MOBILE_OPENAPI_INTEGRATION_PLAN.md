# תוכנית עבודה מעודכנת - Mobile Integration לפי OpenAPI

## מטרה
ליישם אינטגרציה באפליקציית המובייל שתואמת 100% לשרת ולחוזה `api/OPENAPI.yaml`, עם מינימום שינויי UI ומינימום סיכון לרגרסיות.

## שלבים

1. לנעול בסיס API וקונפיג
- ב-`ApiConfig.kt`:
  - `BASE_URL_ANDROID_EMULATOR = "http://10.0.2.2:3000"`
  - `BASE_URL_LOCALHOST = "http://localhost:3000"` (בדיקות מקומיות בלבד)
- להגדיר endpoints קבועים:
  - `/api/history`
  - `/api/favorites`
  - `/api/favorites/{city}`
  - `/api/weather` (להשאיר קיים אם כבר עובד)

2. להגדיר DTOs לפי החוזה (ללא ניחושים)
- קובץ מומלץ: `HistoryFavoritesModels.kt`
- מודלים:
  - `HistoryItem`
  - `FavoriteItem`
  - `HistoryResponse(val history: List<HistoryItem>)`
  - `FavoritesResponse(val favorites: List<FavoriteItem>)`
  - `AddFavoriteRequest(val city: String, val country: String)`
  - `MessageResponse(val message: String)`
  - `ApiError(val error: String)`
- דגש: מעטפת תגובה היא `history` / `favorites` (לא `data`).

3. להרחיב את `ApiHelper.kt` עם פעולות תואמות חוזה
- `getHistoryWithAuth(token)` -> `GET /api/history`
- `clearHistoryWithAuth(token)` -> `DELETE /api/history`
- `getFavoritesWithAuth(token)` -> `GET /api/favorites`
- `addFavoriteWithAuth(token, city, country)` -> `POST /api/favorites`
- `removeFavoriteWithAuth(token, city)` -> `DELETE /api/favorites/{city}` עם `URLEncoder.encode(city, "UTF-8")`
- לכל קריאה מוגנת:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json` כשיש request body

4. חיבור `HomeActivity.kt` בצורה דקה בלבד
- History:
  - שליפת token
  - קריאה ל-`getHistoryWithAuth`
  - הצגת `history` ב-UI
- Clear History:
  - `clearHistoryWithAuth`
  - רענון UI
- Favorites:
  - `getFavoritesWithAuth`
- Add Favorite:
  - `addFavoriteWithAuth(city, country)`
- Remove Favorite:
  - `removeFavoriteWithAuth(city)`
- להשאיר את זרימת weather/search הקיימת ללא שינוי לוגי בשלב זה.

5. מדיניות טיפול שגיאות (לפי החוזה)
- לטפל מפורשות בקודים:
  - `400`, `401`, `404`, `409`, `500`
- לפרסר תמיד שגיאות בפורמט:
  - `{ "error": "..." }`
- ב-`401`:
  - לנקות token/session ולהחזיר למסך התחברות (לפי הדפוס הקיים באפליקציה)

6. בדיקות ממוקדות למניעת רגרסיות חוזה
- בדיקות deserialization:
  - `HistoryResponse` עם `history`
  - `FavoritesResponse` עם `favorites`
- בדיקות מיפוי endpoint + method:
  - `GET /api/history`
  - `DELETE /api/history`
  - `GET /api/favorites`
  - `POST /api/favorites`
  - `DELETE /api/favorites/{city-encoded}`
- בדיקת parsing לשגיאות `ApiError`.

7. שלב אופציונלי לאחר ייצוב
- לרכז גם weather networking דרך `ApiHelper` לאחידות, בלי לשנות behavior.

## החלטות שננעלו לפי השרת והחוזה
1. Favorites: List + Add + Remove בלבד (לא CRUD מלא).
2. History: Get + Clear All בלבד.
3. מעטפות תגובה: `history` / `favorites`.
4. Android Emulator base URL: `http://10.0.2.2:3000`.
5. כל `/api/*` דורש Bearer token.

## Definition of Done
- כל קריאות history/favorites עובדות עם token.
- DTOs תואמים למבנה JSON מהשרת.
- אין שימוש במעטפת `data` עבור history/favorites.
- כיסוי בדיקות בסיסי לקריאות ולפרסור.
- אין שבירת התנהגות קיימת של weather/search.
