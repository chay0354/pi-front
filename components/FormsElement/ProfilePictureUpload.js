import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Title} from './Title';
import {Text} from 'react-native';
import {Colors} from '../../constants/styles';

export const ProfilePictureUpload = ({
  mainImage,
  uploadProgress,
  handleMainImageUpload,
  handleMainImageChange,
  mainImageInputRef,
  title = 'תמונת נושא או הדמייה',
  required = true,
  circularPreview = false,
  onEditExistingImage,
}) => {
  const hasImage = Boolean(mainImage?.uri);
  const showEdit = hasImage && typeof onEditExistingImage === 'function';

  return (
    <>
      <Title text={title} required={required} />
      <View style={styles.fixedImageContainer}>
        <TouchableOpacity
          style={circularPreview ? styles.circleHit : styles.rectHit}
          onPress={handleMainImageUpload}
          activeOpacity={0.85}
          disabled={uploadProgress.mainImage}>
          {hasImage ? (
            <Image
              source={{uri: mainImage.uri}}
              style={circularPreview ? styles.circleImage : styles.fixedImage}
              resizeMode={circularPreview ? 'cover' : 'contain'}
            />
          ) : (
            <View style={styles.emptyState}>
              <Image
                source={require('../../assets/user-icon.png')}
                style={styles.useImage}
                resizeMode="contain"
              />
              <Text style={styles.userImageText}>תמונת פרופיל</Text>
              <View style={styles.uploadButtonContainer}>
                <Text style={styles.uploadButtonText}>העלאת תמונה</Text>
              </View>
            </View>
          )}
          {uploadProgress.mainImage ? (
            <View style={styles.uploadButtonOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          ) : null}
        </TouchableOpacity>
        {showEdit ? (
          <TouchableOpacity
            style={styles.editChip}
            onPress={onEditExistingImage}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="עריכת תמונה">
            <MaterialCommunityIcons name="crop" size={16} color="#FFFFFF" />
            <Text style={styles.editChipText}>עריכה</Text>
          </TouchableOpacity>
        ) : null}
        {Platform.OS === 'web' && (
          <input
            ref={mainImageInputRef}
            type="file"
            accept="image/*"
            style={{display: 'none'}}
            onChange={handleMainImageChange}
          />
        )}
      </View>
    </>
  );
};

const CIRCLE = 168;

const styles = StyleSheet.create({
  fixedImageContainer: {
    width: '100%',
    minHeight: 230,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2B2A39',
    paddingVertical: 16,
    paddingHorizontal: 12,
    overflow: 'hidden',
    gap: 12,
  },
  rectHit: {
    width: '100%',
    alignItems: 'center',
  },
  circleHit: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#F7C63A',
  },
  useImage: {
    width: 55,
    height: 55,
  },
  emptyState: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  userImageText: {
    color: '#858585',
    fontSize: 16,
    marginVertical: 10,
    fontFamily: 'Rubik-Regular',
  },
  uploadButtonContainer: {
    backgroundColor: '#4D4966',
    paddingHorizontal: 20,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  uploadButtonText: {
    color: Colors.whiteGeneral,
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  fixedImage: {
    width: '100%',
    height: 198,
    maxHeight: 198,
  },
  circleImage: {
    width: '100%',
    height: '100%',
  },
  uploadButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 29, 39, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4D4966',
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
  },
  editChipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
  },
});
