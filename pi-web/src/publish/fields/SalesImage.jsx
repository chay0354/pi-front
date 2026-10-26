import {FormContainer} from './FormContainer';
import {Title} from './Title';
import FeedPostPreviewMedia from '../components/FeedPostPreviewMedia';
import cameraIcon from '../../assets/mobile/cameraIcon.png';
import {cx, stopClick} from '../lib/rnStyle';
import styles from './fields.module.css';

export const SalesImage = ({
  salesImage,
  handleSalesImageUpload,
  handleSalesImageChange,
  salesImageInputRef,
  uploadProgress,
  /** Opens Post editor for this category (גלובל / company flows). */
  onPressCreateSalesImage,
  isEditing = false,
  /** Overlay meta from PostEditor (`generalDetails` with post_text_overlays). */
  salesImageEditorMeta = null,
}) => {
  const uploading = !!(uploadProgress && uploadProgress.salesImage);
  const createOrEditLabel = isEditing ? 'ערוך תמונה מכירתית' : 'צור תמונה מכירתית';
  const openSalesImageEditor =
    isEditing && salesImage && onPressCreateSalesImage ? onPressCreateSalesImage : handleSalesImageUpload;

  const mediaUri = salesImage?.uri ? String(salesImage.uri).trim() : '';

  return (
    <FormContainer>
      <Title text="תמונה מכירתית" />
      <p className={styles.siSubTitle}>מומלץ להוסיף תמונה מכירתית על מנת להגביר את החשיפה של הפרוייקט שלכם.</p>
      <button
        type="button"
        className={cx(styles.siBox, salesImage && styles.siBoxFilled)}
        onClick={() => openSalesImageEditor?.()}
        disabled={uploading}>
        {salesImage ? (
          <FeedPostPreviewMedia
            listing={{
              feed_post: true,
              _preferSalesImage: true,
              sales_image_url: mediaUri,
              main_image_url: mediaUri,
              general_details: salesImageEditorMeta?.generalDetails ?? null,
            }}
            className={styles.siPreview}
            style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}
            showOpenHouseChrome={false}
            showVideoPlayIcon={false}
          />
        ) : (
          <>
            <img src={cameraIcon} alt="" className={styles.siCameraIcon} />
            <span className={styles.siCameraText}>תמונה מכירתית</span>
            <span className={styles.uploadPill}>
              <span className={styles.uploadPillText}>העלאת תמונה</span>
            </span>
          </>
        )}
        <span className={styles.siOverlay}>{uploading && <span className={styles.spinner} />}</span>
      </button>
      <input
        ref={salesImageInputRef}
        type="file"
        accept="image/*"
        style={{display: 'none'}}
        onChange={handleSalesImageChange}
        onClick={stopClick}
      />
      <p className={cx(styles.siSubTitle, styles.siCenter)}>או</p>
      <button
        type="button"
        className={styles.siCreate}
        onClick={() => onPressCreateSalesImage?.()}
        disabled={!onPressCreateSalesImage}>
        {createOrEditLabel}
      </button>
    </FormContainer>
  );
};
