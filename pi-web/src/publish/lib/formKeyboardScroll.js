import {createContext, createElement, useCallback, useContext, useMemo} from 'react';

/**
 * Web stand-in for mobile utils/formKeyboardScroll.js. There is no soft keyboard to
 * avoid on desktop, so `keyboardInset` is always 0 and `scrollToField` only nudges
 * the focused field into view.
 */
const FormScrollContext = createContext(null);

export function useKeyboardInset() {
  return 0;
}

export function FormScrollProvider({children}) {
  const onScroll = useCallback(() => {}, []);
  const scrollToField = useCallback(fieldRef => {
    const node = fieldRef?.current;
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({block: 'nearest', behavior: 'smooth'});
    }
  }, []);
  const value = useMemo(() => ({keyboardInset: 0, onScroll, scrollToField}), [onScroll, scrollToField]);
  return createElement(FormScrollContext.Provider, {value}, children);
}

export function useFormScroll() {
  return useContext(FormScrollContext);
}
