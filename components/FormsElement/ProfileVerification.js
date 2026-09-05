import React from 'react';
import {Text} from 'react-native';
import {FormContainer} from './FormContainer';
import {ProfilePictureUpload} from './ProfilePictureUpload';
import {VideoUpload} from './VideoUpload';

export const ProfileVerification = ({
  mainImage,
  uploadProgress,
  handleMainImageUpload,
  handleMainImageChange,
  mainImageInputRef,
  onEditExistingImage,
  hasVideo,
  setHasVideo,
  videoFile,
  handleVideoUpload,
  handleVideoChange,
  videoInputRef,
}) => {
  return (
    <FormContainer>
      <ProfilePictureUpload
        title="תמונת פרופיל"
        mainImage={mainImage}
        uploadProgress={uploadProgress}
        handleMainImageUpload={handleMainImageUpload}
        handleMainImageChange={handleMainImageChange}
        mainImageInputRef={mainImageInputRef}
        circularPreview
        onEditExistingImage={onEditExistingImage}
      />

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
            textAlign: 'left',
          }}>
          כדי להגביר את החיבורים שלכם לשותפים פוטנציאלים, מומלץ לשתף סרטון קצר
          עליכם.
        </Text>
      </VideoUpload>
    </FormContainer>
  );
};
