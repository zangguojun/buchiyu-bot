import { Command, Context, Schema, segment, Session } from 'koishi';
import { compact as _compact } from 'lodash';
import tmp from 'tmp';
import path from 'path';
import fs from 'fs';
import { FFScene, FFImage, FFCreator, FFCreatorCenter } from 'ffcreator';
import sizeOf from 'image-size';

declare module 'koishi' {
  interface Tables {
    filmmaker: IPicData;
  }
}
declare module 'ffcreator' {
  interface FFCreatorCenter {
    temps: object;
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

  const outputDir = path.resolve(__dirname, '../output');
  const tempConfig = { tmpdir: path.resolve(__dirname, '../tmp'), postfix: '.jpeg' };

  const generate = async (picData: IPicData) => {
    return ctx.database.create(name, picData);
  };

  const get = async (id: number[]) => {
    return ctx.database.get(name, { id });
  };

  const initTemplate = async (id: string) => {
    FFCreatorCenter.createTemplate(id, async ({ imgList, width, height }) => {
      const creator = new FFCreator({
        width,
        height,
        outputDir,
      });

      for (const imgFile of imgList) {
        const { width: w, height: h } = await sizeOf(imgFile);
        const scale = width / w;
        const y = height / 2 - (h * scale) / 2;

        const scene = new FFScene();
        const fImg = new FFImage({ path: imgFile, scale, y });
        scene.addChild(fImg);
        scene.setTransition('distance', 1.5);
        scene.setDuration(4);
        creator.addChild(scene);
      }

      creator.start();
      return creator;
    });
  };

  const viewProgress = async (taskId: string) => {
    return FFCreatorCenter.getProgress(taskId);
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

  ctx
    .command('mk <tempId:string> <content:text>', { checkArgCount: true, authority: 2 })
    .option('width', '-w [视频宽度]', { fallback: 720 })
    .option('height', '-h [视频高度]', { fallback: 1280 })
    .action(async ({ options, session }, tempId, content) => {
      if (!FFCreatorCenter.temps[tempId]) {
        await initTemplate(tempId);
      }
      const id = _compact(content.split(' ')).map((v) => parseInt(v));
      const imgObj = await get(id);

      const imgDownloadTask = imgObj.map(async (item) => {
        const { name, fd, removeCallback } = tmp.fileSync(tempConfig);
        const rst = await ctx.http.get(item?.url, { responseType: 'arraybuffer' });
        fs.writeFileSync(fd, rst);
        return { name, removeCallback };
      });

      const imgList = await Promise.all(imgDownloadTask);
      const taskId = FFCreatorCenter.addTaskByTemplate(tempId, {
        ...options,
        imgList: imgList?.map((i) => i.name),
      });
      FFCreatorCenter.onTaskComplete(taskId, ({ file }) => {
        const rst = fs.readFileSync(file);
        session.send(segment('text', { content: `任务( ${taskId} )制作完成` }));
        session.send(segment.video(rst));
        fs.unlink(file, () => {
          session.send(segment('text', { content: `已清理生产的视频文件` }));
        });
        imgList.forEach((i) => i.removeCallback());
      });
      return segment('text', { content: `任务( ${taskId} )创建成功，正在制作视频` });
    })
    .alias('制作');

  ctx
    .command('progress <tempId:string>', { checkArgCount: true, authority: 2 })
    .action(async ({ options, session }, tempId) => {
      const progress = await viewProgress(tempId);
      return segment('text', { content: `制作进度为：${progress}%` });
    })
    .alias('进度');
}
