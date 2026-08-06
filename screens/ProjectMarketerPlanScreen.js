import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Platform,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../constants/styles';
import {MARKETER_PLANS} from '../utils/constant';
import {hebrewTextAlign} from '../utils/rtlLayout';

const BLUE_100 = '#1e1d27';
const CARD_BG = '#2b2a39';
const CARD_BORDER = 'rgba(254,231,135,0.35)';
const GOLD = '#FFBF3E';
const CONTENT_MAX = 366;

/** Figma-aligned with the subscription opener; one card per marketer plan. */
const PLAN_OPTIONS = [
  {
    id: MARKETER_PLANS.single,
    title: 'משווק יחיד',
    subtitle: 'מנוי אישי למשווק פרויקטים אחד',
    icon: 'account-outline',
  },
  {
    id: MARKETER_PLANS.team5,
    title: 'מנוי לצוות עד 5 משתמשים',
    subtitle: 'מיועד לצוות שיווק',
    icon: 'account-group-outline',
  },
  {
    id: MARKETER_PLANS.team10,
    title: 'מנוי לצוות עד 10 משתמשים',
    subtitle: 'מיועד לצוות שיווק ומשרדים',
    icon: 'office-building-outline',
  },
];

const ProjectMarketerPlanScreen = ({onClose, onSelectPlan, onJoinAgency}) => {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, Platform.OS === 'web' ? 12 : 8);

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('../assets/subscription-background.png')}
        style={styles.bgImage}
        resizeMode="cover">
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(30,29,39,0.15)', 'rgba(30,29,39,0.55)', BLUE_100]}
          locations={[0.12, 0.42, 1]}
          style={StyleSheet.absoluteFill}
        />
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {paddingTop: topPad + 8, paddingBottom: Math.max(insets.bottom, 28)},
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="חזור"
              hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
              <MaterialCommunityIcons
                name="chevron-left"
                size={24}
                color={Colors.white100}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>משווק פרויקטים</Text>
            <View style={styles.headerSpacer} />
          </View>

          <Text style={styles.lead}>בחרו את סוג המנוי שמתאים לכם</Text>

          {PLAN_OPTIONS.map(plan => (
            <TouchableOpacity
              key={plan.id}
              activeOpacity={0.85}
              style={styles.card}
              onPress={() => onSelectPlan?.(plan.id)}>
              <View style={styles.cardIconWrap}>
                <MaterialCommunityIcons
                  name={plan.icon}
                  size={22}
                  color={GOLD}
                />
              </View>
              <View style={styles.cardTexts}>
                <Text style={styles.cardTitle}>{plan.title}</Text>
                <Text style={styles.cardSubtitle}>{plan.subtitle}</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-left"
                size={22}
                color="rgba(255,255,255,0.6)"
              />
            </TouchableOpacity>
          ))}

          <View style={styles.divider} />

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.card, styles.joinCard]}
            onPress={() => onJoinAgency?.()}>
            <View style={styles.cardIconWrap}>
              <MaterialCommunityIcons
                name="key-outline"
                size={22}
                color={GOLD}
              />
            </View>
            <View style={styles.cardTexts}>
              <Text style={styles.cardTitle}>הצטרף לסוכנות קיימת</Text>
              <Text style={styles.cardSubtitle}>
                באמצעות קוד הצטרפות שקיבלת ממנהל הסוכנות
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-left"
              size={22}
              color="rgba(255,255,255,0.6)"
            />
          </TouchableOpacity>
        </ScrollView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: BLUE_100},
  bgImage: {flex: 1, width: '100%'},
  content: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    maxWidth: CONTENT_MAX,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
  headerSpacer: {width: 32},
  lead: {
    width: '100%',
    maxWidth: CONTENT_MAX,
    color: '#f7f3e6',
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'Rubik-Medium',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    marginBottom: 18,
  },
  card: {
    width: '100%',
    maxWidth: CONTENT_MAX,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  joinCard: {borderColor: 'rgba(255,255,255,0.18)'},
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,191,62,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTexts: {flex: 1},
  cardTitle: {
    color: Colors.white100,
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Rubik-Regular',
    textAlign: hebrewTextAlign,
    writingDirection: 'rtl',
    marginTop: 2,
  },
  divider: {
    width: '100%',
    maxWidth: CONTENT_MAX,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 14,
  },
});

export default ProjectMarketerPlanScreen;
