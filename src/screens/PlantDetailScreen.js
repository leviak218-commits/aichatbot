import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '../i18n/LocalizedText';

function InfoBlock({ label, text }) {
  return <View style={styles.infoBlock}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoText}>{text}</Text></View>;
}

export default function PlantDetailScreen({ plant, onBack, onOpenVideo }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.back}><Text style={styles.backText}>‹  All crops</Text></Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
        {plant.images.map((image) => <Image key={image} source={{ uri: image }} style={styles.galleryImage} />)}
      </ScrollView>
      <Text style={styles.category}>{plant.category.toUpperCase()}</Text>
      <Text style={styles.title}>{plant.name}</Text>
      <Text style={styles.localName}>{plant.localName}</Text>
      <Text style={styles.description}>{plant.description}</Text>
      <View style={styles.quickFacts}><View><Text style={styles.factLabel}>PLANT</Text><Text style={styles.factValue}>{plant.season}</Text></View><View><Text style={styles.factLabel}>HARVEST</Text><Text style={styles.factValue}>{plant.harvest}</Text></View></View>
      <InfoBlock label="SOIL & FIELD" text={plant.soil} />
      <InfoBlock label="WATERING" text={plant.water} />
      <InfoBlock label="PESTS TO WATCH" text={plant.pests} />
      <View style={styles.warning}><Text style={styles.warningTitle}>Pesticide guidance</Text><Text style={styles.warningText}>{plant.pesticide}</Text><Text style={styles.warningNote}>Always follow the product label and local agriculture officer guidance.</Text></View>
      <Pressable style={styles.videoButton} onPress={() => { onOpenVideo(); Linking.openURL(plant.video); }}><Text style={styles.play}>▶</Text><View><Text style={styles.videoTitle}>Watch the visual guide</Text><Text style={styles.videoSub}>Open in YouTube</Text></View></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F7F8F2', flex: 1 },
  content: { padding: 22, paddingBottom: 40, paddingTop: 30 },
  back: { paddingBottom: 17, paddingTop: 4 },
  backText: { color: '#23613A', fontSize: 15, fontWeight: '800' },
  gallery: { marginHorizontal: -22, paddingLeft: 22 },
  galleryImage: { borderRadius: 16, height: 210, marginRight: 12, width: 290 },
  category: { color: '#E47B35', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginTop: 21 },
  title: { color: '#17391F', fontSize: 35, fontWeight: '900', marginTop: 4 },
  localName: { color: '#718075', fontSize: 15, marginTop: 2 },
  description: { color: '#536157', fontSize: 16, lineHeight: 24, marginTop: 15 },
  quickFacts: { backgroundColor: '#EAF1E5', borderRadius: 15, flexDirection: 'row', justifyContent: 'space-between', marginTop: 21, padding: 16 },
  factLabel: { color: '#809080', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  factValue: { color: '#23613A', fontSize: 14, fontWeight: '800', marginTop: 5, maxWidth: 135 },
  infoBlock: { borderBottomColor: '#E1E8DE', borderBottomWidth: 1, paddingVertical: 17 },
  infoLabel: { color: '#E47B35', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  infoText: { color: '#536157', fontSize: 15, lineHeight: 22, marginTop: 7 },
  warning: { backgroundColor: '#FFF1E4', borderLeftColor: '#E47B35', borderLeftWidth: 4, borderRadius: 10, marginTop: 20, padding: 15 },
  warningTitle: { color: '#9A4E1B', fontSize: 15, fontWeight: '800' },
  warningText: { color: '#67462F', fontSize: 14, lineHeight: 21, marginTop: 7 },
  warningNote: { color: '#9A7659', fontSize: 11, lineHeight: 16, marginTop: 8 },
  videoButton: { alignItems: 'center', backgroundColor: '#23613A', borderRadius: 13, flexDirection: 'row', marginTop: 20, padding: 16 },
  play: { color: '#FFFFFF', fontSize: 20, marginHorizontal: 8 },
  videoTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  videoSub: { color: '#B9D2B8', fontSize: 12, marginTop: 3 },
});