import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
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
}) => {
  return (
    <>
      <Title text={title} required={required} />
      <TouchableOpacity
        style={styles.fixedImageContainer}
        onPress={handleMainImageUpload}>
        {mainImage ? (
          <Image
            source={{uri: mainImage.uri}}
            style={styles.fixedImage}
            resizeMode="contain"
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
        <TouchableOpacity
          style={styles.uploadButtonOverlay}
          onPress={handleMainImageUpload}
          disabled={uploadProgress.mainImage}>
          {uploadProgress.mainImage && (
            <ActivityIndicator size="small" color="#fff" />
          )}
        </TouchableOpacity>
        {Platform.OS === 'web' && (
          <input
            ref={mainImageInputRef}
            type="file"
            accept="image/*"
            style={{display: 'none'}}
            onChange={handleMainImageChange}
          />
        )}
      </TouchableOpacity>
    </>
  );
};

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
  uploadButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
});
