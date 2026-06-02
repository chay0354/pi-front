import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {Dimensions, Keyboard, Platform} from 'react-native';

const FormScrollContext = createContext(null);

export function FormScrollProvider({headerOffset = 0, footerOffset = 0, children}) {
  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const pendingFieldRef = useRef(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const performScroll = useCallback(
    fieldRef => {
      const field = fieldRef?.current;
      const scrollView = scrollRef.current;
      if (!field || !scrollView) return;

      const keyboardHeight =
        keyboardInset || (Platform.OS === 'ios' ? 320 : 280);
      const windowHeight = Dimensions.get('window').height;
      const visibleBottom =
        windowHeight - keyboardHeight - headerOffset - footerOffset - 24;

      field.measureInWindow((_x, fieldTop, _width, fieldHeight) => {
        const fieldBottom = fieldTop + fieldHeight;
        if (fieldBottom <= visibleBottom) return;
        scrollView.scrollTo({
          y: scrollYRef.current + (fieldBottom - visibleBottom) + 16,
          animated: true,
        });
      });
    },
    [keyboardInset, headerOffset, footerOffset],
  );

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = event => {
      setKeyboardInset(event.endCoordinates?.height ?? 0);
    };
    const onHide = () => {
      setKeyboardInset(0);
      pendingFieldRef.current = null;
    };
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (keyboardInset > 0 && pendingFieldRef.current) {
      performScroll(pendingFieldRef.current);
    }
  }, [keyboardInset, performScroll]);

  const onScroll = useCallback(event => {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  const scrollToField = useCallback(
    fieldRef => {
      pendingFieldRef.current = fieldRef;
      requestAnimationFrame(() => {
        performScroll(fieldRef);
        if (Platform.OS === 'android') {
          setTimeout(() => performScroll(fieldRef), 120);
        }
      });
    },
    [performScroll],
  );

  return (
    <FormScrollContext.Provider
      value={{scrollRef, keyboardInset, onScroll, scrollToField}}>
      {children}
    </FormScrollContext.Provider>
  );
}

export function useFormScroll() {
  return useContext(FormScrollContext);
}
