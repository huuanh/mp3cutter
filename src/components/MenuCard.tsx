import React from 'react';
import {
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, GradientStyles } from '../constants/colors';

interface MenuCardProps {
  title: string;
  icon?: string;
  image?: any;
  onPress: () => void;
  style?: ViewStyle;
}

const MenuCard: React.FC<MenuCardProps> = ({
  title,
  icon,
  image,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.container, style]} activeOpacity={0.8}>
      <LinearGradient
        colors={GradientStyles.primary.colors}
        start={GradientStyles.primary.start}
        end={GradientStyles.primary.end}
        style={styles.gradient}>
        <View style={styles.content}>
          {image ? (
            <Image source={image} style={styles.image} resizeMode="contain" />
          ) : (
            <Text style={styles.icon}>{icon || '🔧'}</Text>
          )}
          <Text style={styles.title}>{title}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  gradient: {
    padding: 20,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 50,
    height: 50,
    marginBottom: 10,
  },
  icon: {
    fontSize: 40,
    marginBottom: 10,
  },
  title: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default MenuCard;