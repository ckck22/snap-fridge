import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Modal, Dimensions, Image, Animated, Easing } from 'react-native';
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
  needsReview: boolean;
  languageCode: string;
  translatedWord: string;
  exampleSentence: string;
  emoji: string;
  imagePath?: string;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 2;
const DOOR_WIDTH = width / 2;

export default function FridgeScreen() {
  const [items, setItems] = useState<WordBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WordBankItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Animation State
  const [isDoorOpen, setIsDoorOpen] = useState(false);
  const leftDoorAnim = useRef(new Animated.Value(0)).current;
  const rightDoorAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

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

  const openCard = (item: WordBankItem) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  // Open Animation
  const openFridge = () => {
    setIsDoorOpen(true);
    Animated.parallel([
      Animated.timing(leftDoorAnim, {
        toValue: -DOOR_WIDTH,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.bounce,
      }),
      Animated.timing(rightDoorAnim, {
        toValue: DOOR_WIDTH,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.bounce,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Close Animation
  const closeFridge = () => {
    setIsDoorOpen(false);
    Animated.parallel([
      Animated.timing(leftDoorAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(rightDoorAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const renderItem = ({ item }: { item: WordBankItem }) => (
    <TouchableOpacity 
      style={[styles.card, item.needsReview && styles.cardReview]}
      onPress={() => openCard(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.badge, { backgroundColor: item.needsReview ? '#FF5252' : '#E0E0E0' }]}>
        <Text style={[styles.badgeText, { color: item.needsReview ? 'white' : '#555' }]}>
          {item.needsReview ? '⚠️ ASAP' : `Lv.${item.proficiencyLevel}`}
        </Text>
      </View>

      {/* 사진 vs 이모지 */}
      {item.imagePath ? (
        <Image 
          source={{ uri: `${SERVER_URL}/images/${item.imagePath}` }} 
          style={styles.foodImage}
          resizeMode="cover"
        />
      ) : (
        <Text style={styles.emoji}>{item.emoji || '📦'}</Text>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.wordLabel} numberOfLines={1}>{item.nativeDefinition || item.labelEn}</Text>
        <Text style={styles.subLabel} numberOfLines={1}>{item.labelEn}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      {/* 1. Interior Content */}
      <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>My Fridge</Text>
          <TouchableOpacity onPress={closeFridge}>
             <Text style={styles.closeLink}>Close Door</Text>
          </TouchableOpacity>
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
      </Animated.View>

      {/* 2. Left Door */}
      <Animated.View 
        style={[
          styles.door, 
          styles.doorLeft, 
          { transform: [{ translateX: leftDoorAnim }] }
        ]}
      >
        <TouchableOpacity style={styles.doorTouchArea} onPress={openFridge} activeOpacity={0.9}>
          <View style={styles.handleLeft} />
          {/* ✨ [Removed] Tap to Open text removed here */}
        </TouchableOpacity>
      </Animated.View>

      {/* 3. Right Door */}
      <Animated.View 
        style={[
          styles.door, 
          styles.doorRight, 
          { transform: [{ translateX: rightDoorAnim }] }
        ]}
      >
        <TouchableOpacity style={styles.doorTouchArea} onPress={openFridge} activeOpacity={0.9}>
          <View style={styles.handleRight} />
        </TouchableOpacity>
      </Animated.View>

      {/* Detail Modal */}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedItem && (
              <>
                <View style={styles.modalHeader}>
                  {selectedItem.imagePath ? (
                     <Image source={{ uri: `${SERVER_URL}/images/${selectedItem.imagePath}` }} style={{width:100, height:100, borderRadius:10}} />
                  ) : (
                     <Text style={styles.modalEmoji}>{selectedItem.emoji || '📦'}</Text>
                  )}
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalTitle}>{selectedItem.nativeDefinition || selectedItem.labelEn}</Text>
                <Text style={styles.modalSubtitle}>{selectedItem.languageCode.toUpperCase()}: {selectedItem.translatedWord}</Text>
                <TouchableOpacity style={styles.playRow} onPress={() => playAudio(selectedItem.translatedWord, selectedItem.languageCode)}>
                  <Ionicons name="volume-high" size={20} color="#6200ee" />
                  <Text style={styles.playText}>Listen Word</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <View style={styles.sentenceBox}>
                  <Text style={styles.sentenceText}>"{selectedItem.exampleSentence}"</Text>
                  <TouchableOpacity style={styles.sentencePlayBtn} onPress={() => playAudio(selectedItem.exampleSentence, selectedItem.languageCode)}>
                    <Text style={{color: 'white', fontWeight: 'bold'}}>Play Sentence</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E3F2FD' },
  
  // Door
  door: {
    position: 'absolute', top: 0, bottom: 0, width: DOOR_WIDTH,
    backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#ccc',
    zIndex: 10, justifyContent: 'center', elevation: 5,
    shadowColor: '#000', shadowOffset: {width:0, height:0}, shadowOpacity: 0.2, shadowRadius: 10
  },
  doorLeft: { left: 0, borderRightWidth: 2, borderRightColor: '#bbb' },
  doorRight: { right: 0, borderLeftWidth: 0 },
  doorTouchArea: { flex: 1, justifyContent: 'center', width: '100%' },
  handleLeft: { position: 'absolute', right: 20, width: 15, height: 150, backgroundColor: '#ddd', borderRadius: 10, borderWidth: 1, borderColor: '#bbb' },
  handleRight: { position: 'absolute', left: 20, width: 15, height: 150, backgroundColor: '#ddd', borderRadius: 10, borderWidth: 1, borderColor: '#bbb' },

  // Interior
  headerContainer: { paddingHorizontal: 20, paddingVertical: 15, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1A1A1A' },
  headerSubtitle: { fontSize: 14, color: '#888', marginTop: 2 },
  closeLink: { color: '#6200ee', fontWeight: 'bold' },

  listContainer: { padding: 15 },
  columnWrapper: { justifyContent: 'space-between' },
  
  card: { width: CARD_WIDTH, backgroundColor: 'white', borderRadius: 20, padding: 15, marginBottom: 15, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cardReview: { borderWidth: 2, borderColor: '#FF5252' },
  badge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  emoji: { fontSize: 50, marginVertical: 10 },
  foodImage: { width: 80, height: 80, borderRadius: 10, marginVertical: 10 },
  cardFooter: { width: '100%', alignItems: 'center' },
  wordLabel: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 2, textAlign: 'center' },
  subLabel: { fontSize: 12, color: '#888', textAlign: 'center' },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 10, textAlign: 'center' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 25, padding: 25, alignItems: 'center', elevation: 10 },
  modalHeader: { width: '100%', alignItems: 'center', marginBottom: 10 },
  modalEmoji: { fontSize: 80 },
  closeBtn: { position: 'absolute', top: -10, right: -10, padding: 10 },
  modalTitle: { fontSize: 32, fontWeight: '900', color: '#333', marginBottom: 5, textTransform: 'capitalize' },
  modalSubtitle: { fontSize: 20, color: '#6200ee', fontWeight: '600', marginBottom: 20 },
  playRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  playText: { marginLeft: 5, color: '#6200ee', fontWeight: 'bold' },
  divider: { width: '100%', height: 1, backgroundColor: '#eee', marginVertical: 20 },
  sentenceBox: { width: '100%', backgroundColor: '#f9f9f9', padding: 15, borderRadius: 15, alignItems: 'center' },
  sentenceText: { fontSize: 16, color: '#555', fontStyle: 'italic', textAlign: 'center', marginBottom: 15, lineHeight: 22 },
  sentencePlayBtn: { backgroundColor: '#6200ee', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
});