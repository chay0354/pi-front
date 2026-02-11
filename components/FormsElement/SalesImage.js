import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import React from 'react';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {Colors} from '../../constants/styles';

export const SalesImage = ({
  mainImage,
  handleMainImageUpload,
  handleMainImageChange,
  mainImageInputRef,
  uploadProgress,
}) => {
  return (
    <FormContainer>
      <Title text={'תמונה מכירתית'} />
      <Text style={styles.subTitle}>
        מומלץ להוסיף תמונה מכירתית על מנת להגביר את החשיפה של הפרוייקט שלכם.
      </Text>
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
          <>
            <Image
              source={require('../../assets/cameraIcon.png')}
              style={styles.cameraIcon}
              resizeMode="contain"
            />
            <Text style={styles.cameraImageText}>תמונת פרופיל</Text>
            <View style={styles.uploadButtonContainer}>
              <Text style={styles.uploadButtonText}>העלאת תמונה</Text>
            </View>
          </>
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
      <Text style={[styles.subTitle, {textAlign: 'center'}]}>או</Text>
      <TouchableOpacity style={styles.createImageContainer} onPress={() => {}}>
        <Text style={styles.createImageText}>צור תמונה מכירתית</Text>
      </TouchableOpacity>
    </FormContainer>
  );
};

const styles = StyleSheet.create({
  subTitle: {
    textAlign: 'right',
    color: '#9E9DA4',
    fontSize: 15,
    fontFamily: 'Rubik-Regular',
  },
  fixedImageContainer: {
    width: '100%',
    height: 500,
    marginVertical: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2B2A39',
  },
  fixedImage: {
    width: '100%',
    height: '100%',
  },
  cameraIcon: {
    width: 60,
    height: 60,
  },
  cameraImageText: {
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
  or: {
    textAlign: 'center',
  },
  createImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  createImageText: {
    color: Colors.whiteGeneral,
    fontSize: 18,
    fontFamily: 'Rubik-Regular',
    textDecorationLine: 'underline',
  },
});
