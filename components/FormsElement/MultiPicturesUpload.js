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
  addMorePhotos,
}) => {
  const [showAdditionalImages, setShowAdditionalImages] = React.useState(false);

  const MoreImagesRender = array => {
    return (
      <View style={styles.additionalImagesGrid}>
        {array.map(index => (
          <TouchableOpacity
            key={index}
            style={styles.imagePlaceholder}
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
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.plusIcon}>+</Text>
            )}
            {Platform.OS === 'web' && (
              <input
                ref={el => (additionalImageInputRefs.current[index] = el)}
                type="file"
                accept="image/*"
                style={{display: 'none'}}
                onChange={e => handleAdditionalImageChange(index, e)}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <>
      <Title text={'תמונת נושא או הדמייה'} required />
      <TouchableOpacity
        style={styles.imageUploadArea}
        onPress={handleMainImageUpload}>
        {uploadProgress.mainImage ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.uploadButtonText}>מעלה תמונה...</Text>
          </View>
        ) : mainImage ? (
          <Image
            source={{uri: mainImage.uri}}
            style={styles.uploadedImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.uploadButtonContainer}>
            <Text style={styles.uploadButtonText}>העלאת תמונה</Text>
          </View>
        )}
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
      <Title text={'תמונות נוספות'} textStyle={styles.sectionTitle} />
      {MoreImagesRender([0, 1])}
      {MoreImagesRender([2, 3])}
      {!showAdditionalImages && (
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
      )}
      {addMorePhotos && showAdditionalImages && MoreImagesRender([4, 5])}
      {addMorePhotos && showAdditionalImages && MoreImagesRender([6, 7])}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2B2A39',
    marginBottom: 10,
  },
  plusIcon: {
    color: Colors.whiteGeneral,
    fontSize: 32,
  },
  sectionTitle: {
    marginTop: 15,
    alignSelf: 'flex-end',
  },
});
