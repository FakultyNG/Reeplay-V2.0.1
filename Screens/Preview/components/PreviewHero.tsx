import {StyleSheet, View} from 'react-native';
import FastImage from 'react-native-fast-image';
import colors from '@/configs/colors';
import Size from '@/Utils/useResponsiveSize';
import {IVODContent} from '@/types/api/content.types';
import P_Header from './P_Header';

type Props = {
  isFullscreen: boolean;
  headerMountKey: number;
  showExitCover: boolean;
  previewContent: IVODContent;
  onToggleFullscreen: () => void;
};

const PreviewHero = ({
  isFullscreen,
  headerMountKey,
  showExitCover,
  previewContent,
  onToggleFullscreen,
}: Props) => (
  <View
    style={{
      height: isFullscreen ? Size.wp(100) : 216,
      width: '100%',
      overflow: 'hidden',
      backgroundColor: colors.DEEP_BLACK,
    }}>
    <P_Header
      key={headerMountKey}
      isFullscreen={isFullscreen}
      setFullscreen={onToggleFullscreen}
      content={previewContent}
    />
    {!isFullscreen && showExitCover && (
      <FastImage
        source={{
          uri:
            previewContent.landscapePhoto || previewContent.portraitPhoto,
        }}
        style={StyleSheet.absoluteFillObject}
        resizeMode={FastImage.resizeMode.cover}
      />
    )}
  </View>
);

export default PreviewHero;
