import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {Title} from './Title';
import {Colors} from '../../constants/styles';

export const MultiPicturesUpload = ({
  uploadProgress,
  mainImage,
  additionalImages,
  handleMainImageUpload,
  handleMainImageChange,
  handleAdditionalImageUpload,
  handleAdditionalImageChange,
  mainImageInputRef,
  additionalImageInputRefs,
  onEditMainImage,
  onEditAdditionalImage,
  allowMoreImages = false,
}) => {
  const [showAdditionalImages, setShowAdditionalImages] = React.useState(false);
  const hasExtraImages = [4, 5, 6, 7, 8, 9].some(
    index => additionalImages?.[index]?.uri,
  );
  const extraVisible = (allowMoreImages && showAdditionalImages) || hasExtraImages;

  const MoreImagesRender = array => {
    return (
      <View style={styles.additionalImagesGrid}>
        {array.map(index => (
          <View key={index} style={styles.imagePlaceholder}>
            <TouchableOpacity
              style={styles.imagePlaceholderHit}
              onPress={() => handleAdditionalImageUpload(index)}
              disabled={uploadProgress[`additional-${index}`]}>
              {uploadProgress[`additional-${index}`] ? (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              ) : additionalImages[index] ? (
                <Image
                  source={{uri: additionalImages[index].uri}}
                  style={styles.uploadedImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.plusIcon}>+</Text>
              )}
            </TouchableOpacity>
            {additionalImages[index]?.uri &&
            typeof onEditAdditionalImage === 'function' ? (
              <View style={styles.thumbEditWrap} pointerEvents="box-none">
                <TouchableOpacity
                  style={styles.thumbEdit}
                  onPress={() => onEditAdditionalImage(index)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="עריכת תמונה">
                  <MaterialCommunityIcons
                    name="crop"
                    size={16}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            ) : null}
            {Platform.OS === 'web' && (
              <input
                ref={el => (additionalImageInputRefs.current[index] = el)}
                type="file"
                accept="image/*"
                style={{display: 'none'}}
                onChange={e => handleAdditionalImageChange(index, e)}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <>
      <Title text={'תמונת נושא או הדמייה'} required />
      <View style={styles.imageUploadArea}>
        <TouchableOpacity
          style={styles.imageUploadHit}
          onPress={handleMainImageUpload}
          disabled={uploadProgress.mainImage}>
          {uploadProgress.mainImage ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.uploadButtonText}>מעלה תמונה...</Text>
            </View>
          ) : mainImage ? (
            <Image
              source={{uri: mainImage.uri}}
              style={styles.uploadedImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.uploadButtonContainer}>
              <Text style={styles.uploadButtonText}>העלאת תמונה</Text>
            </View>
          )}
        </TouchableOpacity>
        {mainImage?.uri && typeof onEditMainImage === 'function' ? (
          <View style={styles.editChipWrap} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.editChip}
              onPress={onEditMainImage}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="עריכת תמונה">
              <MaterialCommunityIcons name="crop" size={16} color="#FFFFFF" />
              <Text style={styles.editChipText}>עריכה</Text>
            </TouchableOpacity>
          </View>
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
      <Title text={'תמונות נוספות'} textStyle={styles.sectionTitle} />
      {MoreImagesRender([0, 1])}
      {MoreImagesRender([2, 3])}
      {allowMoreImages && !extraVisible ? (
        <TouchableOpacity
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 10,
          }}
          onPress={() => setShowAdditionalImages(true)}>
          <Text
            style={{
              color: Colors.whiteGeneral,
              fontSize: 18,
              fontFamily: 'Rubik-Regular',
              textDecorationLine: 'underline',
            }}>
            הוסף עוד תמונות
          </Text>
        </TouchableOpacity>
      ) : null}
      {extraVisible ? MoreImagesRender([4, 5]) : null}
      {extraVisible ? MoreImagesRender([6, 7]) : null}
      {extraVisible ? MoreImagesRender([8, 9]) : null}
    </>
  );
};

const styles = StyleSheet.create({
  imageUploadArea: {
    width: '100%',
    height: 230,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2B2A39',
    overflow: 'hidden',
  },
  imageUploadHit: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editChipWrap: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(30, 29, 39, 0.88)',
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
  },
  editChipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
  },
  uploadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: Colors.whiteGeneral,
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  uploadButtonContainer: {
    backgroundColor: '#4D4966',
    paddingHorizontal: 20,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  additionalImagesGrid: {
    flexDirection: 'row',
    // flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  imagePlaceholder: {
    width: '48%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 15,
    backgroundColor: '#2B2A39',
    marginBottom: 10,
    overflow: 'hidden',
  },
  imagePlaceholderHit: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbEditWrap: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  thumbEdit: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 29, 39, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIcon: {
    color: Colors.whiteGeneral,
    fontSize: 32,
  },
  sectionTitle: {
    marginTop: 15,
    alignSelf: 'flex-start',
  },
});
