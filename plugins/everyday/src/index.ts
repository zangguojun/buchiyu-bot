import { Context, Schema, Session, Command, segment } from 'koishi'
import '@koishijs/plugin-adapter-telegram'
import '@koishijs/plugin-adapter-onebot'

export const name = 'everyday'

const guildList = ['290061546', '795802565', '702547164', '726356752']

export function apply(ctx: Context) {
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
  // 处理踢人请求
  ctx.on('message', async (session) => {
    const { messageId, content, guildId, userId } = session
    if (guildList.includes(guildId) && content === '【我想退群了】') {
      // await session.onebot.deleteMsg(messageId)
      await session.onebot.setGroupKick(guildId, userId)
    }
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
