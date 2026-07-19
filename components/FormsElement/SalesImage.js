import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import React, {useMemo, useState, useCallback} from 'react';
import {Video, ResizeMode} from 'expo-av';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {Colors} from '../../constants/styles';
import PostTextOverlays from '../PostTextOverlays';
import {parsePostTextOverlayPayload} from '../../utils/postTextOverlay';

/** Same portrait frame as PostEditor / stories — avoids cutting the composition. */
const PREVIEW_ASPECT = 9 / 16;

const isVideoUri = uri => {
  const s = String(uri || '').trim();
  if (!s) return false;
  return /\.(mp4|m3u8|webm|mov|m4v)(\?|$)/i.test(s) || /\/videos?\//i.test(s);
};

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
  const isVideo = isVideoUri(mediaUri);

  const overlayPayload = useMemo(() => {
    const gd = salesImageEditorMeta?.generalDetails;
    if (!gd || typeof gd !== 'object') return null;
    if (gd.post_text_baked === true) return null;
    return parsePostTextOverlayPayload({general_details: gd});
  }, [salesImageEditorMeta]);

  const [previewSize, setPreviewSize] = useState({w: 0, h: 0});
  const onPreviewLayout = useCallback(
    event => {
      const {width, height} = event?.nativeEvent?.layout || {};
      if (
        width > 0 &&
        height > 0 &&
        (Math.abs(width - previewSize.w) > 1 ||
          Math.abs(height - previewSize.h) > 1)
      ) {
        setPreviewSize({w: width, h: height});
      }
    },
    [previewSize.h, previewSize.w],
  );

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
        onLayout={onPreviewLayout}
        activeOpacity={0.9}>
        {salesImage ? (
          <View style={styles.previewMediaWrap}>
            {isVideo ? (
              <Video
                source={{uri: mediaUri}}
                style={styles.fixedImage}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                isMuted
                useNativeControls={false}
              />
            ) : (
              <Image
                source={{uri: mediaUri}}
                style={styles.fixedImage}
                resizeMode="cover"
              />
            )}
            {overlayPayload?.overlays?.length &&
            previewSize.w > 0 &&
            previewSize.h > 0 ? (
              <PostTextOverlays
                overlays={overlayPayload.overlays}
                previewWidth={overlayPayload.previewWidth}
                previewHeight={overlayPayload.previewHeight}
                coordsSpace={overlayPayload.coordsSpace}
                feedWidth={previewSize.w}
                feedHeight={previewSize.h}
              />
            ) : null}
          </View>
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
  /** Match PostEditor portrait stage so the finished sales image isn't cropped. */
  fixedImageContainerFilled: {
    height: undefined,
    width: '72%',
    maxWidth: 300,
    aspectRatio: PREVIEW_ASPECT,
  },
  previewMediaWrap: {
    ...StyleSheet.absoluteFillObject,
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
