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

export const ProfilePictureUpload = ({
  mainImage,
  uploadProgress,
  handleMainImageUpload,
  handleMainImageChange,
  mainImageInputRef,
}) => {
  return (
    <>
      <Title text={'תמונת נושא או הדמייה'} required />
      <View style={styles.fixedImageContainer}>
        {mainImage ? (
          <Image
            source={{uri: mainImage.uri}}
            style={styles.fixedImage}
            resizeMode="contain"
          />
        ) : (
          <Image
            source={require('../../assets/image-insert-2.png')}
            style={styles.fixedImage}
            resizeMode="contain"
          />
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
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  fixedImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#2B2A39',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fixedImage: {
    width: '100%',
    height: '100%',
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
