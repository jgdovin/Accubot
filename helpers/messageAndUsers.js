const getUserInfo = async (bot, user) => {
    return await bot.api.users.info({user});
};

const getUserRealName = async (bot, user) => {
    const userInfo = await getUserInfo(bot, user);
    return userInfo.user.real_name;
};

const getUserIdsFromText = message => {
    const usersMatch = message.text.match(/((?<=@).+?(?=\>))/ig);
    
    if (!usersMatch) return {};

    return usersMatch.reduce((out, input) => {
        if(out[input]) {
            out[input] += 1;
        } else {
            out[input] = 1;
        }
        return out;
    }, {});
};

const reply = async (bot, message, text) => {
    await bot.changeContext(message.reference);
    await bot.reply(message, text);
};

const replyEphemeral = async (bot, message, text) => {
    await bot.changeContext(message.reference);
    await bot.replyEphemeral(message, text);
};

module.exports = {
    getUserRealName,
    getUserInfo,
    getUserIdsFromText,
    reply,
    replyEphemeral
};