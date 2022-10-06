import { Context, Schema, Session } from 'koishi';

declare module 'koishi' {
  interface Tables {
    filmmaker: IPicData;
  }
}

export const name = 'filmmaker';

export const using = ['database'] as const;

export interface Config {
  master?: string[];
}

interface IPicData {
  id?: number;
  title: string;
  url: string;
  timestamp?: Date;
}

const imgCQRe = /(.*?)<image file=.*? url="(.*?)"\/>/;

export const Config: Schema<Config> = Schema.object({
  master: Schema.array(String).default([]).description('监控人'),
});

export function apply(ctx: Context, { master }: Config) {
  ctx.model.extend(
    name,
    {
      id: 'unsigned',
      title: 'string',
      url: 'string',
      timestamp: 'timestamp',
    },
    {
      autoInc: true,
    },
  );

  const generate = async (picData: IPicData) => {
    return ctx.database.create(name, picData);
  };

  ctx.user(...master).middleware(async (session: Session, next) => {
    const { content } = session;
    if (imgCQRe.test(content)) {
      const [, title, url] = content?.match(imgCQRe);
      const res = await generate({ title, url, timestamp: new Date() });
      return `写入${!!res?.id ? `成功 ID: ${res?.id}` : '失败'}`;
    }
    await next();
  });
}
