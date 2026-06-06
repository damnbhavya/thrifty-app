import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, ActivityIndicator, Clipboard } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/contexts/ThemeContext';
import { Fonts, FontSizes } from '@/constants/Typography';
import { logger, LogEntry } from '@/lib/paymentLogger';

interface LogConsoleModalProps {
  visible: boolean;
  onClose: () => void;
  payeeName?: string;
  amount?: string;
  upiId?: string;
}

export default function LogConsoleModal({ visible, onClose, payeeName, amount, upiId }: LogConsoleModalProps) {
  const C = useColors();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Sync logs and subscribe to updates
  useEffect(() => {
    if (visible) {
      setLogs(logger.getLogs());
      setUploadSuccess(false);
      setCopySuccess(false);

      const unsubscribe = logger.subscribe(() => {
        setLogs(logger.getLogs());
      });

      return unsubscribe;
    }
  }, [visible]);

  // Auto scroll to bottom when new logs arrive
  useEffect(() => {
    if (logs.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [logs.length]);

  const handleCopy = () => {
    const rawText = logger.exportLogs(payeeName, amount, upiId);
    Clipboard.setString(rawText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleUpload = async () => {
    setIsUploading(true);
    setUploadSuccess(false);
    const res = await logger.sendToServer(payeeName, amount, upiId);
    setIsUploading(false);
    if (res.success) {
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return '#FF4D4D';
      case 'warn': return '#FFC107';
      case 'success': return '#22C55E';
      default: return '#3B82F6'; // info / system
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.consoleContainer, { backgroundColor: '#121214', borderColor: '#2E2F34' }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: '#2E2F34' }]}>
            <View style={styles.headerTitleRow}>
              <MaterialIcons name="terminal" size={20} color="#CDF12B" />
              <Text style={styles.headerTitle}>ThriftyPay DevConsole</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={20} color="#A0A5B5" />
            </Pressable>
          </View>

          {/* Device details */}
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaText}>Payee: {payeeName || 'Unknown'}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaText}>Amt: ₹{amount || '0'}</Text>
            </View>
          </View>

          {/* Log list terminal */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.terminal}
            contentContainerStyle={styles.terminalContent}
            showsVerticalScrollIndicator={true}
          >
            {logs.length === 0 ? (
              <Text style={styles.emptyText}>No logs recorded yet.</Text>
            ) : (
              logs.map((entry, index) => {
                const time = entry.timestamp.split('T')[1].substring(0, 12);
                const levelColor = getLevelColor(entry.level);
                return (
                  <View key={index} style={styles.logRow}>
                    <Text style={styles.logTime}>{time}</Text>
                    <Text style={[styles.logTag, { color: levelColor }]}>[{entry.category}]</Text>
                    <Text style={[styles.logMsg, { color: entry.level === 'error' ? '#FF6B6B' : '#E3E4E8' }]}>
                      {entry.message}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Action Row */}
          <View style={[styles.footer, { borderTopColor: '#2E2F34' }]}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: '#202124', borderColor: '#2E2F34' },
                pressed && { backgroundColor: '#2E2F34' }
              ]}
              onPress={() => {
                logger.clear();
                setLogs([]);
              }}
            >
              <MaterialIcons name="delete-sweep" size={18} color="#A0A5B5" />
              <Text style={styles.actionBtnText}>Clear</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: copySuccess ? '#1B472A' : '#202124', borderColor: copySuccess ? '#22C55E' : '#2E2F34' },
                pressed && { scale: 0.98 }
              ]}
              onPress={handleCopy}
            >
              <MaterialIcons name={copySuccess ? 'check' : 'content-copy'} size={18} color={copySuccess ? '#22C55E' : '#A0A5B5'} />
              <Text style={[styles.actionBtnText, copySuccess && { color: '#22C55E' }]}>
                {copySuccess ? 'Copied' : 'Copy'}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionBtnPrimary,
                { backgroundColor: uploadSuccess ? '#1B472A' : '#CDF12B' },
                (isUploading || uploadSuccess) && { opacity: 0.9 },
                pressed && { transform: [{ scale: 0.98 }] }
              ]}
              onPress={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#000" style={{ marginRight: 6 }} />
              ) : (
                <MaterialIcons
                  name={uploadSuccess ? 'check-circle' : 'cloud-upload'}
                  size={18}
                  color={uploadSuccess ? '#22C55E' : '#000000'}
                  style={{ marginRight: 6 }}
                />
              )}
              <Text style={[styles.actionBtnPrimaryText, uploadSuccess && { color: '#22C55E' }]}>
                {isUploading ? 'Sending...' : uploadSuccess ? 'Sent to AI!' : 'Send to AI'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  consoleContainer: {
    height: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.base,
    color: '#FFF',
    letterSpacing: 0.2,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  metaBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metaText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    color: '#A0A5B5',
  },
  terminal: {
    flex: 1,
    backgroundColor: '#090A0C',
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1D1E22',
  },
  terminalContent: {
    padding: 12,
  },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: '#555A68',
    textAlign: 'center',
    marginTop: 40,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 6,
  },
  logTime: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#555A68',
    width: 68,
  },
  logTag: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 'bold',
    width: 64,
  },
  logMsg: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 10.5,
    lineHeight: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 6,
  },
  actionBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    color: '#A0A5B5',
  },
  actionBtnPrimary: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
  },
  actionBtnPrimaryText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    color: '#000',
  },
});
