import { Command, Context, Schema, Session } from 'koishi';
import '@koishijs/plugin-adapter-onebot';

declare module 'koishi' {
  interface User {
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
  ctx.before('attach-user', (session, fields) => {
    fields.add('shopKeywords');
  });

  ctx.model.extend('user', {
    shopKeywords: 'list',
  });

  ctx.guild().middleware(async (session: Session<'shopKeywords', never>, next) => {
    const { user, bot, content, timestamp } = session;
    const { shopKeywords } = user;
    for await (const keyword of shopKeywords) {
      if (content.includes(keyword)) {
        await bot?.sendPrivateMessage(
          master,
          `${new Date(timestamp).toLocaleString('zh', { timeZone: 'Asia/shanghai', hour12: false })}\n${content}`,
        );
      }
    }

    return next();
  });

  // ctx.middleware((_: Session<'shopKeywords', never>, next) => {
  //   const { user, bot } = _;
  //   const { shopKeywords } = user || {};
  //   ctx.app.guild(...discountGroup).on('message', async (session) => {
  //     for await (const keyword of shopKeywords) {
  //       if (session.content.includes(keyword)) {
  //         await bot.sendPrivateMessage(
  //           master,
  //           `${new Date(session.timestamp).toLocaleString('zh', { timeZone: 'Asia/shanghai', hour12: false })}\n${
  //             session.content
  //           }`,
  //         );
  //       }
  //     }
  //   });
  //
  //   return next();
  // });

  ctx.using(['database'], (ctx) => {
    const cmd = ctx.command('shop [operation:string] <keyword:text>');

    const register = (def: string, callback: Command.Action<'shopKeywords', never, [string]>) =>
      cmd.subcommand(def, { checkArgCount: true }).userFields(['shopKeywords']).action(callback);

    register('.add <keyword:text>', async ({ session }, keyword) => {
      const { shopKeywords } = session.user;
      if (shopKeywords.includes(keyword)) {
        return session.text(`${keyword} 已经是关键词啦`);
      } else {
        shopKeywords.push(keyword);
        return session.text(`已成功添加关键词： ${keyword}`);
      }
    }).alias('shop.add');

    register('.remove <keyword:keyword>', async ({ session }, keyword) => {
      const { shopKeywords } = session.user;
      const index = shopKeywords.indexOf(keyword);
      if (index >= 0) {
        shopKeywords.splice(index, 1);
        return session.text(`已成功移除关键词： ${keyword}`);
      } else {
        return session.text(`${keyword} 不是关键词`);
      }
    }).alias('shop.rm');

    register('.clear', async ({ session }) => {
      session.user.shopKeywords = [];
      return session.text('已成功移除全部关键词');
    }).alias('shop.clear');

    register('.list', async ({ session }) => {
      const { shopKeywords } = session.user;
      if (shopKeywords.length) return session.text('暂无关键词');
      return [session.text('关键词列表：'), ...shopKeywords].join('\n');
    }).alias('shop.ls');
  });
}
