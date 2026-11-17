import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, BackHandler, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import PlantDetailScreen from './src/screens/PlantDetailScreen';
import AdminScreen from './src/screens/AdminScreen';
import ReportsAnalyticsScreen from './src/screens/ReportsAnalyticsScreen';
import FarmerAssistantScreen from './src/screens/FarmerAssistantScreen';
import BottomNavigation from './src/components/BottomNavigation';
import { HarvestCalendarScreen, HarvestPlannerScreen, HarvestTaskGuideScreen, ProfileScreen } from './src/screens/FarmToolsScreens';
import { createPlant, deletePlant, getPlants, updatePlant } from './src/data/database';
import { createAnalyticsSessionId, recordFeatureUsage, recordSessionEnd, recordSessionStart } from './src/data/analytics';
import { LanguageProvider } from './src/i18n/LanguageContext';

const SESSION_STORAGE_KEY = '@farmer-support-system/session-v1';

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [plants, setPlants] = useState(getPlants());
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [harvestGuidePlant, setHarvestGuidePlant] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [activeTab, setActiveTab] = useState('plants');
  const [selectedPlannerPlantId, setSelectedPlannerPlantId] = useState(null);
  const [calendarFocus, setCalendarFocus] = useState(null);
  const [followedCrops, setFollowedCrops] = useState({});

  useEffect(() => {
    let isCurrent = true;
    const restoreSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (!stored) return;
        const savedSession = JSON.parse(stored);
        if (!savedSession?.userId || !savedSession?.name || !['user', 'admin'].includes(savedSession.role)) {
          await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
          return;
        }
        const sessionId = createAnalyticsSessionId();
        recordSessionStart(savedSession.userId, savedSession.role, sessionId).catch(() => {});
        if (isCurrent) setSession({ ...savedSession, sessionId });
      } catch {
        if (isCurrent) {
          try {
            await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
          } catch {
            // Leave startup usable if local session storage is unavailable.
          }
        }
      } finally {
        if (isCurrent) setSessionLoading(false);
      }
    };
    restoreSession();
    return () => { isCurrent = false; };
  }, []);

  useEffect(() => {
    if (!session?.userId) return undefined;
    let isCurrentSession = true;
    const storageKey = `followed-crops:${session.userId}`;
    AsyncStorage.getItem(storageKey)
      .then((stored) => {
        if (!isCurrentSession) return;
        try {
          setFollowedCrops(stored ? JSON.parse(stored) : {});
        } catch {
          setFollowedCrops({});
        }
      })
      .catch(() => {
        if (isCurrentSession) setFollowedCrops({});
      });
    return () => { isCurrentSession = false; };
  }, [session?.userId]);

  const refreshPlants = () => setPlants(getPlants());
  const trackFeature = (feature, outcome = 'success') => {
    if (!session) return;
    recordFeatureUsage(session, feature, outcome).catch((error) => {
      Alert.alert('Analytics could not be saved', error.message);
    });
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (harvestGuidePlant) {
        setHarvestGuidePlant(null);
        return true;
      }
      if (adminMode) {
        setAdminMode(false);
        return true;
      }
      if (selectedPlant) {
        setSelectedPlant(null);
        return true;
      }
      if (activeTab === 'planner' && selectedPlannerPlantId) {
        setSelectedPlannerPlantId(null);
        return true;
      }
      if (activeTab === 'assistant') {
        setActiveTab('profile');
        return true;
      }
      if (activeTab !== 'plants') {
        setActiveTab('plants');
        return true;
      }
      return false;
    });

    return () => subscription.remove();
  }, [activeTab, adminMode, harvestGuidePlant, selectedPlannerPlantId, selectedPlant]);

  const logout = async () => {
    try {
      await recordSessionEnd(session.sessionId);
    } catch (error) {
      Alert.alert('Session could not be saved', error.message);
    } finally {
      try {
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (error) {
        Alert.alert('Sign-out could not be saved', error.message);
      }
      setSession(null);
      setActiveTab('plants');
      setSelectedPlannerPlantId(null);
      setHarvestGuidePlant(null);
    }
  };

  if (sessionLoading) {
    return <SafeAreaView edges={['top', 'bottom']} style={styles.app} />;
  }

  if (!session) {
    return (
      <LoginScreen
        onLogin={async (nextSession) => {
          const savedSession = { userId: nextSession.userId, name: nextSession.name, role: nextSession.role };
          try {
            await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(savedSession));
          } catch (error) {
            Alert.alert('Sign-in could not be saved', error.message);
          }
          setSession(nextSession);
        }}
      />
    );
  }

  if (adminMode && session.role === 'admin') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.app}>
        <StatusBar style="dark" />
        <AdminScreen
          plants={plants}
          onBack={() => setAdminMode(false)}
          onCreate={(plant) => { createPlant(plant); refreshPlants(); trackFeature('Create crop guide'); }}
          onUpdate={(plant) => { updatePlant(plant); refreshPlants(); trackFeature('Update crop guide'); }}
          onDelete={(id) => { deletePlant(id); refreshPlants(); trackFeature('Delete crop guide'); }}
        />
      </SafeAreaView>
    );
  }

  if (selectedPlant) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.app}>
        <StatusBar style="dark" />
        <PlantDetailScreen
          plant={selectedPlant}
          onBack={() => setSelectedPlant(null)}
          onOpenVideo={() => trackFeature('Crop guide video')}
        />
      </SafeAreaView>
    );
  }

  if (harvestGuidePlant) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.app}>
        <StatusBar style="dark" />
        <HarvestTaskGuideScreen plant={harvestGuidePlant} onBack={() => setHarvestGuidePlant(null)} />
      </SafeAreaView>
    );
  }

  const updateFollowedCrop = (plantId, update) => {
    const next = { ...followedCrops, [plantId]: { ...followedCrops[plantId], ...update } };
    setFollowedCrops(next);
    AsyncStorage.setItem(`followed-crops:${session.userId}`, JSON.stringify(next)).catch((error) => {
      Alert.alert('Crop plan could not be saved', error.message);
    });
  };

  const toggleFollowPlant = (plantId) => {
    const next = { ...followedCrops };
    if (next[plantId]) {
      delete next[plantId];
    } else {
      next[plantId] = { plantingDate: '', completedTaskIds: [] };
    }
    setFollowedCrops(next);
    AsyncStorage.setItem(`followed-crops:${session.userId}`, JSON.stringify(next)).catch((error) => {
      Alert.alert('Followed crops could not be saved', error.message);
    });
    trackFeature(next[plantId] ? 'Follow crop' : 'Unfollow crop');
  };

  const openCalendarTask = (plantId, plantingDate, startDay) => {
    setCalendarFocus({ plantId, plantingDate, startDay, requestId: Date.now() });
    setActiveTab('calendar');
  };

  let currentScreen;
  if (activeTab === 'planner') {
    currentScreen = (
      <HarvestPlannerScreen
        plants={plants}
        followedCrops={followedCrops}
        selectedPlantId={selectedPlannerPlantId}
        onSelectPlant={setSelectedPlannerPlantId}
        onBackToList={() => setSelectedPlannerPlantId(null)}
        onSetPlantingDate={(plantId, plantingDate) => updateFollowedCrop(plantId, { plantingDate })}
        onBrowsePlants={() => setActiveTab('plants')}
        onToggleTask={(plantId, taskId) => {
          const currentTaskIds = followedCrops[plantId]?.completedTaskIds || [];
          const completedTaskIds = currentTaskIds.includes(taskId)
            ? currentTaskIds.filter((id) => id !== taskId)
            : [...currentTaskIds, taskId];
          updateFollowedCrop(plantId, { completedTaskIds });
          trackFeature('Harvest task checklist');
        }}
        onGoToCalendar={openCalendarTask}
      />
    );
  } else if (activeTab === 'calendar') {
    currentScreen = (
      <HarvestCalendarScreen
        plants={plants}
        followedCrops={followedCrops}
        focusRequest={calendarFocus}
        onAddPlantingDate={(plantId) => {
          setSelectedPlannerPlantId(plantId);
          setActiveTab('planner');
        }}
      />
    );
  } else if (activeTab === 'reports' && session.role === 'admin') {
    currentScreen = <ReportsAnalyticsScreen plants={plants} onBack={() => setActiveTab('plants')} />;
  } else if (activeTab === 'assistant') {
    currentScreen = <FarmerAssistantScreen user={session} onBack={() => setActiveTab('profile')} />;
  } else if (activeTab === 'profile') {
    currentScreen = <ProfileScreen user={session} onLogout={logout} onOpenAssistant={() => setActiveTab('assistant')} />;
  } else {
    currentScreen = (
      <HomeScreen
        plants={plants}
        user={session}
        followedCrops={followedCrops}
        onSelectPlant={(plant) => {
          trackFeature('Crop guide details');
          setSelectedPlant(plant);
        }}
        onSearch={() => trackFeature('Crop search')}
        onOpenAdmin={() => {
          trackFeature('Crop guide management');
          setAdminMode(true);
        }}
        onOpenProfile={() => setActiveTab('profile')}
        onToggleFollow={toggleFollowPlant}
        onViewHarvestTasks={(plant) => {
          trackFeature('Harvest task guide');
          setHarvestGuidePlant(plant);
        }}
      />
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.screenContent}>
        {currentScreen}
      </View>
      {activeTab !== 'assistant' && (
        <BottomNavigation
          activeTab={activeTab}
          isAdmin={session.role === 'admin'}
          onChangeTab={(tab) => {
            if (tab !== 'calendar') setCalendarFocus(null);
            setActiveTab(tab);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#F7F8F2',
  },
  screenContent: {
    flex: 1,
  },
});
