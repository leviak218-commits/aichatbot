import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '../i18n/LocalizedText';
import { LocalizedTextInput as TextInput } from '../i18n/LocalizedTextInput';
import { useLanguage } from '../i18n/LanguageContext';
import Svg, { Circle, Path } from 'react-native-svg';
import { createAccount, findAccount, usernameExists } from '../data/accounts';
import { createAnalyticsSessionId, recordRegistration, recordSessionStart } from '../data/analytics';

export default function LoginScreen({ onLogin }) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const { translate } = useLanguage();

  const handleLogin = async () => {
    const account = findAccount(username.trim().toLowerCase(), password);
    if (!account) {
      Alert.alert('Login failed', 'Check your username and password.');
      return;
    }
    const sessionId = createAnalyticsSessionId();
    try {
      await recordSessionStart(account.username, account.role, sessionId);
      onLogin({ name: account.name, role: account.role, userId: account.username, sessionId });
    } catch (error) {
      Alert.alert('Sign-in could not be recorded', error.message);
    }
  };

  const handleCreateAccount = async () => {
    const cleanUsername = username.trim().toLowerCase();
    if (!name.trim() || !cleanUsername || !password || !confirmPassword) {
      Alert.alert('More information needed', 'Complete all account fields.');
      return;
    }
    if (cleanUsername.length < 3) {
      Alert.alert('Username too short', 'Use at least 3 characters for your username.');
      return;
    }
    if (usernameExists(cleanUsername)) {
      Alert.alert('Username unavailable', 'Choose a different username.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters for your password.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Enter the same password in both fields.');
      return;
    }
    const account = createAccount({ name: name.trim(), username: cleanUsername, password });
    const sessionId = createAnalyticsSessionId();
    try {
      await recordRegistration(account.username, account.role);
      await recordSessionStart(account.username, account.role, sessionId);
      onLogin({ name: account.name, role: account.role, userId: account.username, sessionId });
    } catch (error) {
      Alert.alert('Account created but could not be signed in', error.message);
    }
  };

  const switchMode = () => {
    setIsCreating((current) => !current);
    setName('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.mark}>◒</Text>
          <Text style={styles.title}>Farmer Support System</Text>
          <Text style={styles.subtitle}>Practical crop guidance, grown for your village.</Text>
        </View>
        <View style={styles.form}>
          <Text style={styles.formTitle}>{isCreating ? 'Create your account' : 'Welcome back'}</Text>
          <Text style={styles.formCopy}>{isCreating ? 'Join the field library as a farmer.' : 'Sign in to explore planting and harvest guidance.'}</Text>
          {isCreating && <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#8D9A8E" autoCapitalize="words" style={styles.input} />}
          <TextInput value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor="#8D9A8E" autoCapitalize="none" style={styles.input} />
          <View style={styles.passwordField}>
            <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#8D9A8E" secureTextEntry={!passwordVisible} style={[styles.input, styles.passwordInput]} />
            <Pressable accessibilityRole="button" accessibilityLabel={translate(passwordVisible ? 'Hide password' : 'Show password')} accessibilityState={{ checked: passwordVisible }} onPress={() => setPasswordVisible((visible) => !visible)} style={styles.visibilityButton}>
              <EyeIcon visible={passwordVisible} />
            </Pressable>
          </View>
          {isCreating && (
            <View style={styles.passwordField}>
              <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm password" placeholderTextColor="#8D9A8E" secureTextEntry={!confirmPasswordVisible} style={[styles.input, styles.passwordInput]} />
              <Pressable accessibilityRole="button" accessibilityLabel={translate(confirmPasswordVisible ? 'Hide password' : 'Show password')} accessibilityState={{ checked: confirmPasswordVisible }} onPress={() => setConfirmPasswordVisible((visible) => !visible)} style={styles.visibilityButton}>
                <EyeIcon visible={confirmPasswordVisible} />
              </Pressable>
            </View>
          )}
          <Pressable onPress={isCreating ? handleCreateAccount : handleLogin} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>{isCreating ? 'Create account' : 'Sign in'}</Text>
          </Pressable>
          <Pressable onPress={switchMode} style={styles.switchButton}><Text style={styles.switchText}>{isCreating ? 'Already have an account? Sign in' : 'New to App ? Create an account'}</Text></Pressable>
          {!isCreating && <Text style={styles.demo}>Demo accounts: farmer / farmer123  ·  admin / admin123</Text>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function EyeIcon({ visible }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" stroke="#526E5F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="2.8" stroke="#526E5F" strokeWidth="1.8" />
      {!visible && <Path d="m4 4 16 16" stroke="#526E5F" strokeWidth="1.8" strokeLinecap="round" />}
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F6F3',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  hero: {
    marginBottom: 28,
    alignItems: 'flex-start',
  },
  mark: {
    color: '#2E7D32',
    backgroundColor: '#E8F5E9',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    textAlign: 'center',
    width: 52,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    paddingTop: 7,
    marginBottom: 14,
  },
  title: {
    color: '#1B3B2B',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  subtitle: {
    color: '#526E5F',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 290,
    fontWeight: '500',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E3EBE5',
    shadowColor: '#1B3B2B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },
  formTitle: {
    color: '#1B3B2B',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  formCopy: {
    color: '#657A6C',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 22,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#F7FAF8',
    borderColor: '#D8E2DA',
    borderWidth: 1.5,
    borderRadius: 14,
    color: '#1B3B2B',
    fontSize: 15,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  passwordField: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 54,
  },
  visibilityButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    right: 3,
    top: 0,
    width: 48,
  },
  button: {
    backgroundColor: '#2E7D32',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 6,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  switchButton: {
    paddingTop: 18,
    paddingBottom: 4,
    alignItems: 'center',
  },
  switchText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  demo: {
    color: '#5C7365',
    backgroundColor: '#EDF4EE',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 18,
    textAlign: 'center',
    overflow: 'hidden',
  },
});