import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Modal, Dimensions, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';

// --- Types ---
interface WordBankItem {
  wordId: number;
  labelEn: string;
  nativeDefinition: string;
  proficiencyLevel: number;
  freshness: 'FRESH' | 'WARNING' | 'ROTTEN';
  languageCode: string;
  translatedWord: string;
  exampleSentence: string;
  emoji: string;
  imagePath?: string;
}

// ✨ [New] 퀴즈 데이터 타입
interface QuizData {
  correctId: number;
  question: string; // 문제 (예: Apple)
  options: {
    wordId: number;
    text: string;   // 보기 (예: 사과, 포도)
  }[];
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 2;

// 🪰 파리 애니메이션
const Flies = () => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 10, duration: 200, useNativeDriver: true }),
        Animated.timing(anim, { toValue: -10, duration: 200, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ position: 'absolute', top: -10, right: -10, transform: [{ translateX: anim }], zIndex: 10 }}>
      <Text style={{ fontSize: 24 }}>🪰</Text>
    </Animated.View>
  );
};

export default function FridgeScreen() {
  const [items, setItems] = useState<WordBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // 상세 모달 상태
  const [selectedItem, setSelectedItem] = useState<WordBankItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ✨ [New] 퀴즈 모달 상태
  const [quizVisible, setQuizVisible] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);

  // ⚠️ IP 확인 (본인 IP로 유지)
  const SERVER_URL = 'http://192.168.86.248:8080';
  const API_URL = `${SERVER_URL}/api/fridge/items`;

  // XP 계산
  const totalXP = items.length * 50 + items.reduce((acc, item) => acc + (item.proficiencyLevel * 20), 0);
  let userTitle = "🥚 Dorm Student";
  if (totalXP > 1000) userTitle = "👨‍🍳 Master Chef";
  else if (totalXP > 200) userTitle = "🍳 Home Cook";

  const fetchFridgeItems = async () => {
    try {
      const response = await axios.get(API_URL);
      setItems(response.data);
    } catch (error) {
      console.error("Failed:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchFridgeItems(); }, []));
  const onRefresh = () => { setRefreshing(true); fetchFridgeItems(); };

  const playAudio = (text: string, lang: string) => {
    const langMap: {[key: string]: string} = { 'en': 'en-US', 'ko': 'ko-KR', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE' };
    Speech.speak(text, { language: langMap[lang] || 'en-US' });
  };

  // ✨ [New] 퀴즈 시작 함수
  const startQuiz = async () => {
    if (!selectedItem) return;
    try {
      // 백엔드에서 문제 받아오기
      const response = await axios.get(`${SERVER_URL}/api/fridge/quiz-by-word/${selectedItem.wordId}`);
      setQuizData(response.data);
      setModalVisible(false); // 상세 모달 닫고
      setQuizVisible(true);   // 퀴즈 모달 열기
    } catch (error) {
      alert("Not enough items to generate a quiz! Add at least 4 items.");
    }
  };

  // ✨ [New] 정답 확인 함수
  const handleAnswer = async (selectedWordId: number) => {
    if (!quizData || !selectedItem) return;

    if (selectedWordId === quizData.correctId) {
      // 정답! -> 서버에 복습 완료 요청
      try {
        await axios.post(`${SERVER_URL}/api/fridge/review/${selectedItem.wordId}`);
        setQuizVisible(false);
        fetchFridgeItems(); // 목록 새로고침
        alert("🎉 Correct! Freshness Restored & XP Gained!");
      } catch (error) {
        alert("Review failed");
      }
    } else {
      // 오답
      alert("😱 Wrong! Try again.");
    }
  };

  const renderItem = ({ item }: { item: WordBankItem }) => {
    let statusColor = '#4CAF50';
    let statusText = 'FRESH';
    let bgColor = 'white';
    
    if (item.freshness === 'WARNING') { statusColor = '#FF9800'; statusText = 'SOON'; }
    else if (item.freshness === 'ROTTEN') { statusColor = '#8B4513'; statusText = 'ROTTEN'; bgColor = '#FFF5F5'; }

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: bgColor, borderColor: statusColor, borderWidth: item.freshness === 'FRESH' ? 0 : 2 }]}
        onPress={() => { setSelectedItem(item); setModalVisible(true); }}
        activeOpacity={0.8}
      >
        <View style={[styles.badge, { backgroundColor: statusColor }]}>
          <Text style={styles.badgeText}>{statusText}</Text>
        </View>
        {item.freshness === 'ROTTEN' && <Flies />}
        
        {item.imagePath ? (
          <Image source={{ uri: `${SERVER_URL}/images/${item.imagePath}` }} style={styles.foodImage} resizeMode="cover" />
        ) : (
          <Text style={styles.emoji}>{item.emoji || '📦'}</Text>
        )}
        
        <View style={styles.cardFooter}>
          <Text style={styles.wordLabel} numberOfLines={1}>{item.nativeDefinition || item.labelEn}</Text>
          <Text style={styles.subLabel} numberOfLines={1}>{item.labelEn}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <LinearGradient colors={['#6200EE', '#8E2DE2']} style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <View>
            <Text style={styles.headerTitle}>SnapFridge</Text>
            <Text style={styles.headerRank}>{userTitle}</Text>
          </View>
          <View style={styles.xpContainer}>
            <Text style={styles.xpText}>✨ {totalXP} XP</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* 리스트 */}
      {loading ? <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 50 }} /> : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.wordId.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee"/>}
          ListEmptyComponent={<Text style={styles.emptyText}>Your fridge is empty!</Text>}
        />
      )}

      {/* 1. 상세 정보 모달 */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedItem && (
              <>
                <View style={styles.modalHeader}>
                  {selectedItem.imagePath ? (
                     <Image source={{ uri: `${SERVER_URL}/images/${selectedItem.imagePath}` }} style={{width:90, height:90, borderRadius:15}} />
                  ) : (
                     <Text style={styles.modalEmoji}>{selectedItem.emoji || '📦'}</Text>
                  )}
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                    <Ionicons name="close-circle" size={32} color="#ddd" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalTitle}>{selectedItem.nativeDefinition || selectedItem.labelEn}</Text>
                <Text style={styles.modalSubtitle}>{selectedItem.languageCode.toUpperCase()}: {selectedItem.translatedWord}</Text>

                <TouchableOpacity style={styles.playRow} onPress={() => playAudio(selectedItem.translatedWord, selectedItem.languageCode)}>
                  <Ionicons name="volume-high" size={24} color="#6200ee" />
                  <Text style={styles.playText}>Listen</Text>
                </TouchableOpacity>

                <View style={styles.divider} />
                
                <View style={styles.sentenceBox}>
                  <Text style={styles.sentenceText}>"{selectedItem.exampleSentence}"</Text>
                  <TouchableOpacity onPress={() => playAudio(selectedItem.exampleSentence, selectedItem.languageCode)}>
                    <Text style={{color: '#6200ee', marginTop: 8, fontWeight: 'bold', fontSize:12}}>🔊 Play Sentence</Text>
                  </TouchableOpacity>
                </View>

                {/* ✨ 버튼 변경: I Memorized This -> Start Quiz */}
                <TouchableOpacity style={styles.reviewBtn} onPress={startQuiz}>
                  <Text style={styles.reviewBtnText}>⚔️ Start Survival Quiz</Text>
                  <Text style={styles.reviewSubText}>Prove it to restore freshness!</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 2. ✨ [New] 퀴즈 모달 */}
      <Modal animationType="fade" transparent={true} visible={quizVisible} onRequestClose={() => setQuizVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.quizContent}>
            <Text style={styles.quizHeader}>🧠 Survival Quiz</Text>
            <Text style={styles.quizQuestion}>What is '{quizData?.question}'?</Text>
            
            {quizData?.options.map((opt, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.quizOption} 
                onPress={() => handleAnswer(opt.wordId)}
              >
                <Text style={styles.quizOptionText}>{opt.text}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity onPress={() => setQuizVisible(false)} style={{marginTop: 20}}>
               <Text style={{color: '#999'}}>Give Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  headerGradient: { paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  safeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  headerTitle: { fontSize: 30, fontWeight: '900', color: 'white' },
  headerRank: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginTop: 4 },
  xpContainer: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  xpText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  listContainer: { padding: 15, paddingTop: 20 },
  columnWrapper: { justifyContent: 'space-between' },
  card: { width: CARD_WIDTH, backgroundColor: 'white', borderRadius: 20, padding: 15, marginBottom: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  badge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: 'white' },
  emoji: { fontSize: 50, marginVertical: 10 },
  foodImage: { width: 80, height: 80, borderRadius: 10, marginVertical: 10 },
  cardFooter: { width: '100%', alignItems: 'center' },
  wordLabel: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  subLabel: { fontSize: 12, color: '#999' },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#888' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 30, padding: 25, alignItems: 'center', elevation: 10 },
  modalHeader: { width: '100%', alignItems: 'center', marginBottom: 15 },
  modalEmoji: { fontSize: 80 },
  closeBtn: { position: 'absolute', top: -15, right: -15 },
  modalTitle: { fontSize: 28, fontWeight: '800', color: '#333', marginBottom: 5 },
  modalSubtitle: { fontSize: 18, color: '#6200ee', fontWeight: '700', marginBottom: 20 },
  playRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0ff', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 30 },
  playText: { marginLeft: 10, color: '#6200ee', fontWeight: 'bold', fontSize: 16 },
  divider: { width: '100%', height: 1, backgroundColor: '#eee', marginVertical: 20 },
  sentenceBox: { width: '100%', backgroundColor: '#fafafa', padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 20, borderWidth:1, borderColor:'#eee' },
  sentenceText: { fontSize: 16, color: '#444', fontStyle: 'italic', textAlign: 'center', lineHeight: 22 },
  reviewBtn: { width: '100%', backgroundColor: '#6200ee', paddingVertical: 15, borderRadius: 15, alignItems: 'center', elevation: 3 },
  reviewBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  reviewSubText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  // ✨ [New] Quiz Styles
  quizContent: { width: '85%', backgroundColor: 'white', borderRadius: 30, padding: 30, alignItems: 'center', elevation: 10 },
  quizHeader: { fontSize: 22, fontWeight: 'bold', color: '#6200ee', marginBottom: 10 },
  quizQuestion: { fontSize: 24, fontWeight: '800', color: '#333', marginBottom: 30, textAlign: 'center' },
  quizOption: { width: '100%', backgroundColor: '#f8f9fa', paddingVertical: 15, borderRadius: 15, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  quizOptionText: { fontSize: 18, fontWeight: '600', color: '#333' },
});