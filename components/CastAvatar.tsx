import React, {useEffect, useState} from 'react';
import {StyleProp} from 'react-native';
import FastImage, {ImageStyle} from 'react-native-fast-image';
import AppImage from './AppImage';

const DEFAULT_CAST_AVATAR = require('@/assets/images/default-user-profile.webp');

type Props = {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
};

const CastAvatar = ({uri, style}: Props) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [uri]);

  return (
    <AppImage
      source={
        failed || !uri
          ? DEFAULT_CAST_AVATAR
          : {
              uri,
              priority: FastImage.priority.high,
              cache: FastImage.cacheControl.web,
            }
      }
      style={style}
      resizeMode={FastImage.resizeMode.cover}
      onError={() => setFailed(true)}
    />
  );
};

export default CastAvatar;
