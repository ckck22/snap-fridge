# 🍎 SnapFridge: Context-Aware AI Language Learning Platform

> **Transforming everyday groceries into personalized micro-learning opportunities using Computer Vision and Generative AI.**

**SnapFridge** is a full-stack mobile application that bridges the physical world and language education. Unlike static vocabulary apps, it utilizes **Google Cloud Vision** to identify real-world objects and **Google Gemini (LLM)** to generate context-aware sentences and translations in real-time.

It features a robust **On-demand Caching Architecture** to minimize API costs and a **Gamified Spaced Repetition System (SRS)** including a Survival Quiz mode to optimize learning retention.

---

## 🏗️ System Architecture

The core strength of this project is its **Hybrid AI Architecture** combined with a smart caching strategy.
```mermaid
graph LR
    User[Mobile App] -- "1. Photo & Lang Prefs" --> Server[Spring Boot Backend]
    Server -- "2. Image Analysis" --> Vision[Google Cloud Vision API]
    Vision -- "3. Raw Labels" --> Server
    
    subgraph "Intelligent Processing Engine"
    Server -- "4. Semantic Filtering" --> Gemini[Gemini LLM]
    Gemini -- "5. Extract Best Food Label" --> Server
    Server -- "6. Retrieve Context (Recent Items)" --> DB[(MySQL)]
    end
    
    subgraph "Cache Miss (New Item)"
    DB -. "Data Not Found" .-> Server
    Server -- "7. Prompt w/ Context" --> Gemini
    Gemini -- "8. Translation & Contextual Sentence" --> Server
    Server -- "9. Save Data & Image" --> DB
    end
    
    subgraph "Cache Hit (Existing Item)"
    DB -- "Found Data (Latency < 20ms)" --> Server
    end
    
    Server -- "10. JSON Response" --> User
```

---

## 🔑 Key Technical Features

### 1. 🧠 AI-Driven Logic

- **Visual Recognition**: Uses Google Cloud Vision API to detect objects from raw camera images.

- **Semantic Filtering**: Instead of relying on hardcoded blocklists, the system uses Gemini LLM to intelligently parse Vision API labels and select the most specific food ingredient (e.g., filtering out "Produce" to find "Apple").

- **Context-Aware Generation**: The system remembers items previously scanned (e.g., Milk). When a new item is scanned (e.g., Cookie), the LLM generates a sentence combining them (e.g., "I eat cookies with milk").

### 2. ⚡ Performance & Efficiency

- **On-demand Caching Strategy**: Implements a "Check-DB-First" logic.
  - **Cache Miss**: Calls the expensive LLM API only when a new word is encountered.
  - **Cache Hit**: Returns data immediately from MySQL for previously scanned items, ensuring low latency (~15ms).

- **User Content Hosting**: User-captured photos are saved locally on the server and served back to the app, creating a personalized inventory experience.

### 3. 🎮 Gamified Learning (Spaced Repetition)

- **Freshness System**: Items in the fridge have a "Freshness" state based on the Forgetting Curve:
  - 🌿 **FRESH**: Reviewed recently.
  - ⚠️ **SOON**: Needs review (3 days).
  - 💩 **ROTTEN**: Neglected (5+ days, flies appear in UI).

- **Survival Quiz Mode**: To restore a "Rotten" item, users must pass a dynamically generated 3-choice quiz. The backend randomly selects distractors from the user's inventory to create challenging questions. If users gets the answer, they will get XP.

- **Progression System (Level Up)**: As they accumulate XP, they **level up** their rank (e.g., "Dorm Student" → "Master Chef"), providing intrinsic motivation and a sense of achievement.

- **Analytics Dashboard**: Visualizes user progress with a Donut Chart (Fridge Health) and an XP Progression Bar (Dorm Student → Master Chef).

### 4. 🗣️ Interactive UX

- **Text-to-Speech (TTS)**: Integrated audio playback for both words and sentences using expo-speech.

- **Native Language Support**: Supports dual-language learning (e.g., Korean user learning English) by providing definitions in the user's native tongue.

---

## 🗂️ Database Schema

