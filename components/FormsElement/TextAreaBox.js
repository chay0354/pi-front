import {StyleSheet, View, TextInput} from 'react-native';
import {Title} from './Title';
import {Colors} from '../../constants/styles';

export const TextAreaBox = ({
  title,
  required,
  value,
  setValue,
  placeholder,
}) => {
  return (
    <View>
      <Title
        text={title}
        required={required}
        textStyle={styles.inputLabel}
        starStyle={{color: Colors.textSecondary}}
      />
      <TextInput
        style={styles.textArea}
        placeholder={placeholder}
        placeholderTextColor="rgba(255, 255, 255, 0.5)"
        value={value}
        onChangeText={setValue}
        multiline
      />
    </View>
  );
};

const styles = StyleSheet.create({
  textArea: {
    backgroundColor: '#1E1D27',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#8C85B3',
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: Colors.whiteGeneral,
    fontSize: 16,
    marginTop: 10,
    height: 165,
    textAlign: 'right',
  },
  inputLabel: {
    fontSize: 14,
    marginRight: 12,
    marginBottom: 0,
    color: '#D2D0DC',
  },
});
