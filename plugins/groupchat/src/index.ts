import { Command, Context, Schema, segment, Session } from 'koishi';
import { sample as _sample } from 'lodash';
import '@koishijs/plugin-adapter-onebot';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

declare module 'koishi' {
  interface Channel {
    lovename: string;
  }
}

export const name = 'groupchat';

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

const statements = [
  '0我是子包，很高兴认识大家1',
  '1你说我为什么叫子包？因为我之前叫包子呀！现在...因为已经有人代替了"包子"，所以...7',
  '2权限不足！权限不足！我是机器人！3',
  '3大三到毕业再到工作，从学生到社畜，感谢陪伴....9',
  '4今天又是开心的一天！9',
  '5积分？不存在的我可是24k/月，你敢想？3',
  '6骂我的话，请一定要用语音2',
  '7我在干嘛？工作日上班，周末维护，缺对象，缺爱2',
  '8是的，我们有一个孩子6',
  '9我什么时候回来？或许是明天、或许是一个月后、或许一年...0',
];

export function apply(ctx: Context) {
  ctx.before('attach-channel', (session, fields) => {
    fields.add('lovename');
  });

  ctx.model.extend('channel', {
    lovename: 'text',
  });

  ctx.channel(...['1058072004', '532250819']).middleware(async (session: Session, next) => {
    const {
      bot,
      content,
      channelId,
      author: { userId, username },
      user,
    } = session;
    if (content.includes('<at id="2637653330"/>')) {
      const selectedStatement = _sample(statements);
      await bot?.sendPrivateMessage('1739932260', `${username}(${userId}): ${content} => ${selectedStatement}`);
      await bot?.sendMessage(channelId, selectedStatement);
      // return session.text(selectedStatement);
    }
    await next();
  });

  ctx
    .channel(...['1058072004', '724924039', '532250819', '#'])
    .middleware(async (session: Session<never, 'lovename'>, next) => {
      console.log('🚀~ 63  user', session);
      const {
        bot,
        content,
        guildId,
        onebot,
        author: { userId, username },
      } = session;
      if (false) {
        const { last_sent_time } = await onebot?.getGroupMemberInfo(guildId, userId, true);
        const lastSentTime = dayjs.unix(last_sent_time);
        const diffHour = dayjs().diff(lastSentTime, 'hour', true);
        if (diffHour < 3) {
          await bot?.sendMessage(guildId, [segment.at(userId), 1].join());
        }
      }
      await next();
    });

  ctx.using(['database'], (ctx) => {
    const cmd = ctx.command('shop [operation:string] <keyword:text>');

    const register = (def: string, callback: Command.Action<never, 'lovename', [string]>) =>
      cmd.subcommand(def, { checkArgCount: true }).channelFields(['lovename']).action(callback);

    register('.add <keyword:text>', async ({ session }, keyword) => {
      const { lovename } = session.channel;
      return session.text(`${lovename} 添加成功！ `);
    }).alias('欢迎词添加');

    register('.remove <keyword:keyword>', async ({ session }, keyword) => {
      const { lovename } = session.channel;
      return session.text(`${lovename} 移除成功！ `);
    }).alias('欢迎词移除');

    register('.list', async ({ session }) => {
      const { lovename } = session.channel;
      if (!lovename) return session.text('暂未添加 欢迎词！');
      return session.text(`欢迎词：${lovename}`);
    }).alias('欢迎词详情');

    register('.test', async ({ session }) => {
      const { lovename } = session.channel;
      if (!lovename) return session.text('暂未添加 欢迎词！');
      return [segment.at('1'), lovename].join();
    }).alias('昵称测试');
  });
}
