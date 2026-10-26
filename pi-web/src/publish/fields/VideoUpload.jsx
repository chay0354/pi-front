import {useId} from 'react';
import {RadioIcon} from './RadioIcon';
import {Title} from './Title';
import {RadioButton} from './RadioButton';
import {VideoPreviewThumb} from './VideoPreviewThumb';
import playButton from '../../assets/mobile/play-button.png';
import {cx, toWebStyle} from '../lib/rnStyle';
import styles from './fields.module.css';

export const VideoUpload = ({
  hasVideo,
  setHasVideo,
  uploadProgress,
  videoFile,
  handleVideoChange,
  videoInputRef,
  videoOptionStyle,
  children,
  wayToDisplayAd,
  feedDisplayPriority = 'video',
  setFeedDisplayPriority,
}) => {
  const webInputId = useId();
  const uploading = !!uploadProgress?.video;

  const renderUploadContent = () => {
    if (uploading) {
      return (
        <span className={styles.vuPreview}>
          <span className={styles.spinnerLarge} />
          <span className={styles.vuPreviewText}>מעלה סרטון...</span>
        </span>
      );
    }
    if (videoFile?.uri) {
      return <VideoPreviewThumb uri={videoFile.uri} className={styles.vuPreviewFill} />;
    }
    return (
      <>
        <img src={playButton} alt="" className={styles.vuImage} />
        <span className={styles.vuText}>העלה סרטון</span>
        <span className={styles.uploadPill}>
          <span className={styles.uploadPillText}>העלאת סרטון</span>
        </span>
      </>
    );
  };

  return (
    <>
      <button
        type="button"
        className={styles.vuOption}
        style={toWebStyle(videoOptionStyle)}
        onClick={() => setHasVideo?.(!hasVideo)}
        role="checkbox"
        aria-checked={!!hasVideo}>
        <RadioIcon isSelected={hasVideo} useFigmaStyle />
        <span className={styles.vuRadioSpacer} />
        <Title text="הוסף סרטון" textStyle={{marginBottom: 0}} />
      </button>
      {children}
      {hasVideo ? (
        <div className={styles.vuSection}>
          <div className={cx(styles.vuArea, videoFile && styles.vuAreaWithPreview, uploading && styles.vuAreaDisabled)}>
            <label htmlFor={webInputId} className={styles.vuLabel}>
              {renderUploadContent()}
            </label>
            <input
              id={webInputId}
              ref={videoInputRef}
              type="file"
              accept="video/*"
              style={{display: 'none'}}
              onChange={handleVideoChange}
              disabled={uploading}
            />
          </div>
          {wayToDisplayAd ? (
            <div style={{marginTop: 26}}>
              <Title text="אופן תצוגת המודעה" />
              <RadioButton
                data={[
                  {name: 'video', title: 'וידיאו'},
                  {name: 'mainImage', title: 'תמונה ראשית'},
                ]}
                condition={feedDisplayPriority}
                setCondition={setFeedDisplayPriority}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
};
