import { View } from 'react-native'
import React, { ReactNode, useEffect, useState } from 'react'
import { useScreenOrientation } from '@/Hooks/useScreenOrientation';
import Orientation from 'react-native-orientation-locker';
import {
  enterVideoImmersive,
  restoreAppSystemChrome,
} from '@/Utils/systemNav';



export interface OrientationInjectedProps {
  isFullscreen: boolean;
  makePortrait: () => void;
  makeFullscreen: () => void;
}

interface OrientationWrapperProps {
  children: (injectedProps: OrientationInjectedProps) => ReactNode;
}

const OrientationWrapper = ({ children }: OrientationWrapperProps) => {
    const {isLandscape: landscape} = useScreenOrientation();
     const [manualLandscape, setManualLandscape] = useState<boolean>(false);
  const [isLandscape, setIsLandscape] = useState<boolean>(false);

   function makePortrait() {
    restoreAppSystemChrome();
    Orientation.lockToPortrait();
    setManualLandscape(false);
    setIsLandscape(false);
}

function makeFullscreen(){
    if(!isLandscape && !manualLandscape){
        if(isLandscape || manualLandscape){
            restoreAppSystemChrome();
            Orientation.lockToPortrait()
        }else{
            enterVideoImmersive();
            Orientation.lockToLandscapeLeft()
        }
            setManualLandscape(!manualLandscape);
            manualLandscape && setIsLandscape(false);
    }
  }

    useEffect(() => {
    Orientation.getOrientation(result => {
      setManualLandscape(result.includes('LANDSCAPE'));
    });

  }, []);

   useEffect(() => {
    if (isLandscape) setManualLandscape(false);

    Orientation.addOrientationListener(result => {
      if (result.includes('LANDSCAPE')) {
        setManualLandscape(result.includes('LANDSCAPE'));
      } else {
        setManualLandscape(false);
        setIsLandscape(false);
      }
    });
  }, [isLandscape, landscape]);


  return (
    <View 
     style={[{
        // height: !isLandscape
        //   ? manualLandscape
        //     ? Size.wp(100)
        //     : screenHeight
        //   : Size.wp(100),
        //     width:
        //       isLandscape || manualLandscape
        //         ? screenHeight
        //         : Size.wp(100),
        flex:1
          },
        ]}
    >
      {children({
        isFullscreen: landscape || manualLandscape,
        makePortrait,
        makeFullscreen,
      })}
    </View>
  )
}

export default OrientationWrapper