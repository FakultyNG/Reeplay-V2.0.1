import React, {memo} from 'react';
import {CastButton, CastState, useCastState, useDevices} from 'react-native-google-cast';

interface VideoCastingProps {
  handleCastingFunc?: () => void;
}

const Casting = memo(({}: VideoCastingProps) => {
  const devices = useDevices();
  const castState = useCastState();

  const showCast =
    devices.length > 0 ||
    castState === CastState.CONNECTED ||
    castState === CastState.CONNECTING;

  if (!showCast) {
    return null;
  }

  return <CastButton style={{width: 24, height: 24, marginLeft: 12}} />;
});

export default Casting;
