import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  I18nManager,
} from 'react-native';
import React from 'react';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {Colors} from '../../constants/styles';
export const SalesImage = ({
  salesImage,
  handleSalesImageUpload,
  handleSalesImageChange,
  salesImageInputRef,
  uploadProgress,
  /** Opens Post editor for this category (גלובל / company flows). */
  onPressCreateSalesImage,
}) => {
  const uploading = !!(uploadProgress && uploadProgress.salesImage);
  return (
    <FormContainer>
      <Title text={'תמונה מכירתית'} />
      <Text style={[styles.subTitle, {textAlign:'left'}]}>
        מומלץ להוסיף תמונה מכירתית על מנת להגביר את החשיפה של הפרוייקט שלכם.
      </Text>
      <TouchableOpacity
        style={styles.fixedImageContainer}
        onPress={handleSalesImageUpload}>
        {salesImage ? (
          <Image
            source={{uri: salesImage.uri}}
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
            <Text style={styles.cameraImageText}>תמונה מכירתית</Text>
            <View style={styles.uploadButtonContainer}>
              <Text style={styles.uploadButtonText}>העלאת תמונה</Text>
            </View>
          </>
        )}
        <TouchableOpacity
          style={styles.uploadButtonOverlay}
          onPress={handleSalesImageUpload}
          disabled={uploading}>
          {uploading && <ActivityIndicator size="small" color="#fff" />}
        </TouchableOpacity>
        {Platform.OS === 'web' && (
          <input
            ref={salesImageInputRef}
            type="file"
            accept="image/*"
            style={{display: 'none'}}
            onChange={handleSalesImageChange}
          />
        )}
      </TouchableOpacity>
      <Text style={[styles.subTitle, {textAlign: 'center'}]}>או</Text>
      <TouchableOpacity
        style={styles.createImageContainer}
        onPress={() => onPressCreateSalesImage?.()}
        disabled={!onPressCreateSalesImage}>
        <Text style={styles.createImageText}>צור תמונה מכירתית</Text>
      </TouchableOpacity>
    </FormContainer>
  );
};

const styles = StyleSheet.create({
  subTitle: {
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
  uploadButtonOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
