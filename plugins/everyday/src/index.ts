import { Context, Schema, Session, segment } from 'koishi'
import '@koishijs/plugin-adapter-telegram'

export const name = 'everyday'

export function apply(ctx: Context) {
  ctx.middleware((_, next) => {
    // 452055642
    // 532250819
    console.log(_.content)
    ctx.app.guild("532250819").on("message", async (session) => {
      if (session.content.includes("学生价") || session.content) {
        await _.bot.sendPrivateMessage(
          "1739932260",
          `${new Date(session.timestamp).toLocaleString("zh", {
            timeZone: "Asia/shanghai",
            hour12: false,
          })}\n${session.content}`
        )
      }
      return next()
    })
  })

  ctx
    .command("acg", "随机一张ACG图")
    .action(() => segment('image', { url: 'https://www.qqlykm.cn/api/ag/api.php' }))

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
