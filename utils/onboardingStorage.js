import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = 'pi_onboarding_completed_v1';

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
