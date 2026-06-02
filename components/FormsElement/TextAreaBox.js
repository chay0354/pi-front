import {useRef} from 'react';
import {StyleSheet, View, TextInput} from 'react-native';
import {Title} from './Title';
import {Colors} from '../../constants/styles';
import {useFormScroll} from '../../utils/formKeyboardScroll';

export const TextAreaBox = ({
  title,
  required,
  value,
  setValue,
  placeholder,
  scrollOnFocus = true,
}) => {
  const labelSideSpacing = {marginLeft: 12};
  const wrapRef = useRef(null);
  const formScroll = useFormScroll();

  const handleFocus = () => {
    if (scrollOnFocus && formScroll?.scrollToField) {
      formScroll.scrollToField(wrapRef);
    }
  };

  return (
    <View ref={wrapRef} collapsable={false}>
      <Title
        text={title}
        required={required}
        textStyle={[styles.inputLabel, labelSideSpacing]}
        starStyle={{color: Colors.textSecondary}}
      />
      <TextInput
        style={[styles.textArea]}
        placeholder={placeholder}
        placeholderTextColor="rgba(255, 255, 255, 0.5)"
        value={value}
        onChangeText={setValue}
        onFocus={handleFocus}
        multiline
        textAlign="right"
        textAlignVertical="top"
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
    writingDirection: 'rtl',
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 0,
    color: '#D2D0DC',
  },
});
