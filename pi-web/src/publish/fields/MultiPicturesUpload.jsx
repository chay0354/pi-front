import {useState} from 'react';
import {mdiCrop} from '@mdi/js';
import MdiIcon from '../MdiIcon';
import {Title} from './Title';
import {stopClick} from '../lib/rnStyle';
import styles from './fields.module.css';

export const MultiPicturesUpload = ({
  uploadProgress,
  mainImage,
  additionalImages,
  handleMainImageUpload,
  handleMainImageChange,
  handleAdditionalImageUpload,
  handleAdditionalImageChange,
  mainImageInputRef,
  additionalImageInputRefs,
  onEditMainImage,
  onEditAdditionalImage,
  allowMoreImages = false,
}) => {
  const [showAdditionalImages, setShowAdditionalImages] = useState(false);
  const progress = uploadProgress || {};
  const images = additionalImages || [];
  const hasExtraImages = [4, 5, 6, 7, 8, 9].some(index => images[index]?.uri);
  const extraVisible = (allowMoreImages && showAdditionalImages) || hasExtraImages;

  const moreImagesRender = array => (
    <div className={styles.mpGrid}>
      {array.map(index => {
        const busy = !!progress[`additional-${index}`];
        const image = images[index];
        return (
          <div key={index} className={styles.mpPlaceholder}>
            <button
              type="button"
              className={styles.mpPlaceholderHit}
              onClick={() => handleAdditionalImageUpload?.(index)}
              disabled={busy}>
              {busy ? (
                <span className={styles.mpUploading}>
                  <span className={styles.spinner} />
                </span>
              ) : image ? (
                <img src={image.uri} alt="" className={styles.mpUploadedImage} />
              ) : (
                <span className={styles.mpPlusIcon}>+</span>
              )}
            </button>
            {image?.uri && typeof onEditAdditionalImage === 'function' ? (
              <div className={styles.mpThumbEditWrap}>
                <button
                  type="button"
                  className={styles.mpThumbEdit}
                  onClick={() => onEditAdditionalImage(index)}
                  aria-label="עריכת תמונה">
                  <MdiIcon path={mdiCrop} size={21} color="#FFFFFF" />
                </button>
              </div>
            ) : null}
            <input
              ref={el => {
                if (additionalImageInputRefs?.current) additionalImageInputRefs.current[index] = el;
              }}
              type="file"
              accept="image/*"
              style={{display: 'none'}}
              onChange={e => handleAdditionalImageChange?.(index, e)}
              onClick={stopClick}
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <Title text="תמונת נושא או הדמייה" required />
      <div className={styles.mpUploadArea}>
        <button type="button" className={styles.mpUploadHit} onClick={handleMainImageUpload} disabled={!!progress.mainImage}>
          {progress.mainImage ? (
            <span className={styles.mpUploading}>
              <span className={styles.spinner} />
              <span className={styles.uploadPillText}>מעלה תמונה...</span>
            </span>
          ) : mainImage ? (
            <img src={mainImage.uri} alt="" className={styles.mpUploadedImage} />
          ) : (
            <span className={styles.uploadPill}>
              <span className={styles.uploadPillText}>העלאת תמונה</span>
            </span>
          )}
        </button>
        {mainImage?.uri && typeof onEditMainImage === 'function' ? (
          <div className={styles.mpEditChipWrap}>
            <button type="button" className={styles.mpEditChip} onClick={onEditMainImage} aria-label="עריכת תמונה">
              <MdiIcon path={mdiCrop} size={21} color="#FFFFFF" />
              <span className={styles.editChipText}>עריכה</span>
            </button>
          </div>
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
      <Title text="תמונות נוספות" textStyle={{marginTop: 20, alignSelf: 'flex-start'}} />
      {moreImagesRender([0, 1])}
      {moreImagesRender([2, 3])}
      {allowMoreImages && !extraVisible ? (
        <button type="button" className={styles.mpMoreButton} onClick={() => setShowAdditionalImages(true)}>
          הוסף עוד תמונות
        </button>
      ) : null}
      {extraVisible ? moreImagesRender([4, 5]) : null}
      {extraVisible ? moreImagesRender([6, 7]) : null}
      {extraVisible ? moreImagesRender([8, 9]) : null}
    </>
  );
};
