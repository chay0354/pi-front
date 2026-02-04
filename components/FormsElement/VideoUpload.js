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
import {RadioButton} from './RadioButton';
import {Title} from './Title';
import {Colors} from '../../constants/styles';

export const VideoUpload = ({
  hasVideo,
  setHasVideo,
  uploadProgress,
  videoFile,
  handleVideoUpload,
  handleVideoChange,
  videoInputRef,
}) => {
  return (
    <>
      <TouchableOpacity
        style={styles.videoOption}
        onPress={() => setHasVideo(!hasVideo)}>
        <RadioButton isSelected={hasVideo} />
        <View style={styles.radioSpacer} />
        <Title
          text={'הוסף סרטון'}
          textStyle={{marginBottom: 0, alignSelf: 'center'}}
        />
      </TouchableOpacity>

      {/* Video Upload Section - shown when checkbox is selected */}
      {hasVideo && (
        <View style={styles.videoUploadSection}>
          <TouchableOpacity
            style={styles.videoUploadArea}
            onPress={handleVideoUpload}
            disabled={uploadProgress.video}>
            {uploadProgress.video ? (
              <View style={styles.videoPreview}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.videoPreviewText}>מעלה סרטון...</Text>
              </View>
            ) : videoFile ? (
              <View style={styles.videoPreview}>
                {Platform.OS === 'web' ? (
                  <video
                    src={videoFile.uri}
                    style={styles.videoPreviewElement}
                    controls={false}
                  />
                ) : (
                  // TODO: Video for mobile
                  <Text style={styles.videoPreviewText}>Video Selected</Text>
                )}
              </View>
            ) : (
              <>
                <Image
                  source={require('../../assets/play-button.png')}
                  style={styles.videoUploadImage}
                  resizeMode="contain"
                />
                <Text style={styles.videoText}>העלה סרטון</Text>
                <View style={styles.uploadButtonContainer}>
                  <Text style={styles.uploadButtonText}>העלאת תמונה</Text>
                </View>
              </>
            )}
            {Platform.OS === 'web' && (
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                style={{display: 'none'}}
                onChange={handleVideoChange}
              />
            )}
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  videoOption: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 5,
  },
  radioSpacer: {
    width: 15,
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
  },
  videoPreviewText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  videoPreviewElement: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
});
