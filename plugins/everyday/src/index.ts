import { Context, Schema, Session, Command, segment } from 'koishi'
import '@koishijs/plugin-adapter-telegram'
import '@koishijs/plugin-adapter-onebot'

declare module 'koishi' {
  interface Channel {
    shopKeywords: string[]
  }
}

export const name = 'everyday'

export interface Config {
  keywords?: string[]
}

export const Config: Schema<Config> = Schema.object({
  keywords: Schema.array(String).default([]).description('要监测的关键字。'),
})

const guildList = [290061546, 795802565, 702547164, 726356752]

export function apply(ctx: Context,{ keywords }: Config) {
  // 处理加群请求
  ctx.on('guild-member-request', async (session) => {
    const { messageId, guildId } = session
    const { max_member_count, member_count } = await session.onebot.getGroupInfo(guildId)
    if (max_member_count > member_count) {
      await session.bot.handleGuildMemberRequest(messageId, true)
    } else {
      let confuseText = '该群已满!'
      let index = 1
      for await (const gId of guildList) {
        const { max_member_count, member_count } = await session.onebot.getGroupInfo(gId)
        confuseText += `${index++}群：${gId}(${member_count}/${max_member_count})；`
      }
      await session.bot.handleGuildMemberRequest(messageId, false, confuseText)
    }
  })

  ctx.before('attach-channel', (session, fields) => {
    fields.add('shopKeywords')
  })

  ctx.middleware((_: Session<never, 'shopKeywords'>, next) => {
    const { shopKeywords } = _.channel
    // 折扣群：452055642
    // 111群：532250819
    ctx.app.guild( "532250819").on("message", async (session) => {
      for await (const keyword of shopKeywords) {
        if (session.content.includes(keyword)) {
          await _.bot.sendPrivateMessage(
            "1739932260",
            `${new Date(session.timestamp).toLocaleString("zh", {
              timeZone: "Asia/shanghai",
              hour12: false,
            })}\n${session.content}`
          )
        }
      }

      return next()
    })
  })

  ctx.model.extend('channel', {
    shopKeywords: 'list',
  })

  ctx.using(['database'], (ctx) => {
    const cmd = ctx
      .command('shop [operation:string] <keyword:keyword>')

    const register = (def: string, callback: Command.Action<never, "shopKeywords", [string]>) => cmd
      .subcommand(def, { checkArgCount: true })
      .channelFields(["shopKeywords"])
      .action(callback)

    register('.add <keyword:keyword>', async ({ session }, keyword) => {
      const { shopKeywords } = session.channel
      if (shopKeywords.includes(keyword)) {
        return session.text(`${keyword} 已经是关键词啦！`)
      } else {
        shopKeywords.push(keyword)
        return session.text(`已成功添加关键词： ${keyword}！`)
      }
    }).alias('shop.add')

    register('.remove <keyword:keyword>', async ({ session }, keyword) => {
      const { shopKeywords } = session.channel
      const index = shopKeywords.indexOf(keyword)
      if (index >= 0) {
        shopKeywords.splice(index, 1)
        return session.text(`已成功移除关键词： ${keyword}!`)
      } else {
        return session.text(`${keyword} 不是关键词!`)
      }
    }).alias('shop.rm')

    register('.clear', async ({ session }) => {
      session.channel.shopKeywords = []
      return session.text('已成功移除全部关键词!')
    }).alias('shop.clear')

    register('.list', async ({ session }) => {
      const { shopKeywords } = session.channel
      if (!shopKeywords.length) return session.text('暂无关键词！')
      return [session.text('关键词列表：'), ...shopKeywords].join('\n')
    }).alias('shop.ls')

  })


  ctx.command('go <message:text>', { authority: 2 })
    .option('anonymous', '-a', { authority: 3 })
    .option('forceAnonymous', '-A', { authority: 3 })
    .option('escape', '-e', { authority: 3 })
    .option('unescape', '-E', { authority: 3 })
    .option('user', '-u [user:user]', { authority: 3 })
    .option('channel', '-c [channel:channel]', { authority: 3 })
    .option('guild', '-g [guild:string]', { authority: 3 })
    .action(async ({ options, session }, message) => {
      if (!message) return "请输入消息！"
      return 'gkd'
    })
}
