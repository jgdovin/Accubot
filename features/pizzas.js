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

const takePizzaOp = (userId, userInfo, pizzas) => {
    const { daily } = userInfo;
    const dailySubtract = pizzas >= daily ? -daily : -pizzas;
    const earnedSubtract = pizzas <= daily ? 0 : -(pizzas - daily);
    console.log(dailySubtract, earnedSubtract, pizzas, daily, userInfo);
    return {
        updateOne: {
            filter: {
                userId
            },
            update: {
                $inc: {
                    daily: dailySubtract,
                    earned: earnedSubtract
                }
            }
        }
    };
};

module.exports = function(controller) {
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
                    console.log(currOp);
                    ops.push(currOp);
                    await pizzaBot.startPrivateConversation(userId);
                    await pizzaBot.say(`You received ${userPizzas[userId]} pizzas from ${await getUserRealName(bot, message.user)}. You have earned ${userData.earned + userPizzas[userId]} :pizza:`);
                }

                ops.push(takePizzaOp(message.user, userInfo, pizzasToGive));
                console.dir(ops, {depth: null});
                await controller.db.users.bulkWrite(ops, { ordered: false });
                const newBalance = totalPizzasAvailable - pizzasToGive;
                replyEphemeral(bot, message, `You gave away ${pizzasToGive} pizzas total to: ${usersGiven.join(', ')}. Your new balance is ${newBalance}`);
            }
        }
    });

    controller.on('slash_command', async (bot, message) => {
        if (message.command === '/pizzas') {
            const userInfo = await getUserPizzaInfo(controller.db.users, message.user);
            await replyEphemeral(bot, message, `:pizza: Daily: ${userInfo.daily} | :pizza: Earned: ${userInfo.earned}`);
        }

        if (message.command === '/lb' || message.command === '/leaderboard') {
            const users = await getTopTen(controller.db.users, 'pizzasEarned');
            const lb = [];

            for (let i = 0; i < users.length; i++) {
                console.log('test', users[i]);
                let realName = await getUserRealName(bot, users[i].userId);
                lb.push(`${realName}      -  ${users[i].earned}`);
            }
            // const newUsers = await users.reduce(async (red, user) => {
            //     const newUser = {};
            //     const realName = await getUserRealName(bot, user.userId);
            //     newUser[user.userId] = { name: realName, pizzasEarned: user.earned };
            //     red.push(newUser);
            // }, []);
            console.log(lb);
        }

        if (message.command === '/whoami') {
            await replyEphemeral(bot, message, `Your user ID is ${message.user} and the current channel is ${message.channel}`);
        }
    });
}
