import React, {useCallback, useId} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Pressable,
} from 'react-native';
import {RadioIcon} from './RadioIcon';
import {Title} from './Title';
import {Colors} from '../../constants/styles';
import {RadioButton} from './RadioButton';
import {VideoPreviewThumb} from './VideoPreviewThumb';

export const VideoUpload = ({
  hasVideo,
  setHasVideo,
  uploadProgress,
  videoFile,
  handleVideoUpload,
  handleVideoChange,
  videoInputRef,
  videoOptionStyle,
  children,
  wayToDisplayAd,
  feedDisplayPriority = 'video',
  setFeedDisplayPriority,
}) => {
  const webInputId = useId();
  const uploading = !!uploadProgress?.video;

  const openPicker = useCallback(() => {
    if (uploading) return;
    handleVideoUpload?.();
  }, [handleVideoUpload, uploading]);

  const renderUploadContent = () => {
    if (uploading) {
      return (
        <View style={styles.videoPreview}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.videoPreviewText}>מעלה סרטון...</Text>
        </View>
      );
    }
    if (videoFile?.uri) {
      return (
        <VideoPreviewThumb uri={videoFile.uri} style={styles.videoPreviewFill} />
      );
    }
    return (
      <>
        <Image
          source={require('../../assets/play-button.png')}
          style={styles.videoUploadImage}
          resizeMode="contain"
        />
        <Text style={styles.videoText}>העלה סרטון</Text>
        <View style={styles.uploadButtonContainer}>
          <Text style={styles.uploadButtonText}>העלאת סרטון</Text>
        </View>
      </>
    );
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.videoOption, videoOptionStyle]}
        onPress={() => setHasVideo(!hasVideo)}>
        <RadioIcon isSelected={hasVideo} useFigmaStyle />
        <View style={styles.radioSpacer} />
        <Title text={'הוסף סרטון'} textStyle={{marginBottom: 0}} />
      </TouchableOpacity>
      {children}
      {hasVideo ? (
        <View style={styles.videoUploadSection}>
          {Platform.OS === 'web' ? (
            <View
              style={[
                styles.videoUploadArea,
                videoFile ? styles.videoUploadAreaWithPreview : null,
              ]}>
              <label
                htmlFor={webInputId}
                style={styles.webFileLabel}>
                {renderUploadContent()}
              </label>
              <input
                id={webInputId}
                ref={videoInputRef}
                type="file"
                accept="video/*"
                style={{display: 'none'}}
                onChange={handleVideoChange}
                disabled={uploading}
              />
            </View>
          ) : (
            <Pressable
              style={[
                styles.videoUploadArea,
                videoFile ? styles.videoUploadAreaWithPreview : null,
                uploading ? styles.videoUploadAreaDisabled : null,
              ]}
              onPress={openPicker}
              disabled={uploading}
              android_ripple={{color: 'rgba(255,255,255,0.08)'}}>
              {renderUploadContent()}
            </Pressable>
          )}
          {wayToDisplayAd ? (
            <View style={{marginTop: 20}}>
              <Title text="אופן תצוגת המודעה" />
              <RadioButton
                data={[
                  {name: 'video', title: 'וידיאו'},
                  {name: 'mainImage', title: 'תמונה ראשית'},
                ]}
                condition={feedDisplayPriority}
                setCondition={setFeedDisplayPriority}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  videoOption: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 5,
  },
  radioSpacer: {
    width: 8,
  },
  videoOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  videoUploadSection: {
    marginTop: 20,
  },
  videoUploadArea: {
    width: '100%',
    height: 230,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: '#2B2A39',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    overflow: 'hidden',
  },
  videoUploadAreaWithPreview: {
    padding: 8,
    alignItems: 'stretch',
  },
  videoUploadAreaDisabled: {
    opacity: 0.7,
  },
  webFileLabel: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  videoUploadContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  videoUploadImage: {
    width: 60,
    height: 60,
  },
  videoText: {
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
  videoPreview: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPreviewFill: {
    flex: 1,
    alignSelf: 'stretch',
  },
  videoPreviewText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
});
