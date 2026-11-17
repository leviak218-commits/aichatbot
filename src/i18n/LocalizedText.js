import { Children } from 'react';
import { StyleSheet, Text as NativeText } from 'react-native';
import { useLanguage } from './LanguageContext';

function localizeChild(child, translate) {
  if (typeof child === 'string') return translate(child);
  if (Array.isArray(child)) return child.map((item) => localizeChild(item, translate));
  return child;
}

export function LocalizedText({ children, accessibilityLabel, style, ...props }) {
  const { translate, language, fontFamilyForWeight } = useLanguage();
  const localizedChildren = Children.map(children, (child) => localizeChild(child, translate));
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const fontStyle = language === 'ta'
    ? {
      fontFamily: fontFamilyForWeight(flattenedStyle.fontWeight),
      fontWeight: 'normal',
      ...(typeof flattenedStyle.fontSize === 'number' && { fontSize: flattenedStyle.fontSize * 0.9 }),
    }
    : null;

  return (
    <NativeText
      {...props}
      style={fontStyle ? [style, fontStyle] : style}
      accessibilityLabel={accessibilityLabel ? translate(accessibilityLabel) : accessibilityLabel}
    >
      {localizedChildren}
    </NativeText>
  );
}
