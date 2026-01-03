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
  height = 200,
  color = Colors.primary,
  backgroundColor = 'transparent',
  barWidth: providedBarWidth,
  barGap: providedBarGap,
}) => {
  // Calculate bar width and gap dynamically to fill the entire width
  const barCount = peaks.length;
  const gapRatio = 0.4; // Gap is 40% of total space per bar
  const totalBarWidth = width / barCount;
  const calculatedBarGap = totalBarWidth * gapRatio;
  const calculatedBarWidth = totalBarWidth - calculatedBarGap;
  
  // Use provided values if available, otherwise use calculated
  const barWidth = providedBarWidth ?? calculatedBarWidth;
  const barGap = providedBarGap ?? calculatedBarGap;
  const finalTotalBarWidth = barWidth + barGap;
  
  console.log(`📊 Waveform: ${barCount} bars, width=${width}px, barWidth=${barWidth.toFixed(2)}, gap=${barGap.toFixed(2)}`);
  
  return (
    <View style={[styles.container, { width, height, backgroundColor }]}>
      <Svg width={width} height={height}>
        {peaks.map((peak, index) => {
          const barHeight = Math.max(2, peak * height);
          const x = index * finalTotalBarWidth;
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
