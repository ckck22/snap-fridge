import { useState, useRef } from 'react';
import { StyleSheet, Text, View, Button, Image, ActivityIndicator, ScrollView, SafeAreaView, TouchableOpacity, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions, CameraCapturedPicture } from 'expo-camera';
import axios from 'axios';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';

// --- Data: Supported Languages ---
const LANGUAGES = [
  { code: 'en', label: '🇺🇸 English' },
  { code: 'ko', label: '🇰🇷 Korean' },
  { code: 'es', label: '🇪🇸 Spanish' },
  { code: 'ja', label: '🇯🇵 Japanese' },
  { code: 'zh', label: '🇨🇳 Chinese' },
  { code: 'fr', label: '🇫🇷 French' },
  { code: 'de', label: '🇩🇪 German' },
  { code: 'it', label: '🇮🇹 Italian' },
  { code: 'pt', label: '🇧🇷 Portuguese' },
  { code: 'ru', label: '🇷🇺 Russian' },
];

// ✨ [수정됨] 백엔드 DTO와 일치하는 인터페이스
interface QuizItem {
  labelEn: string;
  frontWord: string;    // Native (앞면)
  backWord: string;     // Target (뒷면)
  backSentence: string; // Sentence
  emoji: string;
  targetLangCode: string;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 2;

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState<QuizItem[] | null>(null);
  
