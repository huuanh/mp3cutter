/**
 * Simple SVG Waveform Renderer
 * Optimized for trim UI - no gestures, no animations
 */
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Colors } from '../constants/colors';

interface WaveformViewProps {
  peaks: number[];
  width?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  barWidth?: number;
  barGap?: number;
}

export const WaveformView: React.FC<WaveformViewProps> = ({
  peaks,
  width = Dimensions.get('window').width - 40,
  height = 120,
  color = Colors.primary,
  backgroundColor = 'transparent',
  barWidth = 1.5,
  barGap = 1,
}) => {
  const totalBarWidth = barWidth + barGap;
  const barCount = Math.min(peaks.length, Math.floor(width / totalBarWidth));
  console.log(peaks.length, barCount, width, totalBarWidth);
  return (
    <View style={[styles.container, { width, height, backgroundColor }]}>
      <Svg width={width} height={height}>
        {peaks.slice(0, barCount).map((peak, index) => {
          const barHeight = Math.max(2, peak * height);
          const x = index * totalBarWidth;
          const y = (height - barHeight) / 2;
          
          return (
            <Rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={color}
              rx={barWidth / 2}
            />
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
  },
});
