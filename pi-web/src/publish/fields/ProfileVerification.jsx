import {FormContainer} from './FormContainer';
import {ProfilePictureUpload} from './ProfilePictureUpload';
import {VideoUpload} from './VideoUpload';
import styles from './fields.module.css';

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
}) => (
  <FormContainer>
    <ProfilePictureUpload
      title="תמונת פרופיל"
      mainImage={mainImage}
      uploadProgress={uploadProgress}
      handleMainImageUpload={handleMainImageUpload}
      handleMainImageChange={handleMainImageChange}
      mainImageInputRef={mainImageInputRef}
      previewShape="square"
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
      <p className={styles.pvHint}>כדי להגביר את החיבורים שלכם לשותפים פוטנציאלים, מומלץ לשתף סרטון קצר עליכם.</p>
    </VideoUpload>
  </FormContainer>
);