The database is normalized to handle multilingual data efficiently while tracking user learning progress independently.
```mermaid
erDiagram
    WORD {
        bigint word_id PK
        varchar label_en
        varchar name_ko "Native Definition"
        varchar image_path "User Photo"
    }

    TRANSLATION {
        bigint translation_id PK
        bigint word_id FK
        varchar language_code
        varchar translated_word
        varchar example_sentence
        varchar emoji
    }

    LEARNING_PROGRESS {
        bigint progress_id PK
        bigint word_id FK
        int proficiency_level "Lv 1-5"
        datetime last_reviewed_at "Freshness Logic"
        datetime next_review_date "SRS Algorithm"
    }

    WORD ||--o{ TRANSLATION : "1:N"
    WORD ||--|| LEARNING_PROGRESS : "1:1"
```

---

## 🛠️ Technology Stack

### Frontend (Mobile)
- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **Network**: Axios
- **UI Components**: react-native-safe-area-context, react-native-svg (Charts), Animated API
- **Features**: Expo Camera, Expo Speech (TTS)

### Backend (Server)
- **Framework**: Spring Boot 3.2.0
- **Language**: Java 17
- **Database**: MySQL (JPA/Hibernate)
- **Build Tool**: Gradle
- **Optimization**: JPQL Fetch Join
- **AI Clients**: Google Cloud Vision SDK, Spring REST Client

### AI & Cloud Services
- **Google Cloud Vision API**: Object detection.
- **Google Gemini API (1.5 Flash / Pro)**: Semantic filtering, translation, and natural language generation.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js & npm
- Java JDK 17
- MySQL Server
- Google Cloud Platform Account (with Vision API enabled)
- Google AI Studio API Key (for Gemini)

### 2. Database Setup
Create a local MySQL database and the necessary tables. (The application will auto-generate tables via JPA, but ensure the DB exists).
```sql
CREATE DATABASE my_fridge_db;
```

### 3. Backend Setup
Navigate to the backend directory:
```bash
cd backend
```

**Configuration**: Add your GCP Service Account Key (`gcp-key.json`) to `src/main/resources/`. Update `src/main/resources/application.properties`:
```properties
# MySQL Configuration
spring.datasource.url=jdbc:mysql://localhost:3306/my_fridge_db?serverTimezone=UTC&characterEncoding=UTF-8
spring.datasource.username=root
spring.datasource.password=YOUR_DB_PASSWORD
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.database-platform=org.hibernate.dialect.MySQL8Dialect

# Google Cloud Vision
spring.cloud.gcp.credentials.location=classpath:gcp-key.json

# Google Gemini
gemini.api.key=YOUR_GEMINI_API_KEY
gemini.api.url=https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent
```

Create the uploads directory and run:
```bash
mkdir uploads
./gradlew bootRun
```

### 4. Frontend Setup
Navigate to the frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Update the API URL in `app/(tabs)/index.tsx` AND `app/(tabs)/fridge.tsx`:
```javascript
// ⚠️ Replace with your computer's local IP address (e.g., 192.168.x.x)
// Do NOT use 'localhost' if testing on a real device.
const BACKEND_URL = 'http://YOUR_LOCAL_IP:8080/api/quiz/generate';
```

Run the app:
```bash
npx expo start
```

---

## 📱 Usage Flow

1. **Setup**: Choose your Native Language and Target Language (e.g., Korean -> English).

2. **Scan**: Take a photo of a food item. The app filters noise and identifies the ingredient.

3. **Learn**: View the flashcard with the translated word and a context-aware sentence.

4. **My Fridge**: Go to the "My Fridge" tab to see your inventory.

5. **Review**: Check items marked as ROTTEN (with flies 🪰). Tap to review and restore their freshness!

---

## 🔮 Future Improvements

- **Recipe Generation**: Use the collected inventory to generate actual cooking recipes via LLM.

- **Social Leaderboard**: Compete with friends based on "Freshness Score" and XP.

- **Nutritional Analysis**: Ask Gemini to provide nutritional facts along with language learning data.

---

## 📄 License

This project is licensed under the MIT License.
