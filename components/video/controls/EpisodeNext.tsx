import {Text} from 'react-native'
import React from 'react'
import { TouchableOpacity } from 'react-native'
import { NextIcon } from '@/assets/icons'

const EpisodeNext = ({onPress, expanded = false}: {onPress?: () => void; expanded?: boolean}) => {
  if (!onPress) {
    return null;
  }
  return (
    <TouchableOpacity
    onPress={onPress}
    style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 36,
        paddingHorizontal: expanded ? 14 : 0,
        borderRadius: 18,
        borderWidth: expanded ? 1 : 0,
        borderColor: 'rgba(255,255,255,0.55)',
    }}>
        <NextIcon />
        <Text className="ml-[5px] font-ROBOTO_700 text-white text-[10px]">
            {expanded ? 'Next episode' : 'Next'}
        </Text>
    </TouchableOpacity>
  )
}

export default EpisodeNext
