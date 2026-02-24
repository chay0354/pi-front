import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {FormContainer} from './FormContainer';
import {ProfilePictureUpload} from './ProfilePictureUpload';
import {MultiPicturesUpload} from './MultiPicturesUpload';
import {Divider} from './Divider';
import {VideoUpload} from './VideoUpload';

export const MultiImageWithVideo = ({
  mainImage,
  uploadProgress,
  handleMainImageUpload,
  handleMainImageChange,
  mainImageInputRef,
  additionalImages,
  handleAdditionalImageUpload,
  handleAdditionalImageChange,
  additionalImageInputRefs,
  hasVideo,
  setHasVideo,
  videoFile,
  handleVideoUpload,
  handleVideoChange,
  videoInputRef,
  wayToDisplayAd,
  feedDisplayPriority = 'video',
  setFeedDisplayPriority,
  addMorePhotos,
  profilePicture,
  setProfilePicture,
  handleProfilePictureUpload,
  handleProfilePictureChange,
  profilePictureInputRef,
}) => {
  const showProfilePic =
    setProfilePicture &&
    handleProfilePictureUpload &&
    (handleProfilePictureChange || profilePictureInputRef);

  return (
    <FormContainer>
      {showProfilePic && (
        <>
          <ProfilePictureUpload
            mainImage={profilePicture}
            setMainImage={setProfilePicture}
            uploadProgress={{mainImage: uploadProgress?.profilePicture}}
            handleMainImageUpload={handleProfilePictureUpload}
            handleMainImageChange={handleProfilePictureChange}
            mainImageInputRef={profilePictureInputRef}
            title="תמונת פרופיל (יוצג במודעה)"
          />
          <Divider style={styles.divider} />
        </>
      )}
      <MultiPicturesUpload
        uploadProgress={uploadProgress}
        mainImage={mainImage}
        additionalImages={additionalImages}
        handleMainImageUpload={handleMainImageUpload}
        handleMainImageChange={handleMainImageChange}
        handleAdditionalImageUpload={handleAdditionalImageUpload}
        handleAdditionalImageChange={handleAdditionalImageChange}
        mainImageInputRef={mainImageInputRef}
        additionalImageInputRefs={additionalImageInputRefs}
        addMorePhotos={addMorePhotos}
      />
      <Divider style={styles.divider} />
      <VideoUpload
        hasVideo={hasVideo}
        setHasVideo={setHasVideo}
        uploadProgress={uploadProgress}
        videoFile={videoFile}
        handleVideoUpload={handleVideoUpload}
        handleVideoChange={handleVideoChange}
        videoInputRef={videoInputRef}
        wayToDisplayAd={wayToDisplayAd}
        feedDisplayPriority={feedDisplayPriority}
        setFeedDisplayPriority={setFeedDisplayPriority}
      />
    </FormContainer>
  );
};

const styles = StyleSheet.create({
  divider: {
    marginVertical: 10,
  },
});
