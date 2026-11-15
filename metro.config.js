const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {withNativeWind} = require('nativewind/metro');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const customConfig = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    assetExts: [
      ...defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),
      'lottie',
    ],
    blockList: [/ios\/Pods\/.*/, /ios\/build\/.*/],
    sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],
  },
};

module.exports = withNativeWind(mergeConfig(defaultConfig, customConfig), {
  input: './global.css',
});
