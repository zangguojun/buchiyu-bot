import { Command, Context, Schema, Session } from 'koishi';

declare module 'koishi' {
  interface Channel {
    shopKeywords: string[];
  }
}

export interface Config {
  discountGroup?: string[];
  master?: string;
}

export const Config: Schema<Config> = Schema.object({
  discountGroup: Schema.array(String).default([]).description('要监测的群'),
  master: Schema.string().description('监控信息的转发人'),
});

export const name = 'shop';

export function apply(ctx: Context, { discountGroup, master }: Config) {
  ctx.before('attach-channel', (session, fields) => {
    fields.add('shopKeywords');
  });

  ctx.middleware((_: Session<never, 'shopKeywords'>, next) => {
    const { channel, bot } = _;
    const { shopKeywords } = channel || {};
    ctx.app.guild(...discountGroup).on('message', async (session) => {
      for await (const keyword of shopKeywords) {
        if (session.content.includes(keyword)) {
          await bot.sendPrivateMessage(
            master,
            `${new Date(session.timestamp).toLocaleString('zh', { timeZone: 'Asia/shanghai', hour12: false })}\n${
              session.content
            }`,
          );
        }
      }
    });

    return next();
  });

  ctx.model.extend('channel', {
    shopKeywords: 'list',
  });

  ctx.using(['database'], (ctx) => {
    const cmd = ctx.command('shop [operation:string] <keyword:text>');

    const register = (def: string, callback: Command.Action<never, 'shopKeywords', [string]>) =>
      cmd.subcommand(def, { checkArgCount: true }).channelFields(['shopKeywords']).action(callback);

    register('.add <keyword:text>', async ({ session }, keyword) => {
      const { shopKeywords } = session.channel;
      if (shopKeywords.includes(keyword)) {
        return session.text(`${keyword} 已经是关键词啦！`);
      } else {
        shopKeywords.push(keyword);
        return session.text(`已成功添加关键词： ${keyword}！`);
      }
    }).alias('shop.add');

    register('.remove <keyword:keyword>', async ({ session }, keyword) => {
      const { shopKeywords } = session.channel;
      const index = shopKeywords.indexOf(keyword);
      if (index >= 0) {
        shopKeywords.splice(index, 1);
        return session.text(`已成功移除关键词： ${keyword}!`);
      } else {
        return session.text(`${keyword} 不是关键词!`);
      }
    }).alias('shop.rm');

    register('.clear', async ({ session }) => {
      session.channel.shopKeywords = [];
      return session.text('已成功移除全部关键词!');
    }).alias('shop.clear');

    register('.list', async ({ session }) => {
      const { shopKeywords } = session.channel;
      if (!shopKeywords.length) return session.text('暂无关键词！');
      return [session.text('关键词列表：'), ...shopKeywords].join('\n');
    }).alias('shop.ls');
  });
}
