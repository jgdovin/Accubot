const { getUserIdsFromText, getUserRealName, reply, replyEphemeral } = require('../helpers/messageAndUsers');

const getPizzasAvailable = async (collection, userId) => {
    const user = await collection.findOne({ userId });
    return user.pizzas;
};

const getPizzasEarned = async (collection, userId) => {
    const user = await collection.findOne({ userId });
    return user.pizzasEarned;
};

const getUserInfo = async (collection, userId) => {
    return await collection.findOne({ userId });
};

const getTopTen = async (collection, type) => {
    const sort = {};
    sort[type] = -1;
    return await collection.find().sort(sort).limit(10).toArray();
};

const givePizzaOp = (userId, pizzasEarned, pizzas) => {
    return {
        updateOne: {
            filter: {
                userId
            },
            update: {
                $inc: {
                    pizzas,
                    pizzasEarned
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
        const pizzaCounts = Object.values(userPizzas);

        if (!userIds.length) {
            await replyEphemeral(bot, message, 'Share the pizza love by adding it after a username, like this: @username :pizza:');
        } else if (userIds.includes(message.user)) {
            await reply(bot, message, 'Listen, ya need to quit being greedy!');
        } else {
            const totalPizzas = pizzaCounts.reduce((totalPizzas, pizzaCount) => {
                return totalPizzas + pizzaCount;
            }, 0);
            const pizzasAvailable = await getPizzasAvailable(controller.db.users, message.user);
            if (totalPizzas > pizzasAvailable) {
                replyEphemeral(bot, message, `You tried to give out ${totalPizzas} but only have ${pizzasAvailable} left in your backpack! (Why are you keeping them in your backpack?)`);
            } else {
                const ops = [];
                const usersGiven = await Promise.all(userIds.map(async userId => {
                    const realName = await getUserRealName(bot, userId);
                    return realName;
                }));
                for (const pizzaUserId of userIds) {
                    const userId = pizzaUserId;
                    const pizzaBot = await controller.spawn('T033MB5HN');
                    const userData = await getUserInfo(controller.db.users, userId);
                    const currOp = givePizzaOp(userId, userPizzas[userId], userPizzas[userId]);
                    ops.push(currOp);
                    await pizzaBot.startPrivateConversation(userId);
                    await pizzaBot.say(`You received ${userPizzas[userId]} pizzas from ${await getUserRealName(bot, message.user)}. Your new Balance is ${userData.pizzas + userPizzas[userId]} and you have earned ${userData.pizzasEarned + userPizzas[userId]} in this lifetime`);
                }

                ops.push(givePizzaOp(message.user, 0, -totalPizzas));
                await controller.db.users.bulkWrite(ops, { ordered: false });
                const newBalance = pizzasAvailable - totalPizzas;
                replyEphemeral(bot, message, `You gave away ${totalPizzas} pizzas total to: ${usersGiven.join(', ')}. Your new balance is ${newBalance}`);
            }
        }
    });

    controller.on('slash_command', async (bot, message) => {
        if (message.command === '/pizzas') {
            const userInfo = await getUserInfo(controller.db.users, message.user);
            await replyEphemeral(bot, message, `:pizza: Available: ${userInfo.pizzas} | :pizza: given to you (total) ${userInfo.pizzasEarned}`);
        }

        if (message.command === '/earnedpizzas') {
            const pizzas = await getPizzasEarned(controller.db.users, message.user);
            await replyEphemeral(bot, message, `You've earned ${pizzas} total for your lifetime!`);
        }

        if (message.command === '/lb' || message.command === '/leaderboard') {
            const users = await getTopTen(controller.db.users, 'pizzasEarned');
            const lb = [];

            for (let i = 0; i < users.length; i++) {
                console.log('test', users[i]);
                let realName = await getUserRealName(bot, users[i].userId);
                lb.push(`${realName}      -  ${users[i].pizzasEarned}`);
            }
            // const newUsers = await users.reduce(async (red, user) => {
            //     const newUser = {};
            //     const realName = await getUserRealName(bot, user.userId);
            //     newUser[user.userId] = { name: realName, pizzasEarned: user.pizzasEarned };
            //     red.push(newUser);
            // }, []);
            console.log(lb);
        }

        if (message.command === '/whoami') {
            await replyEphemeral(bot, message, `Your user ID is ${message.user} and the current channel is ${message.channel}`);
        }
    });
}
