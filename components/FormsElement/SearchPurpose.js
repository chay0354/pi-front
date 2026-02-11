import {StyleSheet, Text, View, TouchableOpacity, Image} from 'react-native';
import {FormContainer} from './FormContainer';
import {Title} from './Title';
import {RadioWithText} from './RadioWithText';

export const SearchPurpose = ({searchPurpose, setSearchPurpose}) => {
  return (
    <FormContainer>
      <Title text="מטרת החיפוש" required />
      <View style={styles.radioGroup}>
        <RadioWithText
          title={'מחפש להיכנס'}
          isNotLastIndex={true}
          name={'enter'}
          setName={setSearchPurpose}
          index={0}
          styleDevider={{marginTop: 20}}
          isSelected={searchPurpose === 'enter'}
          radioOptionStyle={{paddingTop: 0}}>
          <Text style={styles.radioOptionDescription}>
            אני מחפש להיכנס לדירת שותפים קיימת.
          </Text>
        </RadioWithText>
        <RadioWithText
          title={'מחפש להכניס'}
          isNotLastIndex={true}
          name={'bring_in'}
          setName={setSearchPurpose}
          index={1}
          styleDevider={{marginTop: 20}}
          isSelected={searchPurpose === 'bring_in'}
          radioOptionStyle={{paddingTop: 15}}>
          <Text style={styles.radioOptionDescription}>
            מתפנה לי חדר בדירת השותפים שבה אני גר אני מעוניין למצוא שותף חדש
            שיגור איתי.
          </Text>
        </RadioWithText>
        <RadioWithText
          title={'מחפש שותף'}
          name={'partner'}
          setName={setSearchPurpose}
          index={2}
          isSelected={searchPurpose === 'partner'}
          radioOptionStyle={{paddingTop: 15}}>
          <Text style={styles.radioOptionDescription}>
            אני מחפש ליצור חיבורים חדשים עם אנשים ולחפש ביחד דירת שותפים
          </Text>
        </RadioWithText>
      </View>
    </FormContainer>
  );
};

const styles = StyleSheet.create({
  radioOptionDescription: {
    color: '#D2D0DC',
    textAlign: 'right',
    marginRight: 39,
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
  },
});
