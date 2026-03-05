# 📖 מדריך התנהגות השרת לאפליקציה

**מסמך זה מסביר בדיוק איך השרת עובד ואילו חוקים צריך לעמוד בהם כדי להשתמש בו נכון.**

---

## 🔑 1. Authentication - איך מחברים עם השרת

### הכלל הראשון: כל פנייה צריכה JWT Token

בכל בקשה ל-API (חוץ מ-/register ו-/login), **חובה** להוסיף header:

```
Authorization: Bearer <token>
```

### איפה מקבלים את ה-Token?

1. **בשלב ההתחברות** - GET `/login`
2. השרת מחזיר:
```json
{
  "message": "logged in",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65f4f8ec1a2b3c4d5e6f7a8b",
    "username": "demo"
  }
}
```

3. **שימור Token** - שמור את ה-token במקום בטוח (SharedPreferences, DataStore, וכו')
4. **שימוש ב-Token** - בקשה הבאה:

```kotlin
val token = sharedPreferences.getString("user_token", "")
val request = Request.Builder()
    .url("https://server-weather-android-app-new.onrender.com/api/history")
    .addHeader("Authorization", "Bearer $token")
    .build()
```

### מה קורה אם Token לא נכון?

- **Status 401** - Unauthorized
- **Response**: `{ "error": "Unauthorized" }`
- **מה לעשות**: מחק את ה-token והחזר למסך ההתחברות

---

## 📜 2. History - אחסון ההיסטוריה

### כלל #1: History יוצרת אוטומטית

**אתה לא חייב להוסיף לhistory ידנית!**

כשהאפליקציה קוראת מ-`/api/weather?city=London`, השרת **מוסיף אוטומטית** למסד הנתונים של המשתמש.

### כלל #2: GET /api/history - קבל את ההיסטוריה

**איך שולחים:**

```
GET https://server-weather-android-app-new.onrender.com/api/history
Header: Authorization: Bearer <token>
```

**מה מחזיר:**

```json
{
  "history": [
    {
      "city": "Tel Aviv",
      "country": "IL",
      "temp": 22.5,
      "feelsLike": 21.8,
      "humidity": 65,
      "windSpeed": 3.5,
      "description": "clear sky",
      "icon": "01d",
      "timestamp": 1709380800,
      "searchedAt": "2026-03-03T09:30:00.000Z"
    },
    {
      "city": "London",
      "country": "GB",
      "temp": 15.2,
      "feelsLike": 14.8,
      "humidity": 72,
      "windSpeed": 5.1,
      "description": "partly cloudy",
      "icon": "02d",
      "timestamp": 1709294400,
      "searchedAt": "2026-03-02T09:30:00.000Z"
    }
  ]
}
```

### כלל #3: DELETE /api/history - מחק את כל ההיסטוריה

**איך שולחים:**

```
DELETE https://server-weather-android-app-new.onrender.com/api/history
Header: Authorization: Bearer <token>
```

**מה מחזיר:**

```json
{
  "message": "History cleared"
}
```

**חשוב**: זה מוחק את **כל** ההיסטוריה של המשתמש. בדוק אם תרצה אישור מהמשתמש לפני זה.

### כלל #4: DELETE /api/history/:timestamp - מחק פריט בודד מההיסטוריה

**איך שולחים:**

```
DELETE https://server-weather-android-app-new.onrender.com/api/history/1709380800
Header: Authorization: Bearer <token>
```

**חשוב**: `timestamp` הוא מספר (Unix timestamp) שמזהה חיפוש ספציפי.

**מה מחזיר:**

```json
{
  "history": [
    {
      "city": "London",
      "country": "GB",
      "temp": 15.2,
      "feelsLike": 14.8,
      "humidity": 72,
      "windSpeed": 5.1,
      "description": "partly cloudy",
      "icon": "02d",
      "timestamp": 1709294400,
      "searchedAt": "2026-03-02T09:30:00.000Z"
    }
  ]
}
```

**Response Format**: מחזיר את ההיסטוריה המעודכנת (אחרי המחיקה).

**התנהגות:**
- מוחק רק את הרשומה עם אותו `timestamp`
- אם ה-`timestamp` לא קיים, מחזיר `404` עם `"History item not found"`
- אם ה-`timestamp` לא מספר תקין, מחזיר `400` עם `"Invalid timestamp"`

### כלל #5: Timestamps

- `timestamp` - Unix timestamp (seconds) - למצג תאריך/שעה
- `searchedAt` - ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.000Z`) - למצגון בUI

### Error Cases עבור History

| Status | Error | הסבר |
|--------|-------|------|
| 200 | - | הצליח |
| 401 | `"Unauthorized"` | Token חסר או לא תקין |
| 404 | `"User not found"` / `"History item not found"` | משתמש לא קיים או פריט היסטוריה לא נמצא |
| 500 | `"Internal server error"` | בעיה בשרת |

---

## ⭐ 3. Favorites - עיריות המועדפות

### כלל #1: GET /api/favorites - קבל את המועדפים

**איך שולחים:**

```
GET https://server-weather-android-app-new.onrender.com/api/favorites
Header: Authorization: Bearer <token>
```

**מה מחזיר:**

```json
{
  "favorites": [
    {
      "city": "London",
      "country": "GB",
      "addedAt": "2026-03-03T09:20:00.000Z"
    },
    {
      "city": "Paris",
      "country": "FR",
      "addedAt": "2026-03-03T08:15:00.000Z"
    }
  ]
}
```

### כלל #2: POST /api/favorites - הוסף עיר למועדפים

**איך שולחים:**

```
POST https://server-weather-android-app-new.onrender.com/api/favorites
Header: Authorization: Bearer <token>
Header: Content-Type: application/json

Body:
{
  "city": "Tokyo",
  "country": "JP"
}
```

**מה מחזיר (201 - Created):**

```json
{
  "message": "Added to favorites",
  "favorites": [
    {
      "city": "Tokyo",
      "country": "JP",
      "addedAt": "2026-03-03T10:00:00.000Z"
    }
  ]
}
```

### כלל #3: DELETE /api/favorites/{city} - הסר עיר מהמועדפים

**איך שולחים:**

```
DELETE https://server-weather-android-app-new.onrender.com/api/favorites/Tokyo
Header: Authorization: Bearer <token>
```

**חשוב: URL Encoding!**

אם שם העיר כולל מרחקים או תווים מיוחדים, צריך לקודד אותה:

```kotlin
val cityEncoded = URLEncoder.encode("Tel Aviv", "UTF-8")
// "Tel%20Aviv"
val url = "https://server-weather-android-app-new.onrender.com/api/favorites/$cityEncoded"
```

**מה מחזיר:**

```json
{
  "message": "Removed from favorites",
  "favorites": []
}
```

### כלל #4: DELETE /api/favorites - נקה את כל המועדפים

**איך שולחים:**

```
DELETE https://server-weather-android-app-new.onrender.com/api/favorites
Header: Authorization: Bearer <token>
```

**מה מחזיר:**

```json
{
  "favorites": []
}
```

**חשוב**: זה מוחק את **כל** המועדפים של המשתמש. מומלץ להציג אזהרה למשתמש לפני ביצוע הפעולה.

### Error Cases עבור Favorites

| Status | Error | הסבר |
|--------|-------|------|
| 200/201 | - | הצליח |
| 400 | `"City name is required"` | לא שלחת city |
| 400 | `"Country is required"` | לא שלחת country |
| 401 | `"Unauthorized"` | Token חסר או לא תקין |
| 404 | `"User not found"` | המשתמש לא קיים |
| 409 | `"City already in favorites"` | העיר כבר במועדפים |
| 500 | `"Internal server error"` | בעיה בשרת |

---

## 🎯 4. Validation Rules - החוקים של השרת

### History Rules

✅ **מה השרת עושה:**
- כל בקשה ל-`/api/weather?city=<city>` מוסיפה תיעוד להיסטוריה
- ניתן לקרוא את ההיסטוריה עם `GET /api/history`
- ניתן למחוק את כל ההיסטוריה עם `DELETE /api/history`
- ניתן למחוק פריט בודד מההיסטוריה עם `DELETE /api/history/{timestamp}`

❌ **מה השרת לא עושה:**
- לא תוכל לעדכן רשומה קיימת (אין endpoint לעדכון)

### Favorites Rules

✅ **מה מותר:**
- להוסיף עיר למועדפים (שרת בודק case-insensitive)
- לקבל את רשימת המועדפים
- למחוק עיר בודדת מהמועדפים
- למחוק את כל המועדפים בבת אחת
- להסיר עיר ספציפית

❌ **מה לא מותר:**
- להוסיף את אותה עיר פעמיים (תקבל 409 Conflict)
- להוסיף עיר ללא country code

### Validation בצד האפליקציה (User Experience)

**עדיף לבדוק לפני שולח:**

```kotlin
// בדיקה אם city ו-country לא ריקים
if (city.trim().isEmpty() || country.trim().isEmpty()) {
    showError("City and Country are required")
    return
}

// בדיקה אם עיר כבר במועדפים (optional, בשביל UX)
if (favorites.any { it.city.toLowerCase() == city.toLowerCase() }) {
    showError("City already in favorites")
    return
}

// אחרי זה שלח לשרת
```

---

## 🌐 5. Production URL vs Local Development

### Production (Render)

```kotlin
const val BASE_URL = "https://server-weather-android-app-new.onrender.com"
```

✅ **היתרונות:**
- זמין מכל מקום
- אותו שרת לכל המשתמשים
- עדכון אוטומטי כשיש שינויים

⚠️ **הנקודה המיוחדת - Cold Start:**
- הבקשה **הראשונה** יכולה לקחת **50+ שניות**
- בקשות הבאות: כמה שניות
- **פתרון**: הוסף Progress dialog + heuristic timeout של 60 שניות

### Local Development (Only for Testing)

```kotlin
const val BASE_URL = "http://10.0.2.2:3000"  // Android Emulator
// או
const val BASE_URL = "http://localhost:3000"  // Desktop/Web
```

---

## 📱 6. Implementation Checklist

### Step 1: Setup API Config

```kotlin
object ApiConfig {
    const val BASE_URL = "https://server-weather-android-app-new.onrender.com"
    const val ENDPOINT_HISTORY = "/api/history"
    const val ENDPOINT_FAVORITES = "/api/favorites"
}
```

### Step 2: Create Data Models

```kotlin
data class HistoryItem(
    val city: String,
    val country: String,
    val temp: Double,
    val feelsLike: Double,
    val humidity: Int,
    val windSpeed: Double,
    val description: String,
    val icon: String,
    val timestamp: Long,
    val searchedAt: String
)

data class HistoryResponse(val history: List<HistoryItem>)

data class FavoriteItem(
    val city: String,
    val country: String,
    val addedAt: String
)

data class FavoritesResponse(val favorites: List<FavoriteItem>)

data class AddFavoriteRequest(
    val city: String,
    val country: String
)

data class MessageResponse(val message: String)
data class ErrorResponse(val error: String)
```

### Step 3: Implement ApiHelper Methods

```kotlin
class ApiHelper {
    // GET History
    suspend fun getHistoryWithAuth(token: String): Result<HistoryResponse> {
        return try {
            val response = httpClient.get("${BASE_URL}${ENDPOINT_HISTORY}") {
                headers {
                    append("Authorization", "Bearer $token")
                }
            }
            Result.success(response.body<HistoryResponse>())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // DELETE History
    suspend fun clearHistoryWithAuth(token: String): Result<MessageResponse> {
        return try {
            val response = httpClient.delete("${BASE_URL}${ENDPOINT_HISTORY}") {
                headers {
                    append("Authorization", "Bearer $token")
                }
            }
            Result.success(response.body<MessageResponse>())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // GET Favorites
    suspend fun getFavoritesWithAuth(token: String): Result<FavoritesResponse> {
        return try {
            val response = httpClient.get("${BASE_URL}${ENDPOINT_FAVORITES}") {
                headers {
                    append("Authorization", "Bearer $token")
                }
            }
            Result.success(response.body<FavoritesResponse>())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // POST Favorite
    suspend fun addFavoriteWithAuth(
        token: String,
        city: String,
        country: String
    ): Result<FavoritesResponse> {
        return try {
            val body = AddFavoriteRequest(city, country)
            val response = httpClient.post("${BASE_URL}${ENDPOINT_FAVORITES}") {
                headers {
                    append("Authorization", "Bearer $token")
                    append("Content-Type", "application/json")
                }
                setBody(body)
            }
            Result.success(response.body<FavoritesResponse>())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // DELETE Favorite
    suspend fun removeFavoriteWithAuth(
        token: String,
        city: String
    ): Result<FavoritesResponse> {
        return try {
            val cityEncoded = URLEncoder.encode(city, "UTF-8")
            val response = httpClient.delete(
                "${BASE_URL}${ENDPOINT_FAVORITES}/$cityEncoded"
            ) {
                headers {
                    append("Authorization", "Bearer $token")
                }
            }
            Result.success(response.body<FavoritesResponse>())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

### Step 4: Usage in Activity

```kotlin
class HomeActivity : AppCompatActivity() {
    
    fun loadHistory() {
        val token = getStoredToken()
        viewModelScope.launch {
            when (val result = apiHelper.getHistoryWithAuth(token)) {
                is Result.Success -> {
                    updateHistoryUI(result.data.history)
                }
                is Result.Failure -> {
                    if (result.exception.message?.contains("401") == true) {
                        // Token expired, go to login
                        navigateToLogin()
                    } else {
                        showError("Failed to load history")
                    }
                }
            }
        }
    }
    
    fun clearHistory() {
        val token = getStoredToken()
        viewModelScope.launch {
            when (val result = apiHelper.clearHistoryWithAuth(token)) {
                is Result.Success -> {
                    showMessage("History cleared")
                    updateHistoryUI(emptyList())
                }
                is Result.Failure -> {
                    showError("Failed to clear history")
                }
            }
        }
    }
    
    fun loadFavorites() {
        val token = getStoredToken()
        viewModelScope.launch {
            when (val result = apiHelper.getFavoritesWithAuth(token)) {
                is Result.Success -> {
                    updateFavoritesUI(result.data.favorites)
                }
                is Result.Failure -> {
                    showError("Failed to load favorites")
                }
            }
        }
    }
    
    fun addFavorite(city: String, country: String) {
        val token = getStoredToken()
        viewModelScope.launch {
            when (val result = apiHelper.addFavoriteWithAuth(token, city, country)) {
                is Result.Success -> {
                    showMessage("Added to favorites")
                    updateFavoritesUI(result.data.favorites)
                }
                is Result.Failure -> {
                    showError("Failed to add favorite")
                }
            }
        }
    }
    
    fun removeFavorite(city: String) {
        val token = getStoredToken()
        viewModelScope.launch {
            when (val result = apiHelper.removeFavoriteWithAuth(token, city)) {
                is Result.Success -> {
                    showMessage("Removed from favorites")
                    updateFavoritesUI(result.data.favorites)
                }
                is Result.Failure -> {
                    showError("Failed to remove favorite")
                }
            }
        }
    }
}
```

---

## 🚨 7. Common Mistakes and How to Avoid Them

### ❌ Mistake 1: Forgetting the Bearer Token

**Wrong:**
```kotlin
val response = httpClient.get("${BASE_URL}/api/history")
```

**Correct:**
```kotlin
val response = httpClient.get("${BASE_URL}/api/history") {
    headers {
        append("Authorization", "Bearer $token")
    }
}
```

### ❌ Mistake 2: Not URL Encoding the City Name

**Wrong:**
```kotlin
val url = "${BASE_URL}/api/favorites/Tel Aviv"  // Will fail!
```

**Correct:**
```kotlin
val cityEncoded = URLEncoder.encode("Tel Aviv", "UTF-8")
val url = "${BASE_URL}/api/favorites/$cityEncoded"
```

### ❌ Mistake 3: Expected `data` wrapper (old pattern)

**Wrong:**
```kotlin
val history = response.data.history  // ❌ No "data" wrapper
```

**Correct:**
```kotlin
val history = response.history  // ✅ Direct access
```

### ❌ Mistake 4: Not Handling Token Expiration

**When you get 401 Unauthorized:**

```kotlin
if (response.status == 401) {
    clearStoredToken()
    navigateToLogin()
}
```

### ❌ Mistake 5: Not Waiting for Cold Start

**Add a timeout for first request:**

```kotlin
val timeout = try {
    httpClient.get(url) {
        timeout {
            requestTimeoutMillis = 60_000  // 60 seconds for cold start
        }
    }
} catch (e: Exception) {
    showError("Server is starting up, please try again")
}
```

---

## 🧪 8. Testing Endpoints Manually

### Using Postman

1. **GET History:**
```
URL: https://server-weather-android-app-new.onrender.com/api/history
Method: GET
Header: Authorization: Bearer <your_token>
```

2. **DELETE History Item:**
```
URL: https://server-weather-android-app-new.onrender.com/api/history/1709380800
Method: DELETE
Header: Authorization: Bearer <your_token>
```

3. **ADD Favorite:**
```
URL: https://server-weather-android-app-new.onrender.com/api/favorites
Method: POST
Header: Authorization: Bearer <your_token>
Body (JSON):
{
  "city": "Berlin",
  "country": "DE"
}
```

4. **DELETE Favorite:**
```
URL: https://server-weather-android-app-new.onrender.com/api/favorites/Berlin
Method: DELETE
Header: Authorization: Bearer <your_token>
```

5. **CLEAR All Favorites:**
```
URL: https://server-weather-android-app-new.onrender.com/api/favorites
Method: DELETE
Header: Authorization: Bearer <your_token>
```

---

## 📋 Summary - The Rules

| יעד | Method | URL | דורש Token | Body | תגובה |
|-----|--------|-----|-----------|------|-------|
| Get History | GET | `/api/history` | ✅ | - | `{history: []}` |
| Clear History | DELETE | `/api/history` | ✅ | - | `{message: "..."}` |
| Remove History Item | DELETE | `/api/history/{timestamp}` | ✅ | - | `{history: []}` |
| Get Favorites | GET | `/api/favorites` | ✅ | - | `{favorites: []}` |
| Add Favorite | POST | `/api/favorites` | ✅ | `{city, country}` | `{message: "...", favorites: []}` |
| Clear All Favorites | DELETE | `/api/favorites` | ✅ | - | `{favorites: []}` |
| Remove Favorite | DELETE | `/api/favorites/{city}` | ✅ | - | `{message: "...", favorites: []}` |

---

**עדכון אחרון**: 4 במרץ 2026  
**סטטוס**: ✅ קיים וממוקד
