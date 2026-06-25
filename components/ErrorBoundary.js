import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

/**
 * Last-resort crash guard. Without this, any unhandled render error takes
 * down the entire app with no recovery path (RN's red/white screen).
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {hasError: false};
  }

  static getDerivedStateFromError() {
    return {hasError: true};
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] caught error:', error, info?.componentStack);
    this.props.onError?.(error, info);
  }

  handleRestart = () => {
    this.setState({hasError: false});
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>משהו השתבש</Text>
          <Text style={styles.subtitle}>
            אירעה שגיאה לא צפויה. נסו לרענן את האפליקציה.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
            <Text style={styles.buttonText}>נסה שוב</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#181818',
    paddingHorizontal: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#B0B0B0',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#FFC40A',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonText: {
    color: '#181818',
    fontSize: 15,
    fontWeight: '700',
  },
});
