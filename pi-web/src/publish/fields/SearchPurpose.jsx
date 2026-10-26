import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioWithText} from './RadioWithText';
import styles from './fields.module.css';

export const SearchPurpose = ({searchPurpose, setSearchPurpose}) => (
  <FormContainer>
    <Title text="מטרת החיפוש" required />
    <div>
      <RadioWithText
        title="מחפש להיכנס"
        isNotLastIndex
        name="enter"
        setName={setSearchPurpose}
        index={0}
        styleDevider={{marginTop: 20}}
        isSelected={searchPurpose === 'enter'}
        radioOptionStyle={{paddingTop: 0}}>
        <p className={styles.spDescription}>אני מחפש להיכנס לדירת שותפים קיימת.</p>
      </RadioWithText>
      <RadioWithText
        title="מחפש להכניס"
        isNotLastIndex
        name="bring_in"
        setName={setSearchPurpose}
        index={1}
        styleDevider={{marginTop: 20}}
        isSelected={searchPurpose === 'bring_in'}
        radioOptionStyle={{paddingTop: 15}}>
        <p className={styles.spDescription}>
          מתפנה לי חדר בדירת השותפים שבה אני גר אני מעוניין למצוא שותף חדש שיגור איתי.
        </p>
      </RadioWithText>
      <RadioWithText
        title="מחפש שותף"
        name="partner"
        setName={setSearchPurpose}
        index={2}
        isSelected={searchPurpose === 'partner'}
        radioOptionStyle={{paddingTop: 15}}>
        <p className={styles.spDescription}>אני מחפש ליצור חיבורים חדשים עם אנשים ולחפש ביחד דירת שותפים</p>
      </RadioWithText>
    </div>
  </FormContainer>
);
