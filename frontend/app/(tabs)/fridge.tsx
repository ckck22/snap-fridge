import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';

// --- Type Definitions ---
interface WordBankItem {
  wordId: number;
  labelEn: string;
  nativeDefinition: string; // ✨ Added: Meaning in user's native language (e.g. "사과")
  proficiencyLevel: number;
  needsReview: boolean;
  languageCode: string;
  translatedWord: string;
  exampleSentence: string;
  emoji: string;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 2;

export default function FridgeScreen() {
  const [items, setItems] = useState<WordBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal State
  const [selectedItem, setSelectedItem] = useState<WordBankItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ⚠️ YOUR IP ADDRESS
  const API_URL = 'http://192.168.86.237:8080/api/fridge/items';

  const fetchFridgeItems = async () => {
    try {
      const response = await axios.get(API_URL);
      setItems(response.data);
    } catch (error) {
      console.error("Failed to fetch fridge items:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchFridgeItems(); }, []));
  const onRefresh = () => { setRefreshing(true); fetchFridgeItems(); };

  const playAudio = (text: string, lang: string) => {
    // Language Map
    const langMap: {[key: string]: string} = {
      'en': 'en-US', 'ko': 'ko-KR', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE',
      'ja': 'ja-JP', 'zh': 'zh-CN', 'ru': 'ru-RU', 'it': 'it-IT'
    };
    const speechLang = langMap[lang] || 'en-US';
    Speech.speak(text, { language: speechLang, pitch: 1.0, rate: 0.9 });
  };

  const openCard = (item: WordBankItem) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  // --- Render List Item ---
  const renderItem = ({ item }: { item: WordBankItem }) => (
    <TouchableOpacity 
      style={[styles.card, item.needsReview && styles.cardReview]}
      onPress={() => openCard(item)}
      activeOpacity={0.7}
    >
      {/* 1. Status Badge */}
      <View style={[styles.badge, { backgroundColor: item.needsReview ? '#FF5252' : '#E0E0E0' }]}>
        <Text style={[styles.badgeText, { color: item.needsReview ? 'white' : '#555' }]}>
          {item.needsReview ? '⚠️ ASAP' : `Lv.${item.proficiencyLevel}`}
        </Text>
      </View>

      {/* 2. Emoji */}
      <Text style={styles.emoji}>{item.emoji || '📦'}</Text>

      {/* 3. Text Info (Updated Layout) */}
      <View style={styles.cardFooter}>
        {/* Main: Native Definition (e.g., 사과) */}
        <Text style={styles.wordLabel} numberOfLines={1}>
          {item.nativeDefinition || item.labelEn}
        </Text>
        {/* Sub: Original English Label (e.g., Apple) */}
        <Text style={styles.subLabel} numberOfLines={1}>
          {item.labelEn}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>My Fridge</Text>
        <Text style={styles.headerSubtitle}>{items.length} items stored</Text>
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 50 }}>👻</Text>
              <Text style={styles.emptyText}>Fridge is empty!</Text>
              <Text style={styles.emptySubText}>Go to 'Scan' tab to add items.</Text>
            </View>
          }
        />
      )}

      {/* Detail Modal */}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedItem && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalEmoji}>{selectedItem.emoji || '📦'}</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                {/* Modal Title: Native Definition */}
                <Text style={styles.modalTitle}>{selectedItem.nativeDefinition || selectedItem.labelEn}</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedItem.languageCode.toUpperCase()}: {selectedItem.translatedWord}
                </Text>

                <TouchableOpacity style={styles.playRow} onPress={() => playAudio(selectedItem.translatedWord, selectedItem.languageCode)}>
                  <Ionicons name="volume-high" size={20} color="#6200ee" />
                  <Text style={styles.playText}>Listen Word</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <View style={styles.sentenceBox}>
                  <Text style={styles.sentenceText}>"{selectedItem.exampleSentence}"</Text>
                  <TouchableOpacity 
                    style={styles.sentencePlayBtn}
                    onPress={() => playAudio(selectedItem.exampleSentence, selectedItem.languageCode)}
                  >
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
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  
  // Header
  headerContainer: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1A1A1A' },
  headerSubtitle: { fontSize: 14, color: '#888', marginTop: 2 },

  // List
  listContainer: { padding: 15 },
  columnWrapper: { justifyContent: 'space-between' },
  
  // Card Design
  card: {
    width: CARD_WIDTH,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  cardReview: { borderWidth: 2, borderColor: '#FF5252' },
  
  badge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  
  emoji: { fontSize: 50, marginVertical: 10 },
  
  cardFooter: { width: '100%', alignItems: 'center' },
  // ✨ Updated Font Styles
  wordLabel: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 2, textAlign: 'center' },
  subLabel: { fontSize: 12, color: '#888', textAlign: 'center' },

  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 10 },
  emptySubText: { fontSize: 14, color: '#999', marginTop: 5 },

  // Modal Design
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