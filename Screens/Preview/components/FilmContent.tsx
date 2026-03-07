import {FlatList, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {AppImage, AppText, AppView, TouchableOpacity} from '@/components';
import {CastData} from '@/configs/data';
import RelatedContent from './RelatedContent';
import {useNavigation} from '@react-navigation/native';
import routes from '@/navigation/routes';
import { ICast } from '@/types/api/content.types';
import { RootNav } from '@/navigation/AppNavigator';
import FastImage from 'react-native-fast-image';
import { fetchCastsByVOID } from '@/api/content.api';
import Placeholder from '@/components/SkeletonLoader';

interface Props{
  casts: ICast[];
  vodId:string
  genreId:string
}

const FilmContent = ({vodId, genreId}:Props) => {
  const {navigate} = useNavigation<RootNav>();
  const [casts, setCasts] = useState<ICast[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(false)

  async function handleGetCasts(_page?:number){
    if(loading || !hasMore) return;
    try {
      setLoading(true)
      const res = await fetchCastsByVOID({_id:vodId, pagination:{page:_page??1,limit:20}});
      if(res.ok && res.data){
        const data = res.data.data
        setCasts(p =>{
          const exist = new Set<string>(casts.map(x => x._id));
          const merged = [
            ...p,
            ...data.filter(x => !exist.has(x._id))
          ]
          if(p.length === merged.length) setHasMore(false);
          return merged
        })
      }else{
        setHasMore(false)
      }
    } catch (error) {
      setHasMore(false)
    }finally{
      setLoading(false)
    }
  }

   const loadMore = useCallback(() => {
    if (!hasMore || casts.length < 20) return;
    handleGetCasts(casts.length >= page * 20 ? page + 1 : page);
  }, [page, hasMore]);

  useEffect(() =>{
    handleGetCasts();
  }, []);

  // console.log(casts)

  return (
    <AppView className="pt-4 border-t border-grey_200/10 mt-5">
      <AppView className="w-[48px]">
        <AppText className="font-ROBOTO_700 text-white text-[13px]">
          CASTS
        </AppText>
        <AppView
          style={{alignSelf: 'center'}}
          className="w-[35px] mt-[3px] h-[2px] bg-grey_100 rounded-[1px]"
        />
      </AppView>

      <FlatList 
        horizontal
        data={loading ? [...Array(10)]:casts}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item,index) => loading ? index.toString() : item._id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        renderItem={({item:cast}) =>{
          if(loading) return <Placeholder style={{...styles.image, marginRight:10}} />
          return (
            <TouchableOpacity
              className="mr-3"
              onPress={() => navigate(routes.CAST_SCREEN, {cast, vodId})}>
              <AppImage source={{
                uri: cast.photoUrl,
                priority:FastImage.priority.high
                }} style={styles.image} />
              <AppText className="capitalize text-center mt-2 font-ROBOTO_400 text-white text-[10px]">
                {cast.name}
              </AppText>
            </TouchableOpacity>
          )
        }}
      />

      <RelatedContent 
        title="Related Movies" 
        genreId={genreId}
        vodId={vodId}
      />
    </AppView>
  );
};

export default FilmContent;

const styles = StyleSheet.create({
  image: {
    width: 69,
    height: 69,
    borderRadius: 10,
  },
  castView: {
    marginTop: 12,
  },
});
