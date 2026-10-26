import {FormContainer} from './FormContainer';
import {ProfilePictureUpload} from './ProfilePictureUpload';
import {MultiPicturesUpload} from './MultiPicturesUpload';
import {Divider} from './Divider';
import {VideoUpload} from './VideoUpload';

const dividerStyle = {marginVertical: 10};

export const MultiImageWithVideo = ({
  mainImage,
  uploadProgress,
  handleMainImageUpload,
  handleMainImageChange,
  mainImageInputRef,
  additionalImages,
  handleAdditionalImageUpload,
  handleAdditionalImageChange,
  onAdditionalImageWebChange,
  additionalImageInputRefs,
  additionalImageInputRef,
  hasVideo,
  setHasVideo,
  videoFile,
  handleVideoUpload,
  handleVideoChange,
  videoInputRef,
  wayToDisplayAd,
  feedDisplayPriority = 'video',
  setFeedDisplayPriority,
  profilePicture,
  setProfilePicture,
  handleProfilePictureUpload,
  handleProfilePictureChange,
  profilePictureInputRef,
  onEditMainImage,
  onEditAdditionalImage,
  allowMoreImages = false,
}) => {
  const resolvedAdditionalImageChange = handleAdditionalImageChange || onAdditionalImageWebChange;
  const resolvedAdditionalImageInputRefs = additionalImageInputRefs || additionalImageInputRef;
  const showProfilePic =
    setProfilePicture && handleProfilePictureUpload && (handleProfilePictureChange || profilePictureInputRef);

  return (
    <FormContainer>
      {showProfilePic && (
        <>
          <ProfilePictureUpload
            mainImage={profilePicture}
            uploadProgress={{mainImage: uploadProgress?.profilePicture}}
            handleMainImageUpload={handleProfilePictureUpload}
            handleMainImageChange={handleProfilePictureChange}
            mainImageInputRef={profilePictureInputRef}
            title="תמונת פרופיל (יוצג במודעה)"
          />
          <Divider style={dividerStyle} />
        </>
      )}
      <MultiPicturesUpload
        uploadProgress={uploadProgress}
        mainImage={mainImage}
        additionalImages={additionalImages}
        handleMainImageUpload={handleMainImageUpload}
        handleMainImageChange={handleMainImageChange}
        handleAdditionalImageUpload={handleAdditionalImageUpload}
        handleAdditionalImageChange={resolvedAdditionalImageChange}
        mainImageInputRef={mainImageInputRef}
        additionalImageInputRefs={resolvedAdditionalImageInputRefs}
        onEditMainImage={onEditMainImage}
        onEditAdditionalImage={onEditAdditionalImage}
        allowMoreImages={allowMoreImages}
      />
      <Divider style={dividerStyle} />
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
