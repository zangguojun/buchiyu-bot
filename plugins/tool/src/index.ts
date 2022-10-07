import { Context, Schema, segment } from 'koishi';
import dedent from 'ts-dedent';
import { text } from 'stream/consumers';

export const name = 'tool';

const weatherApi = 'https://api.muxiaoguo.cn/api/tianqi?api_key=caccd053f37d557b';
const beautyPicApi = 'https://api.muxiaoguo.cn/api/meinvtu?api_key=431aa8deeff410fe';
const acgPicApi = 'https://api.muxiaoguo.cn/api/ACG?api_key=9b4198dee7c75e3c';
const biliApi = 'https://api.muxiaoguo.cn/api/Bilibili?api_key=81d8e0eb0fbd39ee';
const hotWordApi = 'https://api.muxiaoguo.cn/api/hybrid?api_key=9f58f965f580763f';
const nowApi = 'https://api.vvhan.com/api/ipCard';
const str2QrApi = 'https://api.muxiaoguo.cn/api/Qrcode?api_key=0b702cf348c151c7';

const hotListApi = 'https://api.vvhan.com/api/hotlist';
const cosplayPicApi = 'https://api.dzzui.com/api/cosplay';
const voiceApi = 'https://api.vore.top/api/TTS';
const searchApi = 'https://api.muxiaoguo.cn/api/Baike?api_key=3eacaebf9af521d3';
const zfbApi = 'https://mm.cqu.cc/share/zhifubaodaozhang/mp3';

