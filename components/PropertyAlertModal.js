import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Colors} from '../constants/styles';
import {getPropertyAlerts, savePropertyAlerts} from '../utils/api';

const FALLBACK_OPTIONS = [
  {id: 10, label: 'דירות'},
  {id: 1, label: 'חדש מקבלן'},
  {id: 12, label: 'יוקרה'},
  {id: 2, label: 'משרדים'},
  {id: 8, label: 'מסחר'},
  {id: 7, label: 'קרקעות'},
  {id: 5, label: 'BNB'},
  {id: 3, label: 'שותפים'},
  {id: 6, label: 'מגזר דתי'},
  {id: 4, label: 'גלובל'},
];

export default function PropertyAlertModal({visible, onClose, subscriptionId, email}) {
  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState([]);
  const [options, setOptions] = useState(FALLBACK_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible || !subscriptionId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    getPropertyAlerts(subscriptionId)
      .then(data => {
        if (cancelled || !data?.success) return;
        setEnabled(data.enabled === true);
        setSelected(Array.isArray(data.categories) ? data.categories.map(Number) : []);
        if (Array.isArray(data.options) && data.options.length) setOptions(data.options);
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'לא הצלחנו לטעון את הבחירה');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, subscriptionId]);

  const toggleCategory = id => {
    setSelected(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]));
  };

  const onSave = async () => {
    setSaving(true);
    setError('');
    try {
      const data = await savePropertyAlerts({subscriptionId, enabled, categories: selected});
      if (!data?.success) throw new Error(data?.error || 'השמירה נכשלה');
      onClose();
    } catch (err) {
      setError(err.message || 'השמירה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.head}>
            <TouchableOpacity onPress={onClose} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.kicker}>PI 2701</Text>
          </View>
          <Text style={styles.title}>עדכון נכסים חדשים</Text>
          <Text style={styles.lead}>
            בחרו אם לקבל מייל על כל נכס חדש שעולה, ובאילו קטגוריות.
          </Text>
          {email ? <Text style={styles.mail}>{email}</Text> : null}

          {loading ? (
            <ActivityIndicator color={Colors.yellowIcons} style={styles.loader} />
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={styles.toggleRow}
                activeOpacity={0.85}
                onPress={() => setEnabled(value => !value)}
                accessibilityRole="switch"
                accessibilityState={{checked: enabled}}>
                <View style={[styles.switchTrack, enabled && styles.switchTrackOn]}>
                  <View style={[styles.knob, enabled && styles.knobOn]} />
                </View>
                <Text style={styles.toggleLabel}>אני מעוניין לקבל התראות על נכסים למייל</Text>
              </TouchableOpacity>

              {enabled ? (
                <View style={styles.categories}>
                  <Text style={styles.section}>קטגוריות</Text>
                  <View style={styles.chips}>
                    {options.map(option => {
                      const on = selected.includes(Number(option.id));
                      return (
                        <TouchableOpacity
                          key={option.id}
                          style={[styles.chip, on && styles.chipOn]}
                          onPress={() => toggleCategory(Number(option.id))}
                          accessibilityState={{selected: on}}>
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>{option.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.hint}>
                    {selected.length
                      ? 'על כל נכס חדש בקטגוריות שסומנו יישלח מייל.'
                      : 'בחרו לפחות קטגוריה אחת כדי להתחיל לקבל מיילים.'}
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.save} onPress={onSave} disabled={saving || loading} activeOpacity={0.85}>
            <Text style={styles.saveText}>{saving ? 'שומר…' : 'שמירה'}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    backgroundColor: '#2b2a39',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 28,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
    color: Colors.white100,
    fontSize: 18,
  },
  kicker: {
    color: Colors.yellowIcons,
    fontFamily: 'Rubik-ExtraBold',
    fontSize: 13,
    letterSpacing: 0.6,
  },
  title: {
    marginTop: 14,
    color: Colors.white100,
    fontFamily: 'Rubik-SemiBold',
    fontSize: 24,
    textAlign: 'right',
  },
  lead: {
    marginTop: 8,
    color: '#c8c2dc',
    fontFamily: 'Rubik-Regular',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'right',
  },
  mail: {
    marginTop: 6,
    color: Colors.yellowIcons,
    fontFamily: 'Rubik-Medium',
    fontSize: 14,
    textAlign: 'right',
  },
  loader: {
    marginVertical: 28,
  },
  scroll: {
    marginTop: 18,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#1e1d27',
  },
  toggleLabel: {
    flex: 1,
    color: Colors.white100,
    fontFamily: 'Rubik-Medium',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'right',
  },
  switchTrack: {
    width: 52,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#3a3948',
    justifyContent: 'center',
    paddingHorizontal: 3,
    flexDirection: 'row',
    direction: 'ltr',
  },
  switchTrackOn: {
    backgroundColor: Colors.yellowIcons,
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  knobOn: {
    marginLeft: 22,
    backgroundColor: '#1e1d27',
  },
  categories: {
    marginTop: 16,
  },
  section: {
    color: '#c8c2dc',
    fontFamily: 'Rubik-Medium',
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 10,
  },
  chips: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#8c85b3',
    backgroundColor: '#1e1d27',
  },
  chipOn: {
    backgroundColor: Colors.yellowIcons,
    borderColor: Colors.yellowIcons,
  },
  chipText: {
    color: Colors.white100,
    fontFamily: 'Rubik-Medium',
    fontSize: 14,
  },
  chipTextOn: {
    color: '#1e1d27',
  },
  hint: {
    marginTop: 12,
    color: '#c8c2dc',
    fontFamily: 'Rubik-Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'right',
  },
  error: {
    marginTop: 12,
    color: '#ffb4b4',
    fontFamily: 'Rubik-Regular',
    fontSize: 14,
    textAlign: 'right',
  },
  save: {
    marginTop: 16,
    height: 52,
    borderRadius: 999,
    backgroundColor: Colors.yellowIcons,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#1e1d27',
    fontFamily: 'Rubik-SemiBold',
    fontSize: 17,
  },
});
