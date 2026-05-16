import React from 'react';
import {View} from 'react-native';
import * as RNSvg from 'react-native-svg';

function SvgXmlWeb({xml, width, height, style}) {
  if (!xml) return null;
  return (
    <View
      style={[{width, height}, style]}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{__html: xml}}
    />
  );
}

export const SvgXml =
  typeof RNSvg.SvgXml === 'function' ? RNSvg.SvgXml : SvgXmlWeb;
