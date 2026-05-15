import {StyleSheet, View, TextInput, I18nManager} from 'react-native';
import {Colors} from '../../constants/styles';
import {Title} from './Title';
export const InputBox = ({
  value,
  setValue,
  title,
  required,
  placeholder,
  inputBoxContainerStyle,
}) => {
  const labelSideSpacing = {marginLeft: 12};
  return (
    <View style={[styles.section, inputBoxContainerStyle]}>
      <Title
        text={title}
        required={required}
        textStyle={[styles.inputLabel, labelSideSpacing]}
        starStyle={{color: Colors.textSecondary}}
      />
      <TextInput
        style={[styles.textInput, {textAlign:'left'}]}
        placeholder={placeholder}
        placeholderTextColor="rgba(255, 255, 255, 0.5)"
        value={value}
        onChangeText={setValue}
        textAlign="left"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 22,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 0,
    color: '#D2D0DC',
  },
  textInput: {
    backgroundColor: '#1E1D27',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#8C85B3',
    paddingHorizontal: 15,
    color: Colors.whiteGeneral,
    fontSize: 20,
    marginTop: 10,
    height: 52,
    fontFamily: 'Rubik-Regular',
  },
});
