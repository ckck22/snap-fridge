import { useState, useRef } from 'react';
import { StyleSheet, Text, View, Button, Image, ActivityIndicator, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions, CameraCapturedPicture } from 'expo-camera';
import axios from 'axios';
import * as Speech from 'expo-speech';

// --- Type Definitions ---
interface Translation {
  languageCode: string;
  translatedWord: string;
  exampleSentence: string;
}

interface QuizItem {
  labelEn: string;
  nameKo: string;
  translations: Translation[];
}

interface AxiosErrorResponse {
  response?: {
    data?: string;
  };
  message: string;
}

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  
  // State
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState<QuizItem[] | null>(null);
  const [targetLang, setTargetLang] = useState<string | null>(null);

  // Permissions
  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50 }}>We need camera permission</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  // --- Actions ---
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const data = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          base64: false,
        });
        setPhoto(data);
      } catch (error) {
        console.error("Failed to take picture:", error);
      }
    }
  };

  const generateQuiz = async () => {
    if (!photo || !targetLang) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('image', {
      uri: photo.uri,
      name: 'fridge.jpg',
      type: 'image/jpeg',
    } as any);
    
    formData.append('targetLang', targetLang);

    try {
      // ⚠️ IP 주소 확인! (http://내컴퓨터IP:8080...)
      const BACKEND_URL = 'http://192.168.86.25:8080/api/quiz/generate'; 
      
      console.log(`Sending to ${BACKEND_URL} with lang=${targetLang}`);
      
      const response = await axios.post(BACKEND_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log("📦 Data received:", JSON.stringify(response.data, null, 2));
      setQuizData(response.data);
    } catch (err) {
      const error = err as AxiosErrorResponse;
      console.error("Error:", error);
      alert("Error: " + (error.response?.data || error.message));
    } finally {
      setLoading(false);
    }
  };

  // ✨ [TTS] 듣기 함수 추가
  const playAudio = (text: string, language: string) => {
    // 언어 코드 보정 (Google API 언어 코드 -> TTS 언어 코드)
    // 예: 'ko' -> 'ko-KR', 'en' -> 'en-US'
    let speechLang = language;
    if (language === 'ko') speechLang = 'ko-KR';
    if (language === 'en') speechLang = 'en-US';
    if (language === 'es') speechLang = 'es-ES';
    if (language === 'fr') speechLang = 'fr-FR';
    if (language === 'de') speechLang = 'de-DE';

    Speech.speak(text, {
      language: speechLang,
      pitch: 1.0,
      rate: 0.9,
    });
  };

  const reset = () => {
    setPhoto(null);
    setQuizData(null);
  };

  const goBackToHome = () => {
    setTargetLang(null);
    reset();
  };

  // --- Render ---

  // 1. Language Selection
  if (!targetLang) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.header}>🌍 Choose Language</Text>
          <Text style={styles.subHeader}>What do you want to learn?</Text>
          
          <View style={styles.langButtonContainer}>
            <Button title="🇪🇸 Spanish" onPress={() => setTargetLang('es')} />
            <View style={{height: 10}} />
            <Button title="🇫🇷 French" onPress={() => setTargetLang('fr')} />
            <View style={{height: 10}} />
            <Button title="🇩🇪 German" onPress={() => setTargetLang('de')} />
            <View style={{height: 10}} />
            <Button title="🇰🇷 Korean" onPress={() => setTargetLang('ko')} />
            <View style={{height: 10}} />
            <Button title="🇺🇸 English" onPress={() => setTargetLang('en')} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 3. Result Screen (Flashcards)
  if (quizData) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultContainer}>
          <Text style={styles.header}>✨ Learning Time ✨</Text>
          {quizData.map((item, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.labelEn}>{item.labelEn}</Text>
              <View style={styles.separator} />
              
              {item.translations.map((t, tIndex) => (
                <View key={tIndex}>
                  <View style={styles.translationRow}>
                    <Text style={styles.translation}>
                      {t.languageCode.toUpperCase()}: {t.translatedWord}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => playAudio(t.translatedWord, t.languageCode)}
                      style={styles.audioButton}
                    >
                      <Text style={{fontSize: 20}}>🔊</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={() => playAudio(t.exampleSentence, t.languageCode)}>
                    <Text style={styles.sentence}>"{t.exampleSentence}"</Text>
                    <Text style={styles.hint}>(Tap sentence to listen)</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}
          
          <View style={styles.buttonGroup}>
            <Button title="Scan Another Item" onPress={reset} />
            <View style={{marginTop: 10}}>
               <Button title="Change Language" onPress={goBackToHome} color="gray" />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 2. Camera Preview
  if (photo) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photo.uri }} style={styles.preview} />
        <View style={styles.controls}>
          {loading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <>
              <Button title="Retake" onPress={() => setPhoto(null)} />
              <Button title={`Generate (${targetLang?.toUpperCase()})`} onPress={generateQuiz} />
            </>
          )}
        </View>
      </View>
    );
  }

  // Live Camera
  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={takePicture}>
            <Text style={styles.text}>📸 SNAP</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
      <SafeAreaView style={{backgroundColor: 'transparent'}}>
         <Button title="Back to Language" onPress={() => setTargetLang(null)} color="white" />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1 },
  buttonContainer: { flex: 1, flexDirection: 'row', backgroundColor: 'transparent', margin: 64 },
  button: { flex: 1, alignSelf: 'flex-end', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 10 },
  text: { fontSize: 24, fontWeight: 'bold', color: 'black' },
  preview: { flex: 1 },
  controls: { flexDirection: 'row', justifyContent: 'space-around', padding: 20, paddingBottom: 40 },
  resultContainer: { padding: 20, paddingBottom: 100, flexGrow: 1, backgroundColor: '#f5f5f5' },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', marginTop: 20, color: '#333' },
  subHeader: { fontSize: 18, color: '#666', marginBottom: 30 },
  langButtonContainer: { width: '60%' },
  card: { backgroundColor: '#ffffff', padding: 20, borderRadius: 15, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3, borderWidth: 1, borderColor: '#ddd' },
  labelEn: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  separator: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  
  translationRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  translation: { fontSize: 22, color: '#007AFF', fontWeight: '600', textAlign: 'center' },
  audioButton: { marginLeft: 10, padding: 5, backgroundColor: '#f0f0f0', borderRadius: 20 },
  
  sentence: { fontSize: 16, color: '#555', fontStyle: 'italic', textAlign: 'center', marginTop: 5 },
  hint: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 2 },
  buttonGroup: { marginBottom: 30 }
});