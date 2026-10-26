import {mdiCrop} from '@mdi/js';
import MdiIcon from '../MdiIcon';
import {Title} from './Title';
import userIcon from '../../assets/mobile/user-icon.png';
import {cx, stopClick} from '../lib/rnStyle';
import styles from './fields.module.css';

export const ProfilePictureUpload = ({
  mainImage,
  uploadProgress,
  handleMainImageUpload,
  handleMainImageChange,
  mainImageInputRef,
  title = 'תמונת נושא או הדמייה',
  required = true,
  /** 'free' (default), 'circle', or 'square' framed preview. */
  previewShape = 'free',
  onEditExistingImage,
}) => {
  const hasImage = Boolean(mainImage?.uri);
  const showEdit = hasImage && typeof onEditExistingImage === 'function';
  const isFramed = previewShape === 'circle' || previewShape === 'square';
  const uploading = !!uploadProgress?.mainImage;

  const frameClass = !hasImage
    ? styles.ppRectHit
    : previewShape === 'circle'
      ? styles.ppCircleHit
      : previewShape === 'square'
        ? styles.ppSquareHit
        : styles.ppRectHit;

  return (
    <>
      <Title text={title} required={required} />
      <div className={styles.ppContainer}>
        <button type="button" className={cx(styles.ppHit, frameClass)} onClick={handleMainImageUpload} disabled={uploading}>
          {hasImage ? (
            <img
              src={mainImage.uri}
              alt=""
              className={isFramed ? styles.ppFramedImage : styles.ppFixedImage}
              style={{objectFit: previewShape === 'circle' ? 'cover' : 'contain'}}
            />
          ) : (
            <span className={styles.ppEmptyState}>
              <img src={userIcon} alt="" className={styles.ppUserIcon} />
              <span className={styles.ppUserText}>תמונת פרופיל</span>
              <span className={styles.uploadPill}>
                <span className={styles.uploadPillText}>העלאת תמונה</span>
              </span>
            </span>
          )}
          {uploading ? (
            <span className={styles.ppOverlay}>
              <span className={styles.spinner} />
            </span>
          ) : null}
        </button>
        {showEdit ? (
          <button type="button" className={styles.ppEditChip} onClick={onEditExistingImage} aria-label="עריכת תמונה">
            <MdiIcon path={mdiCrop} size={21} color="#FFFFFF" />
            <span className={styles.editChipText}>עריכה</span>
          </button>
        ) : null}
        <input
          ref={mainImageInputRef}
          type="file"
          accept="image/*"
          style={{display: 'none'}}
          onChange={handleMainImageChange}
          onClick={stopClick}
        />
      </div>
    </>
  );
};
