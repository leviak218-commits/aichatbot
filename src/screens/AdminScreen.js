import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '../i18n/LocalizedText';
import { LocalizedTextInput as TextInput } from '../i18n/LocalizedTextInput';

const emptyPlant = { name: '', localName: '', category: 'Vegetables', season: '', harvest: '', description: '', soil: '', water: '', pests: '', pesticide: '', images: [], video: 'https://www.youtube.com' };

export default function AdminScreen({ plants, onBack, onCreate, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyPlant);
  const [query, setQuery] = useState('');
  const isEditing = editing !== null && editing !== 'new';
  const visiblePlants = plants.filter((plant) => `${plant.name} ${plant.localName} ${plant.category}`.toLowerCase().includes(query.toLowerCase()));

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const startEdit = (plant) => { setEditing(plant.id); setForm({ ...plant }); };
  const startCreate = () => { setEditing('new'); setForm({ ...emptyPlant, images: [] }); };
  const addPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow access to your photos to add crop images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8 });
    if (!result.canceled) setField('images', [...form.images, ...result.assets.map((asset) => asset.uri)]);
  };
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow camera access to take a crop photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled) setField('images', [...form.images, result.assets[0].uri]);
  };
  const removePhoto = (index) => setField('images', form.images.filter((_, photoIndex) => photoIndex !== index));
  const save = () => {
    if (!form.name.trim() || !form.season.trim() || form.images.length === 0) {
      Alert.alert('More information needed', 'Add a crop name, planting season, and at least one photo.');
      return;
    }
    if (isEditing) onUpdate(form); else onCreate(form);
    setEditing(null);
    setForm(emptyPlant);
    Alert.alert('Saved', `${form.name} is now in the crop library.`);
  };
  const remove = () => Alert.alert('Delete guide?', `Remove ${form.name} from the library?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { onDelete(form.id); setEditing(null); setForm(emptyPlant); } }]);

  if (editing === null) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}><Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}><Text style={styles.back}>‹  Library</Text></Pressable><Text style={styles.badge}>ADMIN</Text></View>
        <Text style={styles.eyebrow}>CONTENT MANAGEMENT</Text>
        <Text style={styles.title}>Crop guides</Text>
        <Text style={styles.subtitle}>Keep planting, care, and harvest advice clear and useful for farmers.</Text>
        <View style={styles.overview}><Text style={styles.overviewCount}>{plants.length}</Text><View style={styles.overviewCopy}><Text style={styles.overviewTitle}>Published guides</Text><Text style={styles.overviewHint}>Select a guide to update its details.</Text></View></View>
        <Pressable accessibilityRole="button" onPress={startCreate} style={styles.newButton}><Text style={styles.newButtonText}>＋  Add crop guide</Text></Pressable>
        <View style={styles.listHeader}><Text style={styles.listTitle}>All guides</Text><Text style={styles.count}>{visiblePlants.length} shown</Text></View>
        <View style={styles.searchBox}><Text style={styles.searchIcon}>⌕</Text><TextInput value={query} onChangeText={setQuery} placeholder="Search crop guides" placeholderTextColor="#8A958B" style={styles.searchInput} /></View>
        <View style={styles.guideList}>
          {visiblePlants.map((plant) => (
            <Pressable key={plant.id} accessibilityRole="button" accessibilityLabel={`Edit ${plant.name} crop guide`} onPress={() => startEdit(plant)} style={styles.guideRow}>
              <Image source={{ uri: plant.images?.[0] }} style={styles.guideImage} />
              <View style={styles.rowCopy}><Text style={styles.rowName}>{plant.name}</Text><Text style={styles.rowMeta}>{plant.localName || plant.category}</Text><Text style={styles.rowSeason}>Planting: {plant.season || 'Not set'}</Text></View>
              <Text style={styles.edit}>Edit  ›</Text>
            </Pressable>
          ))}
          {!visiblePlants.length && <Text style={styles.empty}>{plants.length ? 'No crop guides match your search.' : 'No guides yet. Add your first crop guide to get started.'}</Text>}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}><Pressable accessibilityRole="button" onPress={() => setEditing(null)} style={styles.backButton}><Text style={styles.back}>‹  All guides</Text></Pressable><Text style={styles.badge}>ADMIN</Text></View>
      <Text style={styles.eyebrow}>{isEditing ? 'UPDATE THE LIBRARY' : 'ADD TO THE LIBRARY'}</Text>
      <Text style={styles.title}>{isEditing ? `Edit ${form.name || 'crop guide'}` : 'New crop guide'}</Text>
      <Text style={styles.subtitle}>Add clear, practical details farmers can use in the field.</Text>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Crop identity</Text>
        <Text style={styles.sectionHint}>Name the crop and choose the closest category.</Text>
        <Field label="Crop name *" value={form.name} onChangeText={(value) => setField('name', value)} placeholder="e.g. Maize" autoCapitalize="words" />
        <Field label="Local name" value={form.localName} onChangeText={(value) => setField('localName', value)} placeholder="e.g. Cholam" autoCapitalize="words" />
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryRow}>
          {['Vegetables', 'Cereals', 'Pulses', 'Cash Crops'].map((category) => (
            <Pressable key={category} accessibilityRole="radio" accessibilityState={{ checked: form.category === category }} onPress={() => setField('category', category)} style={[styles.categoryChip, form.category === category && styles.categoryChipSelected]}>
              <Text style={[styles.categoryText, form.category === category && styles.categoryTextSelected]}>{category}</Text>
            </Pressable>
          ))}
        </View>
        {form.category !== 'Vegetables' && form.category !== 'Cereals' && form.category !== 'Pulses' && form.category !== 'Cash Crops' && <Field label="Other category" value={form.category} onChangeText={(value) => setField('category', value)} placeholder="Enter category" />}
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Growing calendar</Text>
        <Text style={styles.sectionHint}>Use the season and timing farmers should plan around.</Text>
        <Field label="Planting season *" value={form.season} onChangeText={(value) => setField('season', value)} placeholder="e.g. June - July" />
        <Field label="Expected harvest" value={form.harvest} onChangeText={(value) => setField('harvest', value)} placeholder="e.g. 90 - 120 days" />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Crop overview</Text>
        <Field label="Short description" value={form.description} onChangeText={(value) => setField('description', value)} placeholder="What should farmers know about this crop?" multiline />
        <Field label="Soil and field preparation" value={form.soil} onChangeText={(value) => setField('soil', value)} placeholder="Soil type, drainage, and field preparation..." multiline />
        <Field label="Watering guidance" value={form.water} onChangeText={(value) => setField('water', value)} placeholder="When and how much to water..." multiline />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Pest and safety guidance</Text>
        <Field label="Pests to watch" value={form.pests} onChangeText={(value) => setField('pests', value)} placeholder="e.g. stem borer, aphids" />
        <Field label="Treatment guidance" value={form.pesticide} onChangeText={(value) => setField('pesticide', value)} placeholder="Use locally approved products and label directions..." multiline />
        <Text style={styles.safetyNote}>Keep advice practical. Include safe handling and remind farmers to follow product labels and local recommendations.</Text>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Photos and video</Text>
        <Text style={styles.sectionHint}>At least one clear crop photo is required.</Text>
        <View style={styles.photoActions}><Pressable onPress={addPhotos} style={styles.photoButton}><Text style={styles.photoButtonText}>＋  Choose photos</Text></Pressable><Pressable onPress={takePhoto} style={styles.cameraButton}><Text style={styles.cameraButtonText}>Take photo</Text></Pressable></View>
        <View style={styles.photoGrid}>{form.images.map((image, index) => <View key={`${image}-${index}`} style={styles.photoWrap}><Image source={{ uri: image }} style={styles.photo} /><Pressable accessibilityRole="button" accessibilityLabel="Remove photo" onPress={() => removePhoto(index)} style={styles.removePhoto}><Text style={styles.removePhotoText}>×</Text></Pressable></View>)}</View>
        {!form.images.length && <Text style={styles.photoEmpty}>No photos added yet</Text>}
        <Field label="Video URL (optional)" value={form.video} onChangeText={(value) => setField('video', value)} placeholder="https://youtube.com/..." autoCapitalize="none" keyboardType="url" />
      </View>

      <View style={styles.formActions}>
        <Pressable accessibilityRole="button" onPress={save} style={styles.save}><Text style={styles.saveText}>{isEditing ? 'Save changes' : 'Create crop guide'}</Text></Pressable>
        {isEditing && <Pressable accessibilityRole="button" onPress={remove} style={styles.delete}><Text style={styles.deleteText}>Delete guide</Text></Pressable>}
        {!isEditing && <Pressable accessibilityRole="button" onPress={() => { setEditing(null); setForm(emptyPlant); }} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>}
      </View>
    </ScrollView>
  );
}

function Field({ label, multiline, ...props }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} multiline={multiline} placeholderTextColor="#9AA69B" style={[styles.input, multiline && styles.multiline]} /></View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F7F8F2', flex: 1 },
  content: { padding: 20, paddingBottom: 42, paddingTop: 24 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  backButton: { minHeight: 40, justifyContent: 'center', paddingRight: 12 },
  back: { color: '#23613A', fontSize: 15, fontWeight: '800' },
  badge: { backgroundColor: '#FFF1E4', borderRadius: 7, color: '#9A4E1B', fontSize: 10, fontWeight: '900', paddingHorizontal: 9, paddingVertical: 5 },
  eyebrow: { color: '#E47B35', fontSize: 10, fontWeight: '900', marginTop: 18 },
  title: { color: '#17391F', fontSize: 29, fontWeight: '900', marginTop: 5 },
  subtitle: { color: '#718075', fontSize: 14, lineHeight: 21, marginTop: 6 },
  overview: { alignItems: 'center', backgroundColor: '#EAF1E5', borderRadius: 12, flexDirection: 'row', gap: 13, marginTop: 20, padding: 14 },
  overviewCount: { color: '#23613A', fontSize: 26, fontWeight: '900', minWidth: 34, textAlign: 'center' },
  overviewCopy: { flex: 1 },
  overviewTitle: { color: '#17391F', fontSize: 14, fontWeight: '800' },
  overviewHint: { color: '#718075', fontSize: 12, marginTop: 3 },
  newButton: { alignItems: 'center', backgroundColor: '#23613A', borderRadius: 11, justifyContent: 'center', marginTop: 13, minHeight: 50, paddingHorizontal: 14 },
  newButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  listHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, marginTop: 26 },
  listTitle: { color: '#17391F', fontSize: 19, fontWeight: '800' },
  count: { color: '#718075', fontSize: 12 },
  searchBox: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E9DF', borderRadius: 11, borderWidth: 1, flexDirection: 'row', marginBottom: 12, paddingHorizontal: 12 },
  searchIcon: { color: '#718075', fontSize: 22, marginRight: 7 },
  searchInput: { color: '#17391F', flex: 1, fontSize: 14, minHeight: 46, paddingVertical: 9 },
  guideList: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' },
  guideRow: { alignItems: 'center', borderBottomColor: '#EDF0EA', borderBottomWidth: 1, flexDirection: 'row', gap: 11, minHeight: 82, paddingHorizontal: 11, paddingVertical: 10 },
  guideImage: { backgroundColor: '#EAF1E5', borderRadius: 8, height: 58, width: 58 },
  rowCopy: { flex: 1 },
  rowName: { color: '#17391F', fontSize: 15, fontWeight: '800' },
  rowMeta: { color: '#718075', fontSize: 12, marginTop: 4 },
  rowSeason: { color: '#23613A', fontSize: 11, fontWeight: '700', marginTop: 4 },
  edit: { color: '#23613A', fontSize: 13, fontWeight: '800', paddingHorizontal: 5, paddingVertical: 10 },
  empty: { color: '#718075', fontSize: 14, lineHeight: 20, padding: 18, textAlign: 'center' },
  formSection: { backgroundColor: '#FFFFFF', borderRadius: 12, marginTop: 15, padding: 15 },
  sectionTitle: { color: '#17391F', fontSize: 17, fontWeight: '800' },
  sectionHint: { color: '#718075', fontSize: 12, lineHeight: 17, marginBottom: 15, marginTop: 4 },
  field: { marginBottom: 14 },
  label: { color: '#536157', fontSize: 12, fontWeight: '800', marginBottom: 6 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  categoryChip: { backgroundColor: '#F5F7F3', borderColor: '#E1E8DF', borderRadius: 8, borderWidth: 1, minHeight: 36, justifyContent: 'center', paddingHorizontal: 10 },
  categoryChipSelected: { backgroundColor: '#EAF1E5', borderColor: '#23613A' },
  categoryText: { color: '#667469', fontSize: 11, fontWeight: '700' },
  categoryTextSelected: { color: '#23613A' },
  input: { backgroundColor: '#FFFFFF', borderColor: '#DCE4D9', borderRadius: 9, borderWidth: 1, color: '#17391F', fontSize: 14, minHeight: 46, paddingHorizontal: 12, paddingVertical: 11 },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  safetyNote: { backgroundColor: '#FFF7EF', borderRadius: 8, color: '#805A3D', fontSize: 12, lineHeight: 18, marginBottom: 2, padding: 11 },
  photoActions: { flexDirection: 'row', gap: 8, marginTop: 11 },
  photoButton: { alignItems: 'center', backgroundColor: '#23613A', borderRadius: 9, flex: 1, justifyContent: 'center', minHeight: 45, paddingHorizontal: 8 },
  photoButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  cameraButton: { alignItems: 'center', backgroundColor: '#EAF1E5', borderRadius: 9, flex: 1, justifyContent: 'center', minHeight: 45, paddingHorizontal: 8 },
  cameraButtonText: { color: '#23613A', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 13 },
  photoEmpty: { color: '#89948B', fontSize: 12, marginTop: 10 },
  photoWrap: { height: 76, position: 'relative', width: 76 },
  photo: { borderRadius: 10, height: '100%', width: '100%' },
  removePhoto: { alignItems: 'center', backgroundColor: '#B84D3B', borderRadius: 12, height: 25, justifyContent: 'center', position: 'absolute', right: -5, top: -5, width: 25 },
  removePhotoText: { color: '#FFFFFF', fontSize: 18, lineHeight: 20 },
  formActions: { gap: 8, marginTop: 16 },
  save: { alignItems: 'center', backgroundColor: '#23613A', borderRadius: 10, justifyContent: 'center', minHeight: 50, paddingHorizontal: 14 },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  delete: { alignItems: 'center', borderColor: '#E4C8C1', borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: 46, padding: 10 },
  deleteText: { color: '#B84D3B', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  cancel: { alignItems: 'center', justifyContent: 'center', minHeight: 42, padding: 9 },
  cancelText: { color: '#718075', fontSize: 14, fontWeight: '700' },
});