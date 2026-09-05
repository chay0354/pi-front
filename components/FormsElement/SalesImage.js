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
import FeedPostPreviewMedia from '../FeedPostPreviewMedia';

/** Same portrait frame as PostEditor / stories — avoids cutting the composition. */
const PREVIEW_ASPECT = 9 / 16;

export const SalesImage = ({
  salesImage,
  handleSalesImageUpload,
  handleSalesImageChange,
  salesImageInputRef,
  uploadProgress,
  /** Opens Post editor for this category (גלובל / company flows). */
  onPressCreateSalesImage,
  isEditing = false,
  /** Overlay meta from PostEditor (`generalDetails` with post_text_overlays). */
  salesImageEditorMeta = null,
}) => {
  const uploading = !!(uploadProgress && uploadProgress.salesImage);
  const createOrEditLabel = isEditing
    ? 'ערוך תמונה מכירתית'
    : 'צור תמונה מכירתית';
  const openSalesImageEditor =
    isEditing && salesImage && onPressCreateSalesImage
      ? onPressCreateSalesImage
      : handleSalesImageUpload;

  const mediaUri = salesImage?.uri ? String(salesImage.uri).trim() : '';

  return (
    <FormContainer>
      <Title text={'תמונה מכירתית'} />
      <Text style={[styles.subTitle, {textAlign: 'left'}]}>
        מומלץ להוסיף תמונה מכירתית על מנת להגביר את החשיפה של הפרוייקט שלכם.
      </Text>
      <TouchableOpacity
        style={[
          styles.fixedImageContainer,
          salesImage ? styles.fixedImageContainerFilled : null,
        ]}
        onPress={openSalesImageEditor}
        activeOpacity={0.9}>
        {salesImage ? (
          <FeedPostPreviewMedia
            listing={{
              feed_post: true,
              _preferSalesImage: true,
              sales_image_url: mediaUri,
              main_image_url: mediaUri,
              general_details: salesImageEditorMeta?.generalDetails ?? null,
            }}
            style={styles.previewMediaWrap}
            showOpenHouseChrome={false}
            showVideoPlayIcon={false}
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
          onPress={openSalesImageEditor}
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
        <Text style={styles.createImageText}>{createOrEditLabel}</Text>
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
    overflow: 'hidden',
    alignSelf: 'center',
  },
  /** Match PostEditor portrait stage; media uses contain on black. */
  fixedImageContainerFilled: {
    height: undefined,
    width: '72%',
    maxWidth: 300,
    aspectRatio: PREVIEW_ASPECT,
    backgroundColor: '#000000',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderStyle: 'solid',
  },
  previewMediaWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  fixedImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
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
