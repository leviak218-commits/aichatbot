import { Image, Pressable, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '../i18n/LocalizedText';

export default function PlantCard({ plant, isFollowed, onPress, onToggleFollow, onViewHarvestTasks }) {
  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" onPress={onPress}>
        <Image source={{ uri: plant.images[0] }} style={styles.image} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{plant.name}</Text>
            <Text style={styles.arrow}>›</Text>
          </View>
          <Text style={styles.localName}>{plant.localName} · {plant.category}</Text>
          <View style={styles.seasonRow}>
            <Text style={styles.seasonLabel}>PLANTING SEASON</Text>
            <Text style={styles.season}>{plant.season}</Text>
          </View>
        </View>
      </Pressable>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel={`View ${plant.name} harvest tasks`} onPress={onViewHarvestTasks} style={styles.tasksButton}>
          <Text numberOfLines={2} style={styles.tasksButtonText}>Harvest tasks</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ checked: isFollowed }} onPress={onToggleFollow} style={[styles.followButton, isFollowed && styles.followingButton]}>
          <Text numberOfLines={2} style={[styles.followText, isFollowed && styles.followingText]}>{isFollowed ? 'Following' : 'Follow'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, overflow: 'hidden', marginBottom: 16, shadowColor: '#18321D', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  image: { width: '100%', height: 150 },
  body: { padding: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: '#17391F', fontSize: 21, fontWeight: '800' },
  arrow: { color: '#E47B35', fontSize: 30, lineHeight: 30 },
  localName: { color: '#6C776D', fontSize: 13, marginTop: 3 },
  seasonRow: { borderTopColor: '#E7ECE3', borderTopWidth: 1, marginTop: 14, paddingTop: 11 },
  seasonLabel: { color: '#809080', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  season: { color: '#416B47', fontSize: 14, fontWeight: '700', marginTop: 3 },
  actions: { borderTopColor: '#E7ECE3', borderTopWidth: 1, flexDirection: 'row', gap: 9, padding: 12 },
  tasksButton: { alignItems: 'center', backgroundColor: '#23613A', borderRadius: 10, flex: 1, justifyContent: 'center', minHeight: 50, paddingHorizontal: 8, paddingVertical: 6 },
  tasksButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', lineHeight: 18, textAlign: 'center' },
  followButton: { alignItems: 'center', backgroundColor: '#FFF1E4', borderRadius: 10, justifyContent: 'center', minHeight: 50, minWidth: 95, paddingHorizontal: 13, paddingVertical: 6 },
  followingButton: { backgroundColor: '#EAF1E5' },
  followText: { color: '#9A4E1B', fontSize: 13, fontWeight: '800', lineHeight: 18, textAlign: 'center' },
  followingText: { color: '#23613A' },
});