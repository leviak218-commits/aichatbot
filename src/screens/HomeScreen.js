import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import PlantCard from '../components/PlantCard';
import { LocalizedText as Text } from '../i18n/LocalizedText';
import { LocalizedTextInput as TextInput } from '../i18n/LocalizedTextInput';

export default function HomeScreen({ plants, user, followedCrops, onSelectPlant, onSearch, onOpenAdmin, onOpenProfile, onToggleFollow, onViewHarvestTasks }) {
  const [query, setQuery] = useState('');
  const filteredPlants = useMemo(() => plants.filter((plant) => `${plant.name} ${plant.localName} ${plant.category}`.toLowerCase().includes(query.toLowerCase())), [plants, query]);

  return (
    <View style={styles.screen}>
      <FlatList
        data={filteredPlants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={(
          <>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text numberOfLines={2} style={styles.eyebrow}>GOOD MORNING, {user.name.toUpperCase()}</Text>
                <Text numberOfLines={2} style={styles.heading}>What are you growing?</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={onOpenProfile} style={styles.avatar}><Text style={styles.avatarText}>{user.name[0]}</Text></Pressable>
            </View>
            <Text style={styles.intro}>Find the right season, care routine, and harvest tips for your crop.</Text>
            <View style={styles.searchBox}><Text style={styles.searchIcon}>⌕</Text><TextInput value={query} onChangeText={setQuery} onSubmitEditing={onSearch} returnKeyType="search" placeholder="Search crops..." placeholderTextColor="#8A958B" style={styles.searchInput} /></View>
            <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Crop library</Text><Text style={styles.count}>{filteredPlants.length} guides</Text></View>
            {user.role === 'admin' && (
              <View style={styles.adminActions}>
                <Pressable onPress={onOpenAdmin} style={styles.adminButton}><Text style={styles.adminButtonText}>Manage crop guides  ›</Text></Pressable>
              </View>
            )}
          </>
        )}
        renderItem={({ item }) => (
          <PlantCard
            plant={item}
            isFollowed={Boolean(followedCrops[item.id])}
            onPress={() => onSelectPlant(item)}
            onToggleFollow={() => onToggleFollow(item.id)}
            onViewHarvestTasks={() => onViewHarvestTasks(item)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No crop guides match your search.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8F2' },
  content: { padding: 22, paddingBottom: 34, paddingTop: 30 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: '#E47B35', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  heading: { color: '#17391F', fontSize: 28, fontWeight: '900', marginTop: 7 },
  avatar: { alignItems: 'center', backgroundColor: '#DCEAD8', borderRadius: 22, flexShrink: 0, height: 44, justifyContent: 'center', width: 44 },
  avatarText: { color: '#23613A', fontSize: 18, fontWeight: '800' },
  intro: { color: '#718075', fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 320 },
  searchBox: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E9DF', borderWidth: 1, borderRadius: 13, flexDirection: 'row', marginTop: 22, paddingHorizontal: 13 },
  searchIcon: { color: '#718075', fontSize: 27, marginRight: 6 },
  searchInput: { color: '#17391F', flex: 1, fontSize: 15, paddingVertical: 13 },
  sectionRow: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, marginTop: 28 },
  sectionTitle: { color: '#17391F', fontSize: 20, fontWeight: '800' },
  count: { color: '#809080', fontSize: 12 },
  adminActions: { gap: 9, marginBottom: 8 },
  adminButton: { backgroundColor: '#EAF1E5', borderRadius: 11, padding: 13 },
  adminButtonText: { color: '#23613A', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  empty: { color: '#718075', paddingVertical: 30, textAlign: 'center' },
});