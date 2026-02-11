import React from 'react';
import {StyleSheet, View} from 'react-native';

export const FormContainer = ({children}) => {
  return <View style={styles.formContainer}>{children}</View>;
};

const styles = StyleSheet.create({
  formContainer: {
    backgroundColor: '#2B2A39',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
  },
});
