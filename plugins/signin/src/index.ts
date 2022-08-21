import { Command, Context, Schema, Session } from 'koishi';

declare module 'koishi' {
  interface User {
    juejin: string[];
    zhihu: string[];
  }
}

export const name = 'signin';

type TPlatform = keyof typeof platformMap;

const platformMap = {
  juejin: '掘金',
  zhihu: '知乎',
};

export function apply(ctx: Context) {
  ctx.before('attach-user', (session, fields) => {
    fields.add('juejin');
  });

  ctx.model.extend('user', {
    juejin: 'list',
    zhihu: 'list',
  });

  ctx.using(['database'], (ctx) => {
    const cmd = ctx.command('signin [platform:string] [operation:string] <key:text>');
    const register = (def: string, callback: Command.Action<TPlatform, never, [string]>) => {
      Object.keys(platformMap).map((platform: TPlatform) => {
        return cmd
          .subcommand(`.${platform}${def}`, { checkArgCount: true })
          .userFields([platform])
          .action(callback)
          .alias(`${platformMap[platform]}${def.match(/.(\w*)/)[1]}`);
      });
    };

    register('.add <key:string>', async ({ session, command }, key) => {
      const curKey = command?.name.split('.')[1];
      const curKeyArray = session?.user[curKey];

      if (curKeyArray.includes(key)) {
        return session.text(`${key} 已经被加入凭证了`);
      } else {
        curKeyArray.push(key);
        return session.text(`已成功加入凭证： ${key}`);
      }
    });

    register('.rp <keyStr:text>', async ({ session, command }, keyStr) => {
      const [oldKey, newKey] = keyStr.split(' ');
      const curKey = command?.name.split('.')[1];
      const curKeyArray = session?.user[curKey];
      const index = curKeyArray.findIndex((k) => k.startsWith(oldKey));

      if (index >= 0) {
        const originalKey = curKeyArray[index];
        curKeyArray.splice(index, 1, newKey);
        return session.text(`成功将${originalKey}替换为${newKey}凭证`);
      } else {
        return session.text(`不存在以${oldKey}开头的凭证`);
      }
    });

    register('.rm <key:string>', async ({ session, command }, key) => {
      const curKey = command?.name.split('.')[1];
      const curKeyArray = session?.user[curKey];
      const index = curKeyArray.findIndex((k) => k.startsWith(key));

      if (index >= 0) {
        const originalKey = curKeyArray[index];
        curKeyArray.splice(index, 1);
        return session.text(`已成功移除凭证： ${originalKey}`);
      } else {
        return session.text(`不存在以${key}开头的凭证`);
      }
    });

    register('.clear', async ({ session, command }) => {
      const curKey = command?.name.split('.')[1];
      session.user[curKey] = [];
      return session.text('已成功移除全部凭证');
    });

    register('.ls', async ({ session, command }) => {
      const curKey = command?.name.split('.')[1];
      const curKeyArray = session?.user[curKey];
      if (!curKeyArray.length) return session.text('暂无凭证');
      return [session.text(`${platformMap[curKey]}凭证列表：`), ...curKeyArray].join('\n');
    });
  });
}
