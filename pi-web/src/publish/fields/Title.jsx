import {flatten, toWebStyle} from '../lib/rnStyle';
import styles from './fields.module.css';

export const Title = ({text = '', required = false, textStyle = {}, starStyle}) => {
  const {marginBottom, ...titleTextStyle} = flatten(textStyle);
  return (
    <div className={styles.titleRow} style={marginBottom != null ? toWebStyle({marginBottom}) : undefined}>
      <span className={styles.titleText} style={toWebStyle(titleTextStyle)}>
        {text}
      </span>
      {required ? (
        <span className={styles.titleStar} style={toWebStyle(starStyle)}>
          *
        </span>
      ) : null}
    </div>
  );
};
