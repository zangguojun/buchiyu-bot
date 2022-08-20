import { Context, Schema, segment } from 'koishi';
import dedent from 'ts-dedent';

export const name = 'tool';

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

const weatherApi = 'https://api.muxiaoguo.cn/api/tianqi?api_key=caccd053f37d557b';
const beautyPicApi = 'https://api.muxiaoguo.cn/api/meinvtu?api_key=431aa8deeff410fe';
const acgPicApi = 'https://api.muxiaoguo.cn/api/ACG?api_key=9b4198dee7c75e3c';
const biliApi = 'https://api.muxiaoguo.cn/api/Bilibili?api_key=81d8e0eb0fbd39ee';
const hotWordApi = 'https://api.muxiaoguo.cn/api/hybrid?api_key=9f58f965f580763f';
const searchApi = 'https://api.muxiaoguo.cn/api/Baike?api_key=3eacaebf9af521d3';
const nowApi = 'https://api.muxiaoguo.cn/api/netcard?api_key=be6e4be8936d0d03';
const str2QrApi = 'https://api.muxiaoguo.cn/api/Qrcode?api_key=0b702cf348c151c7';

export function apply(ctx: Context) {
  // 天气相关
  ctx
    .command('天气', { authority: 2 })
    .option('city', '-c [城市名称]', { fallback: '余杭' })
    .action(async ({ options, session }) => {
      const rst = await ctx.http.get(weatherApi, { params: { ...options, type: 1 } });
      const { cityname, temp, WD, WS, SD, weather, time } = rst.data;
      return dedent`
      城市: ${cityname}
      时间: ${time}
      天气: ${weather}/${temp}℃
      风力：${WS}/${WD}
      湿度：${SD}
      `;
    });
  ctx.command('未来天气 <city:text>', { authority: 2 }).action(async ({ options, session }, city = '余杭') => {
    const rst = await ctx.http.get(weatherApi, { params: { type: 2, city } });
    return rst?.data
      ?.slice(0, 2)
      .map((item) => {
        const { day, weather, celsius, wind_direction_1, wind_direction_2, wind_level } = item;
        return dedent`
        城市: ${city}
        日期: ${day}
        天气: ${weather}
        温度: ${celsius}
        风力：${[wind_direction_1, wind_direction_2, wind_level].join('/')}
      `;
      })
      .join('');
  });
  ctx.command('降雨 <city:text>', { authority: 2 }).action(async ({ options, session }, city = '余杭') => {
    const rst = await ctx.http.get(weatherApi, { params: { type: 4, city } });
    return rst?.data?.forecast;
  });

  // 图片
  ctx
    .command('mm', { authority: 2 })
    .option('num', '-n [图片数量]', { fallback: 1 })
    .action(async ({ options, session }) => {
      const rst = await ctx.http.get(beautyPicApi, { params: options });
      return segment.join(rst?.data?.map((item) => ({ type: 'image', data: { url: item?.imgurl } })));
    });
  ctx
    .command('acg', { authority: 2 })
    .option('size', '-s [mw1024|mw690|bmiddle|small|thumb180|thumbnail|square]', { fallback: 'mw690' })
    .option('type', '-t [json|stream]', { fallback: 'json' })
    .action(async ({ options, session }) => {
      const rst = await ctx.http.get(acgPicApi, { params: options });
      return segment('image', { url: rst?.data.imgurl });
    });

  // B站
  ctx
    .command('bili', { authority: 2 })
    .option('blnum', '-b [AV号|BV号]')
    .action(async ({ options, session }) => {
      const rst = await ctx.http.get(biliApi, { params: options });
      const { pic, title, desc } = rst?.data;
      return segment.join([
        { type: 'image', data: { url: pic } },
        {
          type: 'text',
          data: {
            content: dedent`
        标题：${title}
        详情：${desc}
        `,
          },
        },
      ]);
    });

  // 热词搜索
  ctx
    .command('hot', { authority: 2 })
    .option('word', '-w [xswl|yyds]')
    .action(async ({ options, session }) => {
      const rst = await ctx.http.get(hotWordApi, { params: options });
      return rst?.data[0]?.desc;
    });

  // 搜狗/百科
  ctx
    .command('search', { authority: 2 })
    .option('word', '-w [百科]')
    .action(async ({ options, session }) => {
      const rst = await ctx.http.get(searchApi, { params: options });
      return rst?.data[0]?.desc;
    });

  // now
  ctx
    .command('now', { authority: 2 })
    .option('slogan', '-s [标题]', { fallback: 'buchiyu' })
    .action(async ({ options, session }) => {
      // TODO: 将文件流转成base64
      // const rst = await ctx.http.get(nowApi, { params: options })
    });

  // qr
  ctx
    .command('qr <word:text>', { authority: 2 })
    .option('e', '-e [L:7%;M:15%;Q:25%;H:30%修正]', { fallback: 'L' })
    .option('size', '-s [尺寸:50-800px]', { fallback: '800' })
    .option('frame', '-f [边框尺寸:1-10px]', { fallback: '2' })
    .option('type', '-t [img:输出图片;base64:输出编码后的文本;text:编码后矩阵]', { fallback: 'base64' })
    .action(async ({ options, session }, word) => {
      const rst = await ctx.http.get(str2QrApi, { params: { ...options, word } });
      return segment('image', { url: rst?.data?.base64 });
    });
}
