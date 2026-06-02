import {Platform, Alert} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export async function ensureMediaLibraryPermission() {
  if (Platform.OS === 'web') return true;
  const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (existing.status === 'granted') return true;
  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (requested.status !== 'granted') {
    Alert.alert(
      'הרשאה נדרשת',
      'נדרשת הרשאה לגישה לספריית המדיה כדי להעלות תמונות וסרטונים.',
    );
    return false;
  }
  return true;
}

export const AD_VIDEO_PICKER_OPTIONS = {
  mediaTypes: ImagePicker.MediaTypeOptions.Videos,
  allowsEditing: false,
  quality: 1,
  videoMaxDuration: 120,
};
