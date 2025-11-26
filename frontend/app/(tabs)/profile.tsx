import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { G, Circle } from 'react-native-svg';

// --- Types ---
interface UserStats {
  currentTitle: string;
  nextTitle: string;
  totalXp: number;
  nextLevelXp: number;
  progressPercentage: number;
  totalItems: number;
  freshCount: number;
  rottenCount: number;
}

const { width } = Dimensions.get('window');

// Donut Chart
const DonutChart = ({ fresh, soon, rotten, total }: { fresh: number, soon: number, rotten: number, total: number }) => {
  const radius = 70;
  const circleCircumference = 2 * Math.PI * radius;

  if (total === 0) {
    return (
      <View style={{alignItems: 'center', justifyContent: 'center', height: 160}}>
        <Text style={{color: '#ccc'}}>No Data</Text>
      </View>
    );
  }

  const freshStroke = (fresh / total) * circleCircumference;
  const soonStroke = (soon / total) * circleCircumference;
  const rottenStroke = (rotten / total) * circleCircumference;

  const freshAngle = 0;
  const soonAngle = (fresh / total) * 360;
  const rottenAngle = ((fresh + soon) / total) * 360;

  return (
    <View style={styles.chartContainer}>
      <Svg height="160" width="160" viewBox="0 0 180 180">
        <G rotation="-90" origin="90, 90">
          {fresh > 0 && <Circle cx="90" cy="90" r={radius} stroke="#4CAF50" strokeWidth="20" fill="transparent" strokeDasharray={[freshStroke, circleCircumference]} strokeLinecap="round" />}
          {soon > 0 && <Circle cx="90" cy="90" r={radius} stroke="#FF9800" strokeWidth="20" fill="transparent" strokeDasharray={[soonStroke, circleCircumference]} strokeLinecap="round" rotation={soonAngle} origin="90, 90" />}
          {rotten > 0 && <Circle cx="90" cy="90" r={radius} stroke="#FF5252" strokeWidth="20" fill="transparent" strokeDasharray={[rottenStroke, circleCircumference]} strokeLinecap="round" rotation={rottenAngle} origin="90, 90" />}
        </G>
      </Svg>
      <View style={styles.chartCenterText}>
        <Text style={styles.chartTotal}>{total}</Text>
        <Text style={styles.chartLabel}>Items</Text>
      </View>
    </View>
  );
};

export default function ProfileScreen() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ⚠️ IP 확인
  const API_URL = 'http://192.168.86.248:8080/api/stats';

  const fetchStats = async () => {
    try {
      const response = await axios.get(API_URL);
      setStats(response.data);
    } catch (error) { console.error(error); } 
    finally { setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchStats(); }, []));
  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  if (!stats) return <View style={styles.container} />;

  const soonCount = stats.totalItems - stats.freshCount - stats.rottenCount;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#6200EE', '#8E2DE2']} style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <Text style={styles.headerTitle}>Chef's Profile</Text>
        </SafeAreaView>
        
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
             <Text style={{fontSize:40}}>👨‍🍳</Text>
          </View>
          <Text style={styles.currentTitle}>{stats.currentTitle}</Text>
          
          {/* XP Progress Bar */}
          <View style={styles.progressWrapper}>
             <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${Math.min(stats.progressPercentage * 100, 100)}%` }]} />
             </View>
             {/* ✨ [수정됨] 텍스트 복구: "410 / 1000 XP to Master Chef" */}
             <Text style={styles.xpText}>
               {stats.totalXp} / {stats.nextLevelXp} XP to {stats.nextTitle}
             </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee"/>}
      >
        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Fridge Health</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, {backgroundColor: '#E8F5E9', width: '30%'}]}>
            <Ionicons name="leaf" size={28} color="#4CAF50" />
            <Text style={styles.statValue}>{stats.freshCount}</Text>
            <Text style={styles.statLabel}>Fresh</Text>
          </View>
          <View style={[styles.statCard, {backgroundColor: '#FFF3E0', width: '30%'}]}>
            <Ionicons name="warning" size={28} color="#FF9800" />
            <Text style={[styles.statValue, {color:'#FF9800'}]}>{soonCount}</Text>
            <Text style={styles.statLabel}>Soon</Text>
          </View>
          <View style={[styles.statCard, {backgroundColor: '#FFEBEE', width: '30%'}]}>
            <Ionicons name="alert-circle" size={28} color="#FF5252" />
            <Text style={[styles.statValue, {color:'#FF5252'}]}>{stats.rottenCount}</Text>
            <Text style={styles.statLabel}>Rotten</Text>
          </View>
        </View>

        {/* Donut Chart Section */}
        <View style={styles.chartSection}>
           <Text style={styles.sectionTitle}>Overview Chart</Text>
           <View style={styles.chartRow}>
              <DonutChart fresh={stats.freshCount} soon={soonCount} rotten={stats.rottenCount} total={stats.totalItems} />
              
              <View style={styles.legendContainer}>
                 <View style={styles.legendItem}>
                    <View style={[styles.dot, {backgroundColor: '#4CAF50'}]} />
                    <Text style={styles.legendText}>Fresh ({Math.round((stats.freshCount/stats.totalItems)*100 || 0)}%)</Text>
                 </View>
                 <View style={styles.legendItem}>
                    <View style={[styles.dot, {backgroundColor: '#FF9800'}]} />
                    <Text style={styles.legendText}>Soon ({Math.round((soonCount/stats.totalItems)*100 || 0)}%)</Text>
                 </View>
                 <View style={styles.legendItem}>
                    <View style={[styles.dot, {backgroundColor: '#FF5252'}]} />
                    <Text style={styles.legendText}>Rotten ({Math.round((stats.rottenCount/stats.totalItems)*100 || 0)}%)</Text>
                 </View>
              </View>
           </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  headerGradient: { paddingBottom: 40, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, alignItems: 'center' },
  safeHeader: { width: '100%', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: 'white' },
  
  profileCard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  avatarCircle: { width: 80, height: 80, backgroundColor: 'white', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  currentTitle: { fontSize: 22, fontWeight: 'bold', color: 'white', marginBottom: 15 },
  
  progressWrapper: { width: '100%', alignItems: 'center' },
  progressContainer: { width: '100%', height: 10, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  progressBar: { height: '100%', backgroundColor: '#00E676', borderRadius: 5 },
  xpText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },

  body: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, marginTop: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statCard: { width: '30%', paddingVertical: 15, borderRadius: 15, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor:'#000', shadowOpacity:0.05 },
  statValue: { fontSize: 24, fontWeight: '900', color: '#333', marginVertical: 5 },
  statLabel: { fontSize: 12, color: '#666', fontWeight: '600' },

  // Chart Styles
  chartSection: { backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 2, shadowColor:'#000', shadowOpacity:0.05, marginBottom: 50 },
  chartRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  chartContainer: { alignItems: 'center', justifyContent: 'center', width: 160, height: 160 },
  chartCenterText: { position: 'absolute', alignItems: 'center' },
  chartTotal: { fontSize: 32, fontWeight: '900', color: '#333' },
  chartLabel: { fontSize: 12, color: '#888' },
  
  legendContainer: { justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendText: { fontSize: 14, color: '#555', fontWeight: '600' },
});