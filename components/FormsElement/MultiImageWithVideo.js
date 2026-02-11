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
  addMorePhotos,
}) => {
  return (
    <FormContainer>
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
      />
    </FormContainer>
  );
};

const styles = StyleSheet.create({
  divider: {
    marginVertical: 10,
  },
});
