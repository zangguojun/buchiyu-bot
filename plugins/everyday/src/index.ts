import { Context, Schema, Session, Command, segment } from 'koishi';
import _ from 'lodash';
import '@koishijs/plugin-adapter-telegram';
import '@koishijs/plugin-adapter-onebot';

export const name = 'everyday';

const guildList = [290061546, 795802565, 702547164, 726356752];
const masterGuildList = ['#', '532250819'];

export function apply(ctx: Context) {
  // 处理加群请求
  ctx.on('guild-member-request', async (session) => {
    const { messageId, guildId, userId } = session;
    const memberListTasks = guildList.map((g) => {
      return session.onebot?.getGroupMemberList(g);
    });
    const allMemberList = await Promise.all(memberListTasks);
    for (const memberList of allMemberList) {
      const existUser = memberList.find((member) => {
        return String(member.user_id) === userId;
      });
      if (existUser) {
        await session.bot.handleGuildMemberRequest(
          messageId,
          false,
          `您已经加入了其他资源群(${existUser.group_id})，所有群内的资料相同！`,
        );
        return;
      }
    }

    const { max_member_count, member_count } = await session.onebot.getGroupInfo(guildId);
    if (max_member_count > member_count) {
      await session.bot.handleGuildMemberRequest(messageId, true);
    } else {
      const notFull = [];
      const memberNumberListTasks = guildList
        .filter((g) => g !== Number(guildId))
        .map((g) => {
          return session.onebot?.getGroupInfo(g);
        });
      const memberNumberList = await Promise.all(memberNumberListTasks);
      for (const memberList of memberNumberList) {
        const { max_member_count, member_count, group_id } = await session.onebot.getGroupInfo(guildId);
        if (max_member_count > member_count) {
          notFull.push(group_id);
        }
      }
      await session.bot.handleGuildMemberRequest(messageId, false, `该群已满，请加${notFull.join('，')}`);
    }
  });

  // 处理踢人请求
  ctx.on('message', async (session) => {
    const { messageId, content, guildId, userId } = session;
    if (guildList.includes(Number(guildId)) && content === '【我想退群了】') {
      await session.onebot.setGroupKick(guildId, userId);
    }
  });

  // 查看一人多群
  ctx.on('message', async (session) => {
    const { messageId, content, guildId, userId } = session;
    if (masterGuildList.includes(guildId) && content === '【一人多群】') {
      for (const [index, guild] of guildList.entries()) {
        const memberListTasks = guildList.slice(index).map((g) => {
          return session.onebot?.getGroupMemberList(g);
        });
        const [memberList, ...otherMemberList] = await Promise.all(memberListTasks);
        for (const otherMember of otherMemberList) {
          const intersection = _.intersectionBy(otherMember, memberList, 'user_id').filter(
            (item) => item?.role === 'member',
          );
          const privateMsgTasks = intersection.map((item) => {
            const { group_id, user_id } = item;
            return session.onebot?.sendPrivateMsg(
              user_id,
              `打扰了！您额外加入了脏果君资源群(${group_id})，已将您移除，谢谢配合`,
            );
          });
          await Promise.all([].concat(privateMsgTasks, privateMsgTasks));
          const delMemberTasks = intersection.map((item) => {
            const { group_id, user_id } = item;
            return session.onebot?.setGroupKick(group_id, user_id);
          });
          await Promise.all([].concat(delMemberTasks, privateMsgTasks));
        }
      }
    }
  });
}
