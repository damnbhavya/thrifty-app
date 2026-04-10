/**
 * Themed components with Outfit font defaults.
 * All Text rendered through this component uses Outfit_400Regular as baseline.
 */

import { Text as DefaultText, View as DefaultView } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';

export type TextProps = DefaultText['props'];
export type ViewProps = DefaultView['props'];

export function Text(props: TextProps) {
  const { style, ...otherProps } = props;

  return (
    <DefaultText
      style={[{ color: Colors.textPrimary, fontFamily: Fonts.regular }, style]}
      {...otherProps}
    />
  );
}

export function View(props: ViewProps) {
  const { style, ...otherProps } = props;

  return (
    <DefaultView
      style={[{ backgroundColor: Colors.background }, style]}
      {...otherProps}
    />
  );
}
