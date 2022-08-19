import { Context, Schema, segment } from 'koishi'

export const name = 'tool'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

const weatherApi = 'https://api.muxiaoguo.cn/api/tianqi?api_key=caccd053f37d557b'
const beautyPicApi = 'https://api.muxiaoguo.cn/api/meinvtu?api_key=431aa8deeff410fe&num=1'
const acgPicApi = 'https://api.muxiaoguo.cn/api/ACG?api_key=9b4198dee7c75e3c&type=json&size=square'

export function apply(ctx: Context) {
  // 天气相关
  ctx.command('天气 <city:text>', { authority: 2 })
    .action(async ({ options, session }, city = '余杭') => {
      const rst = await ctx.http.get(weatherApi, { params: { type: 1, city } })
      const { cityname, temp, WD, WS, SD, weather, time } = rst.data
      return (`
      城市: ${cityname}
      时间: ${time}
      天气: ${weather}/${temp}℃
      风力：${WS}/${WD}
      湿度：${SD}
      `)
    })
  ctx.command('未来天气 <city:text>', { authority: 2 })
    .action(async ({ options, session }, city = '余杭') => {
      const rst = await ctx.http.get(weatherApi, { params: { type: 2, city } })
      return rst?.data?.slice(0, 2).map(item => {
        const { day, weather, celsius, wind_direction_1, wind_direction_2, wind_level } = item
        return (`
        城市: ${city}
        日期: ${day}
        天气: ${weather}
        温度: ${celsius}
        风力：${[wind_direction_1, wind_direction_2, wind_level].join('/')}
      `)
      }).join('')
    })
  ctx.command('降雨 <city:text>', { authority: 2 })
    .action(async ({ options, session }, city = '余杭') => {
      const rst = await ctx.http.get(weatherApi, { params: { type: 4, city } })
      return rst?.data?.forecast
    })

  // 图片
  ctx.command('mm', { authority: 2 })
    .action(async ({ options, session }) => {
      const rst = await ctx.http.get(beautyPicApi, { params: { num: 1 } })
      return segment('image', { url: rst?.data[0].imgurl })
    })
  ctx.command('acg', { authority: 2 })
    .option('size', '-s [mw1024|mw690|bmiddle|small|thumb180|thumbnail|square]')
    .action(async ({ options, session }) => {
      const rst = await ctx.http.get(acgPicApi, { params: options })
      return segment('image', { url: rst?.data.imgurl })
    })

}