  const [nativeLang, setNativeLang] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  // ⚠️ IP 주소 확인 필수!
  const API_URL = 'http://192.168.86.237:8080/api/quiz/generate'; 

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Button onPress={requestPermission} title="Grant Permission" />
      </SafeAreaView>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const data = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: false });
        setPhoto(data);
      } catch (error) { console.error(error); }
    }
  };

  const generateQuiz = async () => {
    if (!photo || !targetLang || !nativeLang) return;
    setLoading(true);
    
    const formData = new FormData();
    formData.append('image', { uri: photo.uri, name: 'fridge.jpg', type: 'image/jpeg' } as any);
    formData.append('targetLang', targetLang);
    formData.append('nativeLang', nativeLang);

    try {
      const response = await axios.post(API_URL, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      console.log("📦 Data:", response.data);
      setQuizData(response.data);
      setIsFlipped(false);
    } catch (err: any) {
      alert("Error: " + (err.response?.data || err.message));
    } finally {
      setLoading(false);
    }
  };

  const playAudio = (text: string, lang: string) => {
    const map: {[key:string]: string} = { 'ko': 'ko-KR', 'en': 'en-US', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE', 'ja': 'ja-JP' };
    Speech.speak(text, { language: map[lang] || 'en-US' });
  };

  const reset = () => { setPhoto(null); setQuizData(null); };
  const fullReset = () => { setTargetLang(null); setNativeLang(null); reset(); };

  const renderLanguageButtons = (onPress: (code: string) => void) => (
    <View style={styles.grid}>
      {LANGUAGES.map((lang) => (
        <TouchableOpacity key={lang.code} style={styles.gridBtn} onPress={() => onPress(lang.code)}>
          <Text style={styles.gridBtnText}>{lang.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Step 1
  if (!nativeLang) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollCenter}>
          <Text style={styles.header}>Step 1</Text>
          <Text style={styles.subHeader}>What is your Native Language?</Text>
          {renderLanguageButtons(setNativeLang)}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 2
  if (!targetLang) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollCenter}>
          <View style={styles.backBtnContainer}>
             <TouchableOpacity onPress={() => setNativeLang(null)}><Ionicons name="arrow-back" size={28} color="#333" /></TouchableOpacity>
          </View>
          <Text style={styles.header}>Step 2</Text>
          <Text style={styles.subHeader}>What do you want to learn?</Text>
          {renderLanguageButtons(setTargetLang)}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 4: Result (Flashcard)
  if (quizData && quizData.length > 0) {
    const item = quizData[0]; // ✨ map() 대신 첫 번째 아이템 사용

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.cardContainer}>
          <Text style={styles.header}>✨ Flashcard ✨</Text>
          
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => setIsFlipped(!isFlipped)} 
            style={[styles.flashcard, isFlipped ? styles.cardBack : styles.cardFront]}
          >
            {!isFlipped ? (
              // [FRONT] Native Language
              <View style={styles.cardContent}>
                {photo && <Image source={{ uri: photo.uri }} style={styles.cardImage} />}
                {/* ✨ 이모지 + 모국어 단어 */}
                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text style={styles.frontText}>{item.frontWord}</Text>
                <Text style={styles.tapHint}>👆 Tap to Flip</Text>
              </View>
            ) : (
              // [BACK] Target Language
              <View style={styles.cardContent}>
                <Text style={styles.backTitle}>{targetLang.toUpperCase()}</Text>
                {/* ✨ 학습 언어 단어 */}
                <Text style={styles.backWord}>{item.backWord}</Text>
                <TouchableOpacity style={styles.audioBtn} onPress={() => playAudio(item.backWord, item.targetLangCode)}>
                   <Text>🔊 Listen Word</Text>
                </TouchableOpacity>

                <View style={styles.divider}/>
                
                {/* ✨ 예문 */}
                <Text style={styles.sentence}>"{item.backSentence}"</Text>
                <TouchableOpacity style={styles.audioBtn} onPress={() => playAudio(item.backSentence, item.targetLangCode)}>
                   <Text>🔊 Listen Sentence</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>

          <Button title="Scan Another Item" onPress={reset} />
          <Button title="Change Languages" onPress={fullReset} color="gray" />
        </View>
      </SafeAreaView>
    );
  }

  // Step 3: Camera
  if (photo) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photo.uri }} style={styles.preview} />
        <View style={styles.overlay}>
          {loading ? <ActivityIndicator size="large" color="#fff" /> : (
            <View style={styles.row}>
              <Button title="Retake" onPress={() => setPhoto(null)} color="#ff4444" />
              <View style={{width:20}}/>
              <Button title={`Generate (${nativeLang?.toUpperCase()} -> ${targetLang?.toUpperCase()})`} onPress={generateQuiz} color="#44ff44" />
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} />
      <View style={styles.cameraControls}>
        <SafeAreaView style={styles.topBar}>
           <Button title="Back" onPress={() => setTargetLang(null)} color="white" />
        </SafeAreaView>
        <TouchableOpacity style={styles.snapBtn} onPress={takePicture}>
          <View style={styles.innerSnap} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scrollCenter: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  subHeader: { fontSize: 16, color: '#666', marginBottom: 20 },
  emoji: { fontSize: 50, marginBottom: 10 },
  backBtnContainer: { alignSelf: 'flex-start', marginLeft: 20, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%' },
  gridBtn: { width: '42%', backgroundColor: 'white', paddingVertical: 15, margin: 8, borderRadius: 15, alignItems: 'center', elevation: 2 },
  gridBtnText: { fontSize: 16, fontWeight: '600', color: '#333' },
  preview: { flex: 1 },
  overlay: { position: 'absolute', bottom: 50, width: '100%', alignItems: 'center' },
  row: { flexDirection: 'row' },
  cameraControls: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 50 },
  topBar: { position: 'absolute', top: 20, left: 20 },
  snapBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center' },
  innerSnap: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'white' },
  
  cardContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flashcard: { width: width * 0.85, height: width * 1.1, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 10, marginBottom: 30 },
  cardFront: { backgroundColor: '#ffffff' },
  cardBack: { backgroundColor: '#e8eaf6' },
  cardContent: { alignItems: 'center', padding: 20, width: '100%' },
  cardImage: { width: 200, height: 200, borderRadius: 15, marginBottom: 10 },
  frontText: { fontSize: 40, fontWeight: 'bold', color: '#333' },
  tapHint: { marginTop: 20, color: '#888', fontSize: 14 },
  backTitle: { fontSize: 18, color: '#6200ee', fontWeight: 'bold', marginBottom: 10 },
  backWord: { fontSize: 40, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  sentence: { fontSize: 22, fontStyle: 'italic', textAlign: 'center', color: '#555', marginBottom: 15, marginTop: 15 },
  divider: { height: 1, width: '80%', backgroundColor: '#ccc', marginVertical: 10 },
  audioBtn: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#6200ee', marginVertical: 5 },
});