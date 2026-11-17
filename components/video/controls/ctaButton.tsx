import { View, Text } from 'react-native'
import React from 'react'
import { TouchableOpacity } from 'react-native'
import { Donate_VoteIcon } from '@/assets/icons'

interface Props{
    ctaType?:'vote'|'donate',
    handleCTAFunc: () => void,
    pill?: boolean
}
const CTAButton = ({ctaType, handleCTAFunc, pill = false}:Props) => {
  return (
    <TouchableOpacity
                          onPress={handleCTAFunc}
    style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: pill ? 36 : undefined,
        paddingHorizontal: pill ? 16 : 0,
        borderRadius: pill ? 18 : 0,
        borderWidth: pill ? 1 : 0,
        borderColor: ctaType === 'donate' ? '#FF1313' : 'rgba(255,255,255,0.5)',
    }}>
        {!pill && <View className="-mb-[10px]">
            <Donate_VoteIcon />
        </View>}
        <Text className={`${pill ? '' : 'ml-[5px]'} capitalize font-ROBOTO_700 text-white text-[13px]`}>
            {ctaType}
        </Text>
    </TouchableOpacity>
  )
}

export default CTAButton
