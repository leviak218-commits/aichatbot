import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { LocalizedText as Text } from '../i18n/LocalizedText';
import { useLanguage } from '../i18n/LanguageContext';

const tabs = [
  { key: 'plants', label: 'Plants', icon: 'plants' },
  { key: 'planner', label: 'Harvest', accessibilityLabel: 'Harvest Planner', icon: 'checklist' },
  { key: 'calendar', label: 'Calendar', accessibilityLabel: 'Harvest Calendar', icon: 'calendar' },
  { key: 'reports', label: 'Reports', accessibilityLabel: 'Reports & Analytics', icon: 'reports', adminOnly: true },
  { key: 'profile', label: 'Profile', icon: 'profile' },
];

function TabIcon({ name, color }) {
  const common = { fill: 'none', stroke: color, strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 1.8 };

  if (name === 'plants') {
    return <Svg width={27} height={27} viewBox="0 0 24 24"><Path {...common} d="M20 4c-8 0-13 3.5-13 9a5 5 0 0 0 5 5c5.5 0 8-6 8-14Z" /><Path {...common} d="M4 21c2-5 5-8 10-11" /></Svg>;
  }
  if (name === 'planner') {
    return <Svg width={27} height={27} viewBox="0 0 24 24"><Rect {...common} x="5" y="3" width="14" height="18" rx="2" /><Path {...common} d="M9 8h6m-6 4h2m-2 4h2m3-5 1.5 1.5L19 10" /></Svg>;
  }
  if (name === 'checklist') {
    return <Svg width={27} height={27} viewBox="0 0 24 24"><Path {...common} d="M9 6h11M9 12h11M9 18h11" /><Path {...common} d="m3.5 6 1.2 1.2L7 4.8m-3.5 7.2 1.2 1.2L7 11m-3.5 7.2 1.2 1.2L7 17" /></Svg>;
  }
  if (name === 'calendar') {
    return <Svg width={27} height={27} viewBox="0 0 24 24"><Rect {...common} x="3.5" y="5" width="17" height="16" rx="2" /><Path {...common} d="M8 3v4m8-4v4M4 10h16" /><Circle cx="8" cy="14" r="1" fill={color} /><Circle cx="12" cy="14" r="1" fill={color} /><Circle cx="16" cy="14" r="1" fill={color} /><Circle cx="8" cy="18" r="1" fill={color} /><Circle cx="12" cy="18" r="1" fill={color} /></Svg>;
  }
  if (name === 'reports') {
    return <Svg width={27} height={27} viewBox="0 0 24 24"><Path {...common} d="M4 20V5m0 15h17" /><Path {...common} d="m7 15 4-4 3 2 6-7" /><Circle cx="7" cy="15" r="1" fill={color} /><Circle cx="11" cy="11" r="1" fill={color} /><Circle cx="14" cy="13" r="1" fill={color} /><Circle cx="20" cy="6" r="1" fill={color} /></Svg>;
  }
  return <Svg width={27} height={27} viewBox="0 0 24 24"><Circle {...common} cx="12" cy="8" r="4" /><Path {...common} d="M4 21a8 8 0 0 1 16 0" /></Svg>;
}

export default function BottomNavigation({ activeTab, isAdmin, onChangeTab }) {
  const { language } = useLanguage();
  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  return (
    <View accessibilityRole="tablist" style={styles.bar}>
      {visibleTabs.map((tab) => {
        const isSelected = activeTab === tab.key;
        const color = isSelected ? '#23613A' : '#89948B';
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.accessibilityLabel || tab.label}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChangeTab(tab.key)}
            style={styles.tab}
          >
            <TabIcon name={tab.icon} color={color} />
            <Text numberOfLines={1} style={[styles.label, { color }]}>{language === 'ta' ? `nav.${tab.label}` : tab.label}</Text>
            {isSelected && <View style={styles.activeMark} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { alignItems: 'stretch', backgroundColor: '#FFFFFF', borderTopColor: '#E6EBE3', borderTopWidth: 1, flexDirection: 'row', minHeight: 82, paddingHorizontal: 4, paddingTop: 8 },
  tab: { alignItems: 'center', flex: 1, justifyContent: 'flex-start', minHeight: 72, minWidth: 0, paddingTop: 1, position: 'relative' },
  label: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  activeMark: { backgroundColor: '#23613A', borderRadius: 2, bottom: -9, height: 3, position: 'absolute', width: 24 },
});