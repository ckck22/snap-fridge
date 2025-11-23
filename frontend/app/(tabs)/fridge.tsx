import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Modal, Dimensions, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  freshness: 'FRESH' | 'WARNING' | 'ROTTEN'; // ✨ 신선도 상태
  languageCode: string;
  translatedWord: string;
  exampleSentence: string;
  emoji: string;
  imagePath?: string;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 2;

// 🪰 파리 애니메이션 컴포넌트
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
    <Animated.View style={{ position: 'absolute', top: -10, right: -10, transform: [{ translateX: anim }] }}>
      <Text style={{ fontSize: 24 }}>🪰</Text>
    </Animated.View>
  );
};

export default function FridgeScreen() {
  const [items, setItems] = useState<WordBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WordBankItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ✨ XP 및 타이틀 계산
  const totalXP = items.length * 50 + items.reduce((acc, item) => acc + (item.proficiencyLevel * 20), 0);
  let userTitle = "🥚 Dorm Student"; // 자취생
  let titleColor = "#555";
  if (totalXP > 1000) { userTitle = "👨‍🍳 Master Chef"; titleColor = "#FFD700"; }
  else if (totalXP > 200) { userTitle = "🍳 Home Cook"; titleColor = "#FF9800"; }

  // ⚠️ IP 확인
  const SERVER_URL = 'http://192.168.86.237:8080';
  const API_URL = `${SERVER_URL}/api/fridge/items`;

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

  // ✨ 복습 완료 처리
  const handleReviewComplete = async () => {
    if (!selectedItem) return;
    try {
      // API 호출 (복습 처리)
      await axios.post(`${SERVER_URL}/api/fridge/review/${selectedItem.wordId}`);
      // 모달 닫고 새로고침
      setModalVisible(false);
      fetchFridgeItems();
      alert("✨ Freshness Restored! XP Gained!");
    } catch (error) {
      alert("Review failed");
    }
  };

  const renderItem = ({ item }: { item: WordBankItem }) => {
    // 상태별 스타일
    let statusColor = '#4CAF50'; // Fresh
    let statusText = 'FRESH';
    let bgColor = 'white';
    
    if (item.freshness === 'WARNING') {
      statusColor = '#FF9800';
      statusText = 'SOON';
    } else if (item.freshness === 'ROTTEN') {
      statusColor = '#8B4513'; // 갈색
      statusText = 'ROTTEN';
      bgColor = '#FBE9E7'; // 약간 썩은 배경색
    }

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: bgColor, borderColor: statusColor, borderWidth: item.freshness === 'FRESH' ? 0 : 2 }]}
        onPress={() => { setSelectedItem(item); setModalVisible(true); }}
        activeOpacity={0.7}
      >
        {/* 상태 배지 */}
        <View style={[styles.badge, { backgroundColor: statusColor }]}>
          <Text style={styles.badgeText}>{statusText}</Text>
        </View>

        {/* 🪰 썩었으면 파리 꼬임 */}
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ✨ 헤더: 레벨 및 XP 표시 */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>My Fridge</Text>
          <Text style={[styles.rankTitle, { color: titleColor }]}>{userTitle}</Text>
        </View>
        <View style={styles.xpContainer}>
          <Text style={styles.xpText}>{totalXP} XP</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.wordId.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Fridge is empty!</Text>}
        />
      )}

      {/* 상세 모달 */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedItem && (
              <>
                <View style={styles.modalHeader}>
                  {selectedItem.imagePath ? (
                     <Image source={{ uri: `${SERVER_URL}/images/${selectedItem.imagePath}` }} style={{width:80, height:80, borderRadius:10}} />
                  ) : (
                     <Text style={styles.modalEmoji}>{selectedItem.emoji || '📦'}</Text>
                  )}
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                    <Ionicons name="close" size={28} color="#333" />
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
                    <Text style={{color: '#6200ee', marginTop: 5, fontWeight: 'bold'}}>🔊 Listen Sentence</Text>
                  </TouchableOpacity>
                </View>

                {/* ✨ [New] 복습 완료 버튼 */}
                <TouchableOpacity style={styles.reviewBtn} onPress={handleReviewComplete}>
                  <Text style={styles.reviewBtnText}>✅ I Memorized This!</Text>
                  <Text style={styles.reviewSubText}>+20 XP & Restore Freshness</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  
  headerContainer: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: 'white', flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },
  rankTitle: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  xpContainer: { backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  xpText: { color: '#1976D2', fontWeight: 'bold' },

  listContainer: { padding: 15 },
  columnWrapper: { justifyContent: 'space-between' },
  card: { width: CARD_WIDTH, backgroundColor: 'white', borderRadius: 20, padding: 15, marginBottom: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  badge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: 'white' },
  emoji: { fontSize: 50, marginVertical: 10 },
  foodImage: { width: 80, height: 80, borderRadius: 10, marginVertical: 10 },
  cardFooter: { width: '100%', alignItems: 'center' },
  wordLabel: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  subLabel: { fontSize: 12, color: '#888' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#888' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 25, padding: 25, alignItems: 'center', elevation: 10 },
  modalHeader: { width: '100%', alignItems: 'center', marginBottom: 10 },
  modalEmoji: { fontSize: 80 },
  closeBtn: { position: 'absolute', top: -10, right: -10, padding: 10 },
  modalTitle: { fontSize: 32, fontWeight: '900', color: '#333', marginBottom: 5 },
  modalSubtitle: { fontSize: 20, color: '#6200ee', fontWeight: '600', marginBottom: 20 },
  playRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30 },
  playText: { marginLeft: 10, color: '#6200ee', fontWeight: 'bold', fontSize: 18 },
  divider: { width: '100%', height: 1, backgroundColor: '#eee', marginVertical: 20 },
  sentenceBox: { width: '100%', backgroundColor: '#f9f9f9', padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
  sentenceText: { fontSize: 16, color: '#555', fontStyle: 'italic', textAlign: 'center' },
  
  reviewBtn: { width: '100%', backgroundColor: '#4CAF50', paddingVertical: 15, borderRadius: 15, alignItems: 'center', elevation: 3 },
  reviewBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  reviewSubText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }
});