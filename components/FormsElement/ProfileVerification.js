import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {FormContainer} from './FormContainer';
import {ProfilePictureUpload} from './ProfilePictureUpload';
import {VideoUpload} from './VideoUpload';
import {Divider} from './Divider';
import {Spacing} from '../../constants/styles';

export const ProfileVerification = ({
  mainImage,
  uploadProgress,
  handleMainImageUpload,
  handleMainImageChange,
  mainImageInputRef,
  hasVideo,
  setHasVideo,
  videoFile,
  handleVideoUpload,
  handleVideoChange,
  videoInputRef,
}) => {
  return (
    <FormContainer>
      {/* Profile Picture Section */}
      <ProfilePictureUpload
        title="תמונת פרופיל"
        mainImage={mainImage}
        uploadProgress={uploadProgress}
        handleMainImageUpload={handleMainImageUpload}
        handleMainImageChange={handleMainImageChange}
        mainImageInputRef={mainImageInputRef}
      />

      {/* Video Upload Section */}
      <VideoUpload
        hasVideo={hasVideo}
        setHasVideo={setHasVideo}
        uploadProgress={uploadProgress}
        videoFile={videoFile}
        handleVideoUpload={handleVideoUpload}
        handleVideoChange={handleVideoChange}
        videoInputRef={videoInputRef}
        videoOptionStyle={{marginTop: 20}}>
        <Text
          style={{
            color: '#D2D0DC',
            fontSize: 14,
            marginTop: 10,
            fontFamily: 'Rubik-Regular',
            textAlign: 'right',
          }}>
          כדי להגביר את החיבורים שלכם לשותפים פוטנציאלים, מומלץ לשתף סרטון קצר
          עליכם.
        </Text>
      </VideoUpload>
    </FormContainer>
  );
};

const styles = StyleSheet.create({
  divider: {
    marginVertical: 10,
  },
});
