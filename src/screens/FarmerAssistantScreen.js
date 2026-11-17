import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LocalizedText as Text } from '../i18n/LocalizedText';
import { LocalizedTextInput as TextInput } from '../i18n/LocalizedTextInput';
import { useLanguage } from '../i18n/LanguageContext';
import { clearChatHistory, getChatHistory, sendChatMessage } from '../data/farmerAssistant';

const suggestedQuestions = {
  en: [
    'How can I improve my soil before planting?',
    'What are the early signs of pest or disease in my crop?',
    'How should I plan irrigation during a dry week?',
    'How do I choose good-quality seeds?',
  ],
  ta: [
    'நடவு செய்வதற்கு முன் மண்ணை எவ்வாறு மேம்படுத்தலாம்?',
    'பயிரில் பூச்சி அல்லது நோயின் ஆரம்ப அறிகுறிகள் என்ன?',
    'வறண்ட வாரத்தில் பாசனத்தை எவ்வாறு திட்டமிடலாம்?',
    'தரமான விதைகளை எவ்வாறு தேர்வு செய்வது?',
  ],
};

export default function FarmerAssistantScreen({ user, onBack }) {
  const { language } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [error, setError] = useState('');
  const scrollView = useRef(null);
  const sending = useRef(false);
  const pendingSequence = useRef(0);

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    setError('');
    try {
      const history = await getChatHistory(user.userId);
      setMessages(history.messages);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user.userId]);

  useEffect(() => {
    let isCurrent = true;
    getChatHistory(user.userId)
      .then((history) => {
        if (isCurrent) setMessages(history.messages);
      })
      .catch((loadError) => {
        if (isCurrent) setError(loadError.message);
      })
      .finally(() => {
        if (isCurrent) setIsLoadingHistory(false);
      });
    return () => { isCurrent = false; };
  }, [user.userId]);

  useEffect(() => {
    const timer = setTimeout(() => scrollView.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(timer);
  }, [messages, isSending]);

  const sendMessage = async (value) => {
    const message = value.trim();
    if (!message || isLoadingHistory || sending.current) return;

    sending.current = true;
    setIsSending(true);
    setError('');
    setInput('');
    const pendingId = `pending-${pendingSequence.current++}`;
    setMessages((current) => [...current, { id: pendingId, role: 'user', text: message }]);

    try {
      const result = await sendChatMessage({ userId: user.userId, message, language });
      setMessages((current) => [
        ...current.filter((item) => item.id !== pendingId),
        result.userMessage,
        result.assistantMessage,
      ]);
    } catch (sendError) {
      setMessages((current) => current.filter((item) => item.id !== pendingId));
      setInput(message);
      setError(sendError.message);
    } finally {
      sending.current = false;
      setIsSending(false);
    }
  };

  const clearHistory = async () => {
    setIsClearing(true);
    setError('');
    try {
      await clearChatHistory(user.userId);
      setMessages([]);
      setShowClearConfirmation(false);
    } catch (clearError) {
      setError(clearError.message);
      setShowClearConfirmation(false);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹  <Text>Back</Text></Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>FARMING SUPPORT</Text>
          <Text style={styles.headerTitle}>AI Farmer Assistant</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear chat history"
          accessibilityState={{ disabled: !messages.length || isLoadingHistory || isSending || isClearing }}
          disabled={!messages.length || isLoadingHistory || isSending || isClearing}
          onPress={() => setShowClearConfirmation(true)}
          style={styles.clearButton}
        >
          <Text style={styles.clearButtonText}>Clear</Text>
        </Pressable>
        <View style={styles.aiMark}><Text style={styles.aiMarkText}>AI</Text></View>
      </View>

      {error ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          {!messages.length && (
            <Pressable accessibilityRole="button" onPress={loadHistory} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      <ScrollView
        ref={scrollView}
        contentContainerStyle={styles.messageList}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.bubble, styles.assistantBubble]}>
          <Text style={styles.welcomeTitle}>
            {language === 'ta' ? 'வணக்கம்! உங்கள் விவசாய உதவியாளருக்கு வரவேற்கிறோம்' : 'Welcome to your farm assistant'}
          </Text>
          <Text style={styles.messageText}>
            {language === 'ta'
              ? 'பயிர்கள், விதைகள், உரங்கள், மண், பயிர் நலம், பாசனம் அல்லது விவசாய முறைகள் பற்றி கேளுங்கள். உங்கள் வயலுக்கான முடிவுகளை உள்ளூர் வேளாண் ஆலோசகரிடம் உறுதிப்படுத்தவும்.'
              : 'Ask me about crops, seeds, fertilizers, soil, crop health, irrigation, or farming methods. For decisions specific to your field, please confirm with a local agricultural advisor.'}
          </Text>
        </View>

        {isLoadingHistory ? (
          <ActivityIndicator color="#23613A" style={styles.historyLoader} />
        ) : null}

        {messages.map((message) => (
          <View
            key={message.id}
            style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}
          >
            <Text style={[styles.messageText, message.role === 'user' && styles.userMessageText]}>
              {message.text}
            </Text>
          </View>
        ))}

        {isSending ? (
          <View style={[styles.bubble, styles.assistantBubble, styles.thinkingBubble]}>
            <ActivityIndicator color="#23613A" size="small" />
            <Text style={styles.thinkingText}>Preparing farming advice…</Text>
          </View>
        ) : null}

        {!isLoadingHistory && messages.length === 0 ? (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsTitle}>SUGGESTED QUESTIONS</Text>
            {suggestedQuestions[language].map((question) => (
              <Pressable
                key={question}
                accessibilityRole="button"
                disabled={isSending}
                onPress={() => sendMessage(question)}
                style={styles.suggestion}
              >
                <Text style={styles.suggestionText}>{question}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Ask a farming question"
          editable={!isSending && !isLoadingHistory}
          multiline
          onChangeText={setInput}
          onSubmitEditing={() => sendMessage(input)}
          placeholder={language === 'ta' ? 'உங்கள் விவசாயக் கேள்வியை எழுதுங்கள்…' : 'Ask a farming question…'}
          placeholderTextColor="#89948B"
          returnKeyType="send"
          style={styles.input}
          value={input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={language === 'ta' ? 'அனுப்பு' : 'Send message'}
          accessibilityState={{ disabled: isLoadingHistory || isSending || !input.trim() }}
          disabled={isLoadingHistory || isSending || !input.trim()}
          onPress={() => sendMessage(input)}
          style={[styles.sendButton, (isLoadingHistory || isSending || !input.trim()) && styles.sendButtonDisabled]}
        >
          <Text style={styles.sendButtonText}>{language === 'ta' ? 'அனுப்பு' : 'Send'}</Text>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setShowClearConfirmation(false)}
        transparent
        visible={showClearConfirmation}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityRole="alert" style={styles.confirmationDialog}>
            <Text style={styles.confirmationTitle}>Clear chat history?</Text>
            <Text style={styles.confirmationMessage}>This permanently deletes the saved conversation.</Text>
            <View style={styles.confirmationActions}>
              <Pressable
                accessibilityRole="button"
                disabled={isClearing}
                onPress={() => setShowClearConfirmation(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isClearing }}
                disabled={isClearing}
                onPress={clearHistory}
                style={[styles.confirmClearButton, isClearing && styles.sendButtonDisabled]}
              >
                {isClearing
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <Text style={styles.confirmClearButtonText}>Clear chat</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F7F8F2', flex: 1 },
  header: { alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomColor: '#E6EBE3', borderBottomWidth: 1, flexDirection: 'row', minHeight: 76, paddingHorizontal: 15 },
  backButton: { paddingHorizontal: 4, paddingVertical: 10 },
  backText: { color: '#23613A', fontSize: 14, fontWeight: '800' },
  headerCopy: { flex: 1, marginLeft: 13 },
  headerEyebrow: { color: '#718075', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  headerTitle: { color: '#17391F', fontSize: 17, fontWeight: '900', marginTop: 3 },
  clearButton: { marginRight: 9, paddingHorizontal: 4, paddingVertical: 9 },
  clearButtonText: { color: '#8D3E2C', fontSize: 12, fontWeight: '800' },
  aiMark: { alignItems: 'center', backgroundColor: '#EAF1E5', borderRadius: 19, height: 38, justifyContent: 'center', width: 38 },
  aiMarkText: { color: '#23613A', fontSize: 13, fontWeight: '900' },
  errorBanner: { backgroundColor: '#FFF0EA', borderColor: '#F1C9B8', borderRadius: 9, borderWidth: 1, marginHorizontal: 14, marginTop: 10, padding: 11 },
  errorText: { color: '#8D3E2C', fontSize: 13, lineHeight: 19 },
  retryButton: { alignSelf: 'flex-start', marginTop: 6, paddingVertical: 4 },
  retryText: { color: '#23613A', fontSize: 13, fontWeight: '800' },
  messageList: { flexGrow: 1, padding: 15, paddingBottom: 20 },
  bubble: { borderRadius: 15, marginBottom: 11, maxWidth: '90%', paddingHorizontal: 14, paddingVertical: 12 },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderColor: '#E6EBE3', borderWidth: 1 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#23613A', borderBottomRightRadius: 4 },
  welcomeTitle: { color: '#17391F', fontSize: 15, fontWeight: '900', lineHeight: 22, marginBottom: 5 },
  messageText: { color: '#536157', fontSize: 14, lineHeight: 21 },
  userMessageText: { color: '#FFFFFF' },
  historyLoader: { marginVertical: 12 },
  thinkingBubble: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  thinkingText: { color: '#536157', fontSize: 13 },
  suggestions: { marginTop: 8 },
  suggestionsTitle: { color: '#718075', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 9 },
  suggestion: { backgroundColor: '#FFFFFF', borderColor: '#DCE7D8', borderRadius: 11, borderWidth: 1, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 11 },
  suggestionText: { color: '#23613A', fontSize: 13, fontWeight: '700', lineHeight: 19 },
  composer: { alignItems: 'flex-end', backgroundColor: '#FFFFFF', borderTopColor: '#E6EBE3', borderTopWidth: 1, flexDirection: 'row', gap: 9, paddingHorizontal: 12, paddingVertical: 10 },
  input: { backgroundColor: '#F7F8F2', borderColor: '#DCE4D9', borderRadius: 12, borderWidth: 1, color: '#17391F', flex: 1, fontSize: 14, lineHeight: 20, maxHeight: 110, minHeight: 46, paddingHorizontal: 12, paddingVertical: 11 },
  sendButton: { alignItems: 'center', backgroundColor: '#23613A', borderRadius: 11, justifyContent: 'center', minHeight: 46, minWidth: 64, paddingHorizontal: 12 },
  sendButtonDisabled: { backgroundColor: '#9AA99C' },
  sendButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(17, 34, 20, 0.42)', flex: 1, justifyContent: 'center', padding: 22 },
  confirmationDialog: { backgroundColor: '#FFFFFF', borderRadius: 14, maxWidth: 380, padding: 20, width: '100%' },
  confirmationTitle: { color: '#17391F', fontSize: 17, fontWeight: '900' },
  confirmationMessage: { color: '#536157', fontSize: 14, lineHeight: 21, marginTop: 8 },
  confirmationActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 20 },
  cancelButton: { alignItems: 'center', borderColor: '#DCE4D9', borderRadius: 9, borderWidth: 1, justifyContent: 'center', minHeight: 42, paddingHorizontal: 15 },
  cancelButtonText: { color: '#536157', fontSize: 13, fontWeight: '800' },
  confirmClearButton: { alignItems: 'center', backgroundColor: '#9B4535', borderRadius: 9, justifyContent: 'center', minHeight: 42, minWidth: 104, paddingHorizontal: 15 },
  confirmClearButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
