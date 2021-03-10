const { getUserIdsFromText, getUserRealName, reply, replyEphemeral } = require('../helpers/messageAndUsers');

const getUserPizzaInfo = async (collection, userId) => {
    return await collection.findOne({ userId });
};

const getTotalPizzas = async (userInfo) => {
    return userInfo.earned + userInfo.daily;
};

const getEarnedPizzas = async (collection, userId) => {
    const user = await collection.findOne({ userId });
    return user.earned;
};

const getDailyPizzas = async (collection, userId) => {

};

const getTopTen = async (collection, type) => {
    const sort = {};
    sort[type] = -1;
    return await collection.find().sort(sort).limit(10).toArray();
};

const givePizzaOp = (userId, earned) => {
    return {
        updateOne: {
            filter: {
                userId
            },
            update: {
                $inc: {
                    earned
                }
            }
        }
    };
};

const pizzaMath = (pizzasToGive, dailyAvailable) => {
    return {
        dailySubtract: pizzasToGive >= dailyAvailable ? -dailyAvailable : -pizzasToGive,
        earnedSubtract: pizzasToGive <= dailyAvailable ? 0 : -(pizzasToGive - dailyAvailable)
    };
};

const takePizzaOp = (userId, userInfo, dailySubtract, earnedSubtract) => {
    return {
        updateOne: {
            filter: {
                userId
            },
            update: {
                $inc: {
                    daily: dailySubtract,
                    earned: earnedSubtract,
                    given: -earnedSubtract + -dailySubtract
                }
            }
        }
    };
};

module.exports = function(controller) {
    controller.hears('!debug', 'message', async (bot, message) => {
        const userList = await controller.adapter.slack.users.list({});
        console.dir(userList, { depth: null });
        await reply(bot, message, 'Debug happening, check console');
    });

    controller.hears(':progressstick:', 'message', async (bot, message) => {
        const userPizzas = getUserIdsFromText(message);
        const userIds = Object.keys(userPizzas);
        await reply(bot, message, 
        `<@${userIds.join('><@')}>
        :alert::alert::alert::alert::alert::alert::alert::alert::alert:
        :alert:        You have been       :alert:
        :alert:   SMACKED with the   :alert:
        :alert:    PROGRESS STICK     :alert:
        :alert:    DO YOUR WORK     :alert:
        :alert::alert::alert::alert::alert::alert::alert::alert::alert:`);
    });

    controller.hears(':pizza:', 'message', async (bot, message) => {
        const userPizzas = getUserIdsFromText(message);
        let userIds = Object.keys(userPizzas);

        if (!userIds.length) {
            await replyEphemeral(bot, message, 'Share the pizza love by adding it after a username, like this: @username :pizza:');
        } else if (userIds.includes(message.user)) {
            await reply(bot, message, 'Listen, ya need to quit being greedy!');
        } else {
            await replyEphemeral(bot, message, 'Just some debugging. If you see this message twice for one message, :shit:');
            const pizzasToGive = Object.values(userPizzas).reduce((totalPizzas, pizzaCount) => {
                return totalPizzas + pizzaCount;
            }, 0);
            const userInfo = await getUserPizzaInfo(controller.db.users, message.user);
            const totalPizzasAvailable = await getTotalPizzas(userInfo);
            if (pizzasToGive > totalPizzasAvailable) {
                replyEphemeral(bot, message, `You tried to give out ${pizzasToGive} :pizza: but only have ${totalPizzasAvailable} :pizza: available.`);
            } else {
                const ops = [];
                const usersGiven = await Promise.all(userIds.map(async userId => {
                    const realName = await getUserRealName(bot, userId);
                    return realName;
                }));
                for (const pizzaUserId of userIds) {
                    const userId = pizzaUserId;
                    const pizzaBot = await controller.spawn('T033MB5HN');
                    const userData = await getUserPizzaInfo(controller.db.users, userId);
                    const currOp = givePizzaOp(userId, userPizzas[userId]);
                    ops.push(currOp);
                    await pizzaBot.startPrivateConversation(userId);
                    await pizzaBot.say(`You received ${userPizzas[userId]} pizzas from ${await getUserRealName(bot, message.user)}. You have earned ${userData.earned + userPizzas[userId]} :pizza:`);
                }z
                const { dailySubtract, earnedSubtract } = pizzaMath(pizzasToGive, userInfo.daily);
                ops.push(takePizzaOp(message.user, userInfo, dailySubtract, earnedSubtract));
                await controller.db.users.bulkWrite(ops, { ordered: false });
                replyEphemeral(bot, message, `You gave away ${pizzasToGive} pizzas total to: ${usersGiven.join(', ')}. Your new balance: :pizza: Daily: ${userInfo.daily + dailySubtract} | :pizza: Earned: ${userInfo.earned + earnedSubtract} (MATH: From daily: ${dailySubtract} | From Earned: ${earnedSubtract})`);
            }
        }
    });

    controller.on('slash_command', async (bot, message) => {
        if (message.command === '/pizzas') {
            const userInfo = await getUserPizzaInfo(controller.db.users, message.user);
            await replyEphemeral(bot, message, `:pizza: Daily: ${userInfo.daily} | :pizza: Earned: ${userInfo.earned}`);
        }



        if (message.command === '/lb' || message.command === '/leaderboard' || message.command === '/lbg') {
            const lbType = {
                lb: 'earned',
                leaderboard: 'earned',
                lbg: 'given'
            };
            const commandType = message.command.substring(1);
            const users = await getTopTen(controller.db.users, lbType[commandType]);
            const lb = [];

            for (let i = 0; i < users.length; i++) {
                if (users[i][lbType[commandType]] === 0) {
                    continue;
                }
                let realName = await getUserRealName(bot, users[i].userId);
                lb.push({
                    type: "section",
                    text: {
                        type: "plain_text",
                        text: realName || 'ERROR :wtf:',
                        emoji: true
                    },
                    accessory: {
                        type: "button",
                        text: {
                            type: "plain_text",
                            emoji: true,
                            text: `${users[i][lbType[commandType]]} :pizza:`
                        },
                        style: "primary"
                    }
                })
            }
            // const newUsers = await users.reduce(async (red, user) => {
            //     const newUser = {};
            //     const realName = await getUserRealName(bot, user.userId);
            //     newUser[user.userId] = { name: realName, pizzasEarned: user.earned };
            //     red.push(newUser);
            // }, []);
            const blocks = [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": `:pizza: ${lbType[commandType].charAt(0).toUpperCase() + lbType[commandType].slice(1)} Leaderboard :pizza:`,
                        "emoji": true
                    }
                },
                ...lb
            ];
            // console.dir(JSON.stringify(blocks), { depth: null });
            await bot.reply(message,{
                blocks
            });
        }

        if (message.command === '/whoami') {
            await replyEphemeral(bot, message, `Your user ID is ${message.user} and the current channel is ${message.channel}`);
        }
    });
}
