const { getUserIdsFromText, getUserRealName, reply, replyEphemeral } = require('../helpers/messageAndUsers');

const getPizzasAvailable = async (collection, user) => {
    let pizzas;
    await collection.findOne({ userId: user }, async (err, result) => {
        pizzas = result.pizzas || false;
    });
    return pizzas;
};

const getPizzasEarned = async (collection, user, cb) => {
    let pizzas;
    await collection.findOne({ userId: user }, async (err, result) => {
        pizzas = result.pizzasEarned || false;
    });
    return pizzas;
};

const givePizzaOp = (userId, pizzaCount, pizzasEarned = 0) => {
    return {
        updateOne: {
            filter: {
                userId
            },
            update: {
                $inc: {
                    pizzas: pizzaCount,
                    pizzasEarned
                }
            }
        }
    };
};

module.exports = function(controller) {
    controller.hears(':pizza:', 'message', async (bot, message) => {
        const userPizzas = getUserIdsFromText(message);
        const userIds = Object.keys(userPizzas);
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
                userIds.forEach(async pizzaUserId => {
                    const userId = pizzaUserId;
                    const pizzasAvailable = await getPizzasAvailable(controller.db.users, userId);
                    const pizzasEarned = await getPizzasEarned(controller.db.users, userId);
                    ops.push(givePizzaOp(userId, userPizzas[userId], userPizzas[userId]));
                    await bot.startPrivateConversation(userId);
                    console.log(pizzasAvailable, pizzasEarned, userPizzas[userId]);
                    await bot.say(`You received ${userPizzas[userId]} pizzas from ${await getUserRealName(bot, message.user)}. Your new Balance is ${pizzasAvailable + userPizzas[userId]} and you have earned ${pizzasEarned + userPizzas[userId]} in this lifetime`);
                });
                ops.push(givePizzaOp(message.user, -totalPizzas));
                controller.db.users.bulkWrite(ops, { ordered: false });
                const newBalance = pizzasAvailable - totalPizzas;
                replyEphemeral(bot, message, `You gave away ${totalPizzas} pizzas total to: ${usersGiven.join(', ')}. Your new balance is ${newBalance}`);
            }
        }
    });

    controller.on('slash_command', async (bot, message) => {
        if (message.command === '/pizzas') {
            await getPizzasAvailable(controller.db.users, message.user, async pizzasAvailable => {
                replyEphemeral(bot, message, `You currently have ${pizzasAvailable} in your backpack. (weirdo)`)
            });
        }

        if (message.command === '/earnedpizzas') {
            await getPizzasEarned(controller.db.users, message.user, async pizzasEarned => {
                replyEphemeral(bot, message, `You've earned ${pizzasEarned} total for your lifetime!`)
            });
        }

        if (message.command === '/whoami') {
            replyEphemeral(bot, message, `Your user ID is ${message.user} and the current channel is ${message.channel}`);
        }
    });
}
