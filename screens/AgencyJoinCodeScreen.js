import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';
import {createAgencyJoinCode, getAgencyJoinCode} from '../utils/api';
import {hebrewTextAlign} from '../utils/rtlLayout';

const BLUE_100 = '#1e1d27';

/** צור קוד הצטרפות — a marketing manager issues an invite code for the team. */
const AgencyJoinCodeScreen = ({onClose, currentUser}) => {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState(null);
  const [seatLimit, setSeatLimit] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const applyResult = useCallback(res => {
    setCode(res?.code || null);
    setSeatLimit(res?.seatLimit ?? null);
    setMemberCount(res?.memberCount ?? 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getAgencyJoinCode(currentUser);
        if (!cancelled) applyResult(res);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'טעינת הקוד נכשלה');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser, applyResult]);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    setError(null);
    setCopied(false);
    try {
      applyResult(await createAgencyJoinCode(currentUser));
    } catch (e) {
      setError(e?.message || 'יצירת הקוד נכשלה');
    } finally {
      setCreating(false);
    }
  }, [currentUser, applyResult]);

  const handleCopy = useCallback(async () => {
    if (!code) return;
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
    } catch (_) {}
  }, [code]);

  const handleShare = useCallback(async () => {
    if (!code) return;
    try {
      await Share.share({
        message: `קוד ההצטרפות לסוכנות שלי בפאי 2701: ${code}`,
      });
    } catch (_) {}
  }, [code]);

  const seatsFull = seatLimit != null && memberCount >= seatLimit;

  return (
    <View style={[styles.root, {paddingTop: Math.max(insets.top, 12)}]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="חזור"
          hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={26}
            color={Colors.white100}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>קוד הצטרפות</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.body}>
        <Text style={styles.lead}>
          שתפו את הקוד עם המשווקים שלכם. בהרשמה הם יבחרו "הצטרף לסוכנות קיימת"
          ויזינו שם משתמש, סיסמה והקוד הזה.
        </Text>

        {seatLimit ? (
          <Text style={styles.seatsLine}>
            {memberCount} מתוך {seatLimit} משתמשים בסוכנות
          </Text>
        ) : null}

        {loading ? (
          <ActivityIndicator color={Colors.white100} style={styles.loader} />
        ) : (
          <>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{code || '— — — —'}</Text>
            </View>

            {code ? (
              <View style={styles.codeActionsRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleCopy}
                  style={styles.secondaryBtn}>
                  <MaterialCommunityIcons
                    name={copied ? 'check' : 'content-copy'}
                    size={18}
                    color={Colors.white100}
                  />
                  <Text style={styles.secondaryBtnText}>
                    {copied ? 'הועתק' : 'העתק'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleShare}
                  style={styles.secondaryBtn}>
                  <MaterialCommunityIcons
                    name="share-variant"
                    size={18}
                    color={Colors.white100}
                  />
                  <Text style={styles.secondaryBtnText}>שתף</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {seatsFull ? (
              <Text style={styles.warningText}>
                הסוכנות מלאה — לא ניתן לצרף משווקים נוספים.
              </Text>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={creating}
              onPress={handleCreate}
              style={[styles.primaryBtn, creating && styles.primaryBtnDisabled]}>
              {creating ? (
                <ActivityIndicator color="#1E1D27" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {code ? 'צור קוד חדש' : 'צור קוד הצטרפות'}
                </Text>
              )}
            </TouchableOpacity>

            {code ? (
              <Text style={styles.note}>
                יצירת קוד חדש מבטלת את הקוד הקודם.
              </Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: BLUE_100},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  backButton: {padding: 4},
  headerTitle: {
    flex: 1,
    color: Colors.white100,
    fontSize: 18,
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  headerSpacer: {width: 34},
  body: {paddingHorizontal: 20, paddingTop: 12},
  lead: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
  },
  seatsLine: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    marginTop: 10,
  },
  loader: {marginTop: 32},
  codeBox: {
    marginTop: 24,
    height: 68,
    borderRadius: 14,
    backgroundColor: '#2b2a39',
    borderWidth: 1,
    borderColor: 'rgba(254,231,135,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    color: '#FFBF3E',
    fontSize: 28,
    letterSpacing: 6,
    fontFamily: 'Rubik-Medium',
  },
  codeActionsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 12,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  secondaryBtnText: {
    color: Colors.white100,
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    writingDirection: 'rtl',
  },
  warningText: {
    color: '#FFD9A0',
    fontSize: 13,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    marginTop: 14,
  },
  errorText: {
    color: '#FFD9D9',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    marginTop: 14,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFBF3E',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  primaryBtnDisabled: {backgroundColor: 'rgba(255,191,62,0.35)'},
  primaryBtnText: {
    color: '#1E1D27',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    writingDirection: 'rtl',
  },
  note: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontFamily: 'Rubik-Regular',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: 10,
  },
});

export default AgencyJoinCodeScreen;
