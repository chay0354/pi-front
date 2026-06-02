import React, {useState} from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  I18nManager,
} from 'react-native';

const ONBOARDING_IMAGES = [
  require('../assets/onbording/1.png'),
  require('../assets/onbording/2.png'),
  require('../assets/onbording/3.png'),
  require('../assets/onbording/4.png'),
  require('../assets/onbording/5.png'),
  require('../assets/onbording/6.png'),
  require('../assets/onbording/7.png'),
  require('../assets/onbording/8.png'),
  require('../assets/onbording/9.png'),
  require('../assets/onbording/10.png'),
  require('../assets/onbording/11.png'),
  require('../assets/onbording/12.png'),
];

const OnboardingSlide = ({imageSource, onNext, onSkip}) => {
  const {width: screenWidth, height: screenHeight} = Dimensions.get('window');
  const skipWidth = screenWidth * 0.1;
  const skipHeight = screenHeight * 0.1;
  const nextWidth = screenWidth * 0.4;
  const nextHeight = screenHeight * 0.2;
  const skipCorner = I18nManager.isRTL ? {left: 0} : {right: 0};

  return (
    <View style={styles.overlay}>
      <Image
        source={imageSource}
        style={styles.image}
        resizeMode="contain"
      />
      <TouchableOpacity
        activeOpacity={1}
        onPress={onSkip}
        style={[
          styles.skipZone,
          skipCorner,
          {width: skipWidth, height: skipHeight},
        ]}
      />
      <TouchableOpacity
        activeOpacity={1}
        onPress={onNext}
        style={[
          styles.nextZone,
          {
            width: nextWidth,
            height: nextHeight,
            left: (screenWidth - nextWidth) / 2,
          },
        ]}
      />
    </View>
  );
};

const OnboardingFlow = ({onComplete}) => {
  const [index, setIndex] = useState(0);

  const finish = () => {
    onComplete?.();
  };

  const handleNext = () => {
    if (index >= ONBOARDING_IMAGES.length - 1) {
      finish();
      return;
    }
    setIndex(current => current + 1);
  };

  return (
    <OnboardingSlide
      imageSource={ONBOARDING_IMAGES[index]}
      onNext={handleNext}
      onSkip={finish}
    />
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E1D27',
    zIndex: 10000,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  skipZone: {
    position: 'absolute',
    top: 0,
    backgroundColor: 'transparent',
  },
  nextZone: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'transparent',
  },
});

export default OnboardingFlow;