export function apply(ctx: Context) {
  // 天气相关
  const weather = ctx.command('weather', { authority: 2 });
  weather
    .subcommand('.today')
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
    })
    .alias('天气');

  weather
    .subcommand('.recent <day:number>', { checkArgCount: false })
    .option('city', '-c [城市名称]', { fallback: '余杭' })
    .action(async ({ options, session }, day = 2) => {
      const rst = await ctx.http.get(weatherApi, { params: { ...options, type: 2 } });
      return rst?.data
        ?.slice(0, day)
        .map((item) => {
          const { day, weather, celsius, wind_direction_1, wind_direction_2, wind_level } = item;
          return dedent`
        城市: ${options?.city}
        日期: ${day}
        天气: ${weather}
        温度: ${celsius}
        风力：${[wind_direction_1, wind_direction_2, wind_level].filter((i) => i).join('/')}
      `;
        })
        .join('\n\n');
    })
    .alias('最近天气');

  weather
    .subcommand('.rainfall', { checkArgCount: true })
    .option('city', '-c [城市名称]', { fallback: '余杭' })
    .action(async ({ options, session }) => {
      const rst = await ctx.http.get(weatherApi, { params: { ...options, type: 4 } });
      return rst?.data?.forecast;
    })
    .alias('降雨');

  // 美图
  ctx
    .command('mm')
    .option('num', '-n [图片数量]', { fallback: 1 })
    .action(async ({ options, session }) => {
      const rst = await ctx.http.get(beautyPicApi, { params: options });
      return rst?.data?.map((item) => segment('image', { url: item?.imgurl })).join();
    })
    .alias('美图');

  // 动漫图片
  ctx
    .command('acg', { authority: 2 })
    .option('size', '-s [mw1024|mw690|bmiddle|small|thumb180|thumbnail|square]', { fallback: 'mw690' })
    .option('type', '-t [json|stream]', { fallback: 'json' })
    .action(async ({ options, session }) => {
      const rst = await ctx.http.get(acgPicApi, { params: options });
      return segment('image', { url: rst?.data.imgurl });
    })
    .alias('动漫图片');

  // cosplay
  ctx
    .command('cosplay')
    .option('format', '-f [json|null]', { fallback: 'json' })
    .action(async ({ options, session }) => {
      if (options?.format === 'json') {
        const rst = await ctx.http.get(cosplayPicApi, { params: options });
        return segment('image', { url: rst?.imgurl });
      } else {
        const rst = await ctx.http.get(cosplayPicApi, { params: options, responseType: 'arraybuffer' });
        return segment('image', { url: `base64://${rst.toString('base64')}` });
      }
    })
    .alias('cosplay');

  // B站
  ctx
    .command('bili <blnum:text>', { checkArgCount: true, authority: 2 })
    .action(async ({ options, session }, blnum) => {
      const rst = await ctx.http.get(biliApi, { params: { blnum } });
      const { pic, title, desc } = rst?.data;
      return [
        segment('image', { url: pic }),
        segment('text', {
          content: dedent`
            标题：${title}
            详情：${desc}
            `,
        }),
      ].join();
    })
    .alias('B站解析');

  // 热词搜索
  ctx
    .command('stem <word:text>', { checkArgCount: true, authority: 2 })
    .action(async ({ options, session }, word) => {
      const rst = await ctx.http.get(hotWordApi, { params: { word } });
      return rst?.data[0]?.desc;
    })
    .alias('梗');

  // 搜狗/百科
  ctx
    .command('search', { authority: 2 })
    .option('word', '-w [百科]')
    .action(async ({ options, session }) => {
      // TODO: api异常
      // const rst = await ctx.http.get(searchApi, { params: options });
      // return rst?.data[0]?.desc;
    })
    .alias('百科');

  // now
  ctx
    .command('now', { authority: 2 })
    .option('tip', '-t [标题]')
    .action(async ({ options, session }) => {
      const rst = await ctx.http.get(nowApi, { params: options, responseType: 'arraybuffer' });
      return segment('image', { url: `base64://${rst.toString('base64')}` });
    });

  // qr
  ctx
    .command('qr <text:text>', { checkArgCount: true, authority: 2 })
    .option('e', '-e [L:7%;M:15%;Q:25%;H:30%修正]', { fallback: 'H' })
    .option('size', '-s [尺寸:50-800px]', { fallback: 800 })
    .option('frame', '-f [边框尺寸:1-10px]', { fallback: 1 })
    .option('type', '-t [img:输出图片;base64:输出编码后的文本]', { fallback: 'base64' })
    .action(async ({ options, session }, text) => {
      let base64Str;
      if (options?.type === 'img') {
        const rst = await ctx.http.get(str2QrApi, { params: { ...options, text }, responseType: 'arraybuffer' });
        base64Str = rst.toString('base64');
      } else {
        const rst = await ctx.http.get(str2QrApi, { params: { ...options, text } });
        base64Str = rst?.data?.base64;
      }
      return segment('image', { url: `base64://${base64Str}` });
    })
    .alias('转二维码');

  // 热搜
  const hotMap = {
    虎扑: 'huPu',
    知乎: 'zhihuHot',
    36: '36Ke',
    百度: 'baiduRD',
    哔哩: 'bili',
    历史: 'history',
    贴吧: 'baiduRY',
    微博: 'wbHot',
    抖音: 'douyinHot',
    豆瓣: 'douban',
    少数派: 'ssPai',
    IT: 'itInfo',
    微信: 'wxHot',
  };
  ctx
    .command('hot <type:text>', { checkArgCount: false, authority: 2 })
    .action(async ({ options, session }, type) => {
      const rst = await ctx.http.get(hotListApi, { params: { type: hotMap[type] || 'bili' } });
      const segmentArray = rst.data.slice(0, 5)?.map((item) => {
        const { title, desc, pic, hot, index } = item;
        const segmentList = [];
        if (pic) segmentList.push(segment('image', { url: pic }));
        return [
          ...segmentList,
          segment('text', {
            content: dedent`
                ${index}、${title}  ${hot && hot}
                ${!desc || title === desc ? '' : `详情：${desc}\n`}
                `,
          }),
        ];
      });
      return segmentArray.flat().join();
    })
    .alias('热搜');

  // 转语音
  ctx
    .command('voice <text:text>', { checkArgCount: true })
    // .option('speed', '-sp [语速（1-15）]', { fallback: '1' })
    // .option('speaker', '-sr [种类（1-6）]', { fallback: '1' })
    .action(async ({ options, session }, text) => {
      if (!text) return '请输入需要转换的内容';
      const rst = await ctx.http.get(voiceApi, { params: { ...options, text } });
      return segment('audio', { url: rst?.data?.download });
    })
    .alias('转语音');

  // 支付宝金额
  ctx
    .command('zfb <amount:text>', { checkArgCount: true })
    .action(async ({ options, session }, amount) => {
      return segment('audio', { url: `${zfbApi}/${amount}.mp3` });
    })
    .alias('支付宝');
}
