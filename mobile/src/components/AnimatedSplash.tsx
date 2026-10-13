import { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// Lexis açılış animasyonu (Yıldız Tozu + Shimmer Sweep konsepti)
//
// Native expo-splash-screen (bkz. app.json) sadece statik logo gösterir;
// bu komponent, native splash kapandığı anda onun yerini alan, JS
// seviyesinde animasyonlu bir "intro" ekranıdır. _layout.tsx'teki
// RootNavigator, isLoading bitene (ve minimum süre dolana) kadar bunu
// render eder.
//
// 12 dilde kelime öğren -> altı dilde örnek "merhaba" kelimesi sırayla
// beliriyor: Türkçe, İngilizce, İspanyolca, Fransızca, Japonca, Korece.
const WORDS = ['Merhaba', 'Hello', 'Hola', 'Bonjour', 'こんにちは', '안녕하세요'];
const WORD_INTERVAL_MS = 1500;

// Yıldız tozu parçacıkları: [left%, top%, size, renk, süre(ms), gecikme(ms)]
const PARTICLES: Array<[number, number, number, string, number, number]> = [
  [14, 70, 3, '#378ADD', 6000, 0],
  [24, 82, 2, '#FFFFFF', 7500, 600],
  [76, 74, 3, '#8B82E8', 8200, 1100],
  [84, 60, 2, '#FFFFFF', 6800, 300],
  [10, 55, 2, '#534AB7', 9000, 1800],
  [90, 78, 3, '#378ADD', 7000, 2300],
  [34, 88, 2, '#FFFFFF', 6400, 900],
  [64, 85, 3, '#8B82E8', 7800, 1500],
  [50, 92, 2, '#FFFFFF', 8600, 200],
  [20, 20, 2, '#378ADD', 7200, 2600],
  [80, 18, 2, '#534AB7', 8000, 1300],
];

function Particle({
  left,
  top,
  size,
  color,
  duration,
  delay,
}: {
  left: number;
  top: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(withTiming(-120, { duration, easing: Easing.inOut(Easing.ease) }), -1, false),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: duration * 0.15 }),
          withTiming(0.8, { duration: duration * 0.7 }),
          withTiming(0, { duration: duration * 0.15 }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, duration, opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: `${left}%`,
          top: `${top}%`,
          width: size,
          height: size,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

function ShimmerLogo() {
  const sweepX = useSharedValue(-140);

  useEffect(() => {
    sweepX.value = withRepeat(
      withSequence(
        withTiming(-140, { duration: 0 }),
        withDelay(2300, withTiming(-140, { duration: 0 })),
        withTiming(160, { duration: 900, easing: Easing.out(Easing.cubic) }),
        withDelay(1200, withTiming(160, { duration: 0 })),
      ),
      -1,
      false,
    );
  }, [sweepX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sweepX.value }, { rotate: '20deg' }],
  }));

  const logoScale = useSharedValue(0.85);
  const logoOpacity = useSharedValue(0);

  useEffect(() => {
    logoScale.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.exp) });
    logoOpacity.value = withTiming(1, { duration: 550 });
  }, [logoOpacity, logoScale]);

  const popInStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <Animated.View style={[styles.logoShadowWrap, popInStyle]}>
      <View style={styles.logoClip}>
        <Image
          source={require('../../assets/images/splash-icon.png')}
          style={styles.logoImage}
          contentFit="cover"
        />
        <Animated.View style={[styles.shimmerBar, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

export function AnimatedSplash() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % WORDS.length);
    }, WORD_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.container}>
      {PARTICLES.map(([left, top, size, color, duration, delay], i) => (
        <Particle key={i} left={left} top={top} size={size} color={color} duration={duration} delay={delay} />
      ))}

      <ShimmerLogo />

      <View style={styles.wordSlot}>
        <Animated.Text
          key={wordIndex}
          entering={FadeIn.duration(260)}
          exiting={FadeOut.duration(260)}
          style={styles.wordText}
        >
          {WORDS[wordIndex]}
        </Animated.Text>
      </View>

      <Text style={styles.caption}>12 DİLDE KELİME ÖĞREN</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071D45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    borderRadius: 999,
  },
  logoShadowWrap: {
    width: 116,
    height: 116,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 14,
  },
  logoClip: {
    width: 116,
    height: 116,
    borderRadius: 26,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  shimmerBar: {
    position: 'absolute',
    top: -40,
    left: 0,
    width: 60,
    height: 220,
  },
  wordSlot: {
    marginTop: 34,
    height: 34,
    width: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordText: {
    position: 'absolute',
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  caption: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
