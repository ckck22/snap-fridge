import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, Button, Image, ActivityIndicator, ScrollView, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // ✨ Safe Area 적용
import { CameraView, useCameraPermissions, CameraCapturedPicture } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient'; // ✨ 그라데이션 필수
import axios from 'axios';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';

// --- Data ---
const LANGUAGES = [
  { code: 'en', label: '🇺🇸 English' },
  { code: 'ko', label: '🇰🇷 Korean' },
  { code: 'es', label: '🇪🇸 Spanish' },
  { code: 'fr', label: '🇫🇷 French' },
  { code: 'de', label: '🇩🇪 German' },
  { code: 'ja', label: '🇯🇵 Japanese' },
  { code: 'zh', label: '🇨🇳 Chinese' },
  { code: 'ru', label: '🇷🇺 Russian' },
  { code: 'it', label: '🇮🇹 Italian' },
  { code: 'pt', label: '🇧🇷 Portuguese' },
];

interface WordBankItem {
  wordId: number;
  labelEn: string;
  nativeDefinition: string;
  proficiencyLevel: number;
  needsReview: boolean;
  languageCode?: string;
  translatedWord?: string;
  exampleSentence?: string;
  emoji?: string;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

export default function App() {
  // Permissions & Refs
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // App State
  const [showSplash, setShowSplash] = useState(true);
  const [isReadyToSnap, setIsReadyToSnap] = useState(false);

  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState<any[] | null>(null);

  const [nativeLang, setNativeLang] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState<string | null>(null);

  const [isFlipped, setIsFlipped] = useState(false);

  // Animation Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  // ⚠️ IP Address (본인 IP로 변경)
  const API_URL = 'http://192.168.86.248:8080/api/quiz/generate';

  // Splash Screen Logic
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 3, useNativeDriver: true })
    ]).start();

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50 }}>We need camera permission</Text>
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
      setQuizData(response.data);
      setIsFlipped(false);
    } catch (err: any) {
      alert("Error: " + (err.response?.data || err.message));
    } finally {
      setLoading(false);
    }
  };

  const playAudio = (text: string, lang: string) => {
    const map: { [key: string]: string } = { 'ko': 'ko-KR', 'en': 'en-US', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE' };
    Speech.speak(text, { language: map[lang] || 'en-US' });
  };

  const reset = () => { setPhoto(null); setQuizData(null); };
  const fullReset = () => { setTargetLang(null); setNativeLang(null); setIsReadyToSnap(false); reset(); };

  // --- ✨ 0. Splash Screen ---
  if (showSplash) {
    return (
      <LinearGradient colors={['#6200EE', '#8E2DE2']} style={styles.splashContainer}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: logoScale }], alignItems: 'center' }}>
          <Text style={styles.splashEmoji}>🍎</Text>
          <Text style={styles.splashTitle}>SnapFridge</Text>
          <Text style={styles.splashSubtitle}>Master languages with your groceries</Text>
        </Animated.View>
      </LinearGradient>
    );
  }

  // --- ✨ 1. Native Language Selection (UI 통일) ---
  if (!nativeLang) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#6200EE', '#8E2DE2']} style={styles.headerGradient}>
          <SafeAreaView edges={['top']} style={styles.safeHeader}>
            <Text style={styles.whiteEmoji}>👋</Text>
            <Text style={styles.whiteTitle}>Step 1</Text>
            <Text style={styles.whiteSubtitle}>What language do you speak?</Text>
          </SafeAreaView>
        </LinearGradient>
        <ScrollView contentContainerStyle={styles.scrollBody}>
          <View style={styles.grid}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity key={lang.code} style={styles.styledGridBtn} onPress={() => setNativeLang(lang.code)}>
                <Text style={styles.gridBtnText}>{lang.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // --- ✨ 2. Target Language Selection (UI 통일) ---
  if (!targetLang) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#6200EE', '#8E2DE2']} style={styles.headerGradient}>
          <SafeAreaView edges={['top']} style={styles.safeHeader}>
            <TouchableOpacity onPress={() => setNativeLang(null)} style={styles.whiteBackBtn}>
              <Ionicons name="arrow-back" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.whiteTitle}>Step 2</Text>
            <Text style={styles.whiteSubtitle}>What do you want to learn?</Text>
          </SafeAreaView>
        </LinearGradient>
        <ScrollView contentContainerStyle={styles.scrollBody}>
          <View style={styles.grid}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity key={lang.code} style={styles.styledGridBtn} onPress={() => setTargetLang(lang.code)}>
                <Text style={styles.gridBtnText}>{lang.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // --- ✨ 3. Pre-Camera "Ready" Screen (UI 통일) ---
  if (!isReadyToSnap) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#6200EE', '#8E2DE2']} style={styles.headerGradientLarge}>
          <SafeAreaView edges={['top']} style={styles.safeHeader}>
            <TouchableOpacity onPress={() => setTargetLang(null)} style={styles.whiteBackBtn}>
              <Ionicons name="arrow-back" size={28} color="white" />
            </TouchableOpacity>
          </SafeAreaView>
          <View style={styles.headerContentCenter}>
            <Text style={{ fontSize: 60, marginBottom: 10 }}>📸</Text>
            <Text style={styles.whiteTitleLarge}>Ready to Learn?</Text>
            <Text style={styles.whiteSubtitle}>Find an item in your fridge.</Text>
          </View>
        </LinearGradient>

        <View style={styles.centerContent}>
          <Text style={styles.readySubDark}>
            We'll teach you how to say it in{'\n'}
            <Text style={{ fontWeight: 'bold', color: '#6200EE' }}>{targetLang.toUpperCase()}</Text>.
          </Text>

          <TouchableOpacity style={styles.primaryBtnLarge} onPress={() => setIsReadyToSnap(true)}>
            <Text style={styles.primaryBtnText}>Let's Snap!</Text>
            <Ionicons name="camera" size={24} color="white" style={{ marginLeft: 10 }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- 5. Result (Flashcard) - 기존 유지 ---
  if (quizData && quizData.length > 0) {
    const item = quizData[0];
    return (
      <View style={styles.container}>
        {/* ✨ 통일된 헤더 디자인 */}
        <LinearGradient colors={['#6200EE', '#8E2DE2']} style={styles.headerGradient}>
          <SafeAreaView edges={['top']} style={styles.safeHeader}>
            <Text style={styles.headerTitle}>Learning Time ✨</Text>
            <Text style={styles.headerSubtitle}>Tap card to flip</Text>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.resultContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setIsFlipped(!isFlipped)}
            style={[styles.flashcard, isFlipped ? styles.cardBack : styles.cardFront]}
          >
            {!isFlipped ? (
              <View style={styles.cardContent}>
                {photo && <Image source={{ uri: photo.uri }} style={styles.cardImage} />}
                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text style={styles.frontText}>{item.frontWord}</Text>
                <Text style={styles.tapHint}>👆 Tap to Flip</Text>
              </View>
            ) : (
              <View style={styles.cardContent}>
                <Text style={styles.backTitle}>{targetLang.toUpperCase()}</Text>
                <Text style={styles.backWord}>{item.backWord}</Text>
                <TouchableOpacity style={styles.audioBtn} onPress={() => playAudio(item.backWord, item.targetLangCode)}>
                  <Text style={styles.audioBtnText}>🔊 Listen Word</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <Text style={styles.sentence}>"{item.backSentence}"</Text>
                <TouchableOpacity style={styles.audioBtn} onPress={() => playAudio(item.backSentence, item.targetLangCode)}>
                  <Text style={styles.audioBtnText}>🔊 Listen Sentence</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={reset}>
            <Text style={styles.secondaryBtnText}>Scan Another Item</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 20 }} onPress={fullReset}>
            <Text style={{ color: '#999' }}>Change Languages</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // --- ✨ 4. Camera Preview (버튼 UI 통일) ---
  if (photo) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photo.uri }} style={styles.preview} />
        <View style={styles.overlay}>
          {loading ? <ActivityIndicator size="large" color="#fff" /> : (
            <View style={styles.buttonRow}>
              {/* Retake 버튼 (회색/붉은색 계열) */}
              <TouchableOpacity style={styles.retakeBtn} onPress={() => setPhoto(null)}>
                <Ionicons name="refresh" size={20} color="#FF5252" />
                <Text style={styles.retakeBtnText}>Retake</Text>
              </TouchableOpacity>

              <View style={{ width: 20 }} />

              {/* Generate 버튼 (보라색 메인 버튼) */}
              <TouchableOpacity style={styles.generateBtn} onPress={generateQuiz}>
                <Ionicons name="sparkles" size={20} color="white" />
                <Text style={styles.generateBtnText}>Generate</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Camera View
  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} />
      <View style={styles.cameraControls}>
        <SafeAreaView style={{ position: 'absolute', top: 20, left: 20 }}>
          <TouchableOpacity onPress={() => setIsReadyToSnap(false)} style={styles.iconBackBtn}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
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

  // ✨ Unified Header Styles (Purple Theme)
  headerGradient: { paddingBottom: 25, paddingHorizontal: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerGradientLarge: { paddingBottom: 40, paddingHorizontal: 25, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, alignItems: 'center' },
  safeHeader: { alignItems: 'flex-start', marginTop: 10, width: '100%' },
  headerContentCenter: { alignItems: 'center', marginTop: 20 },
  whiteEmoji: { fontSize: 40, marginBottom: 10 },
  whiteTitle: { fontSize: 28, fontWeight: '900', color: 'white', letterSpacing: 0.5 },
  whiteTitleLarge: { fontSize: 32, fontWeight: '900', color: 'white', letterSpacing: 0.5 },
  whiteSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 5, fontWeight: '600' },
  whiteBackBtn: { marginBottom: 15 },

  // ✨ Unified Button Styles
  primaryBtnLarge: { flexDirection: 'row', backgroundColor: '#6200ee', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 40, alignItems: 'center', elevation: 5, shadowColor: '#6200ee', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 } },
  primaryBtnText: { color: 'white', fontSize: 20, fontWeight: 'bold' },

  secondaryBtn: { width: '100%', backgroundColor: 'white', paddingVertical: 15, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  secondaryBtnText: { color: '#555', fontSize: 16, fontWeight: 'bold' },

  // ✨ Styled Grid Buttons
  scrollBody: { padding: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  styledGridBtn: { width: '45%', backgroundColor: 'white', paddingVertical: 18, margin: 8, borderRadius: 20, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 } },
  gridBtnText: { fontSize: 18, fontWeight: '600', color: '#333' },

  // Ready Screen
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  readySubDark: { fontSize: 18, color: '#555', textAlign: 'center', marginBottom: 40, lineHeight: 26 },

  // Splash
  splashContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  splashEmoji: { fontSize: 80, marginBottom: 20 },
  splashTitle: { fontSize: 40, fontWeight: '900', color: 'white' },
  splashSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 10 },

  // Camera Preview Buttons (New!)
  preview: { flex: 1 },
  overlay: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20, borderRadius: 30 },
  retakeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25 },
  retakeBtnText: { color: '#FF5252', fontWeight: 'bold', marginLeft: 8 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6200ee', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 25, marginLeft: 15 },
  generateBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 16 },

  // Camera Controls
  cameraControls: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 50 },
  topBar: { position: 'absolute', top: 20, left: 20 },
  iconBackBtn: { padding: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20 },
  snapBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.8)' },
  innerSnap: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'white' },

  // Result Card (Minimal changes for consistency)
  resultContainer: { padding: 20, paddingBottom: 50, alignItems: 'center' },
  headerDark: { fontSize: 28, fontWeight: '800', marginBottom: 20, color: '#333' },
  flashcard: { width: width * 0.85, height: width * 1.1, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, elevation: 5, marginBottom: 30, backgroundColor: 'white' },
  cardFront: { backgroundColor: '#ffffff' },
  cardBack: { backgroundColor: '#F3E5F5' }, // 연한 보라색 배경
  cardContent: { alignItems: 'center', padding: 25, width: '100%' },
  cardImage: { width: 220, height: 220, borderRadius: 20, marginBottom: 15 },
  frontText: { fontSize: 36, fontWeight: '800', color: '#333', textAlign: 'center' },
  tapHint: { marginTop: 15, color: '#888', fontSize: 14, fontWeight: '600' },
  backTitle: { fontSize: 18, color: '#6200ee', fontWeight: '800', marginBottom: 10 },
  backWord: { fontSize: 38, fontWeight: '800', color: '#333', marginBottom: 15, textAlign: 'center' },
  sentence: { fontSize: 20, fontStyle: 'italic', textAlign: 'center', color: '#555', marginBottom: 20, marginTop: 20, lineHeight: 28 },
  divider: { height: 1, width: '40%', backgroundColor: '#ddd', marginVertical: 10 },
  audioBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#6200ee', marginVertical: 5, shadowColor: '#6200ee', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  audioBtnText: { color: '#6200ee', fontWeight: '700', marginLeft: 8 },
  emoji: { fontSize: 60, marginBottom: 10 },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 0.5
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 5,
    fontWeight: '600'
  },
});