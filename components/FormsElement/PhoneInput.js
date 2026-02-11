import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import {Colors} from '../../constants/styles';
import {Title} from './Title';

export const PhoneInput = ({phone, setPhone}) => {
  return (
    <View style={styles.section}>
      <Title
        text={'טלפון'}
        required
        textStyle={styles.inputLabel}
        starStyle={{color: Colors.textSecondary}}
      />
      <View style={styles.phoneInput}>
        <TouchableOpacity>
          <Text style={styles.phoneDropdown}>▼</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.phoneTextInput}
          placeholder="00 000 0000"
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 22,
  },
  phoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1D27',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#8C85B3',
    paddingHorizontal: 15,
    marginTop: 10,
    height: 52,
  },
  inputLabel: {
    fontSize: 14,
    marginRight: 12,
    marginBottom: 0,
    color: '#D2D0DC',
  },
  phoneDropdown: {
    color: Colors.whiteGeneral,
    fontSize: 16,
    marginRight: 10,
  },
  phoneTextInput: {
    flex: 1,
    color: Colors.whiteGeneral,
    fontSize: 20,
    fontFamily: 'Rubik-Regular',
  },
});
