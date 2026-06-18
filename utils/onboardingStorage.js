import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = 'pi_onboarding_completed_v1';
const TERMS_ACCEPTED_KEY = 'pi_terms_accepted_v1';

export async function hasCompletedOnboarding() {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function markOnboardingCompleted() {
  await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
}

export async function hasAcceptedTerms() {
  try {
    const value = await AsyncStorage.getItem(TERMS_ACCEPTED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function markTermsAccepted() {
  await AsyncStorage.setItem(TERMS_ACCEPTED_KEY, 'true');
}
