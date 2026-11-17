import { StyleSheet, TextInput as NativeTextInput } from 'react-native';
import { useLanguage } from './LanguageContext';

export function LocalizedTextInput({ placeholder, accessibilityLabel, style, ...props }) {
  const { translate, language, fontFamilyForWeight } = useLanguage();
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const fontStyle = language === 'ta'
    ? {
      fontFamily: fontFamilyForWeight(flattenedStyle.fontWeight),
      fontWeight: 'normal',
      ...(typeof flattenedStyle.fontSize === 'number' && { fontSize: flattenedStyle.fontSize * 0.9 }),
    }
    : null;
  return (
    <NativeTextInput
      {...props}
      style={fontStyle ? [style, fontStyle] : style}
      placeholder={placeholder ? translate(placeholder) : placeholder}
      accessibilityLabel={accessibilityLabel ? translate(accessibilityLabel) : accessibilityLabel}
    />
  );
}