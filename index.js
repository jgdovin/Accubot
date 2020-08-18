'use strict';
/**
 * A Bot for Slack!
 */

const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017';
const dbName = 'accubot';
var cron = require('node-cron');

/**
 * Define a function for initiating a conversation on installation
 * With custom integrations, we don't have a way to find out who installed us, so we can't message them :(
 */

function onInstallation(bot, installer) {
    if (installer) {
        bot.startPrivateConversation({ user: installer }, function (err, convo) {
            if (err) {
                console.log(err);
            } else {
                convo.say('I am a bot that has just joined your team');
                convo.say('You must now /invite me to a channel so that I can be of use!');
            }
        });
    }
}

function onStartup(bot) {
    let ops = [];

    bot.api.users.list({}, (err, response) => {
        response.members.forEach((member) => {
            ops.push({
                updateOne: {
                    filter: {
                        employeeId: member.id
                    },
                    update: {
                        $setOnInsert: { earned: 0, available: 5 }
                    },
                    upsert: true
                }
            });
        });
        MongoClient.connect(url, (err, client) => {
            const db = client.db(dbName);

            if (err) {
                console.log(err);
                return;
            }

            // bot.say({ text: `You tried to give ${message.match.length} users some :pizza: but I don't have any to give yet!`, channel: message.channel });
            const collection = db.collection('employees');
            collection.bulkWrite(ops, { ordered: false });
        });
    });

    cron.schedule('0 0 * * *', () => {
        resetPizzas();
      });
}


/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({ mongoUri: process.env.MONGOLAB_URI }),
    };
} else {
    config = {
        json_file_store: ((process.env.TOKEN) ? './db_slack_bot_ci/' : './db_slack_bot_a/'), //use a different name if an app or CI
    };
}

/**
 * Are being run as an app or a custom integration? The initialization will differ, depending
 */

if (process.env.TOKEN || process.env.SLACK_TOKEN) {
    //Treat this as a custom integration
    var customIntegration = require('./lib/custom_integrations');
    var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
    var controller = customIntegration.configure(token, config, onInstallation, onStartup);
} else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.PORT) {
    //Treat this as an app
    var app = require('./lib/apps');
    var controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, config, onInstallation);
} else {
    console.log('Error: If this is a custom integration, please specify TOKEN in the environment. If this is an app, please specify CLIENTID, CLIENTSECRET, and PORT in the environment');
    process.exit(1);
}

const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getUsername = (bot, user, cb) => {
    bot.api.users.info({ user: user }, function (err, response) {
        if (err) {
            bot.say("ERROR :(");
        }
        else {
            cb(response.user.name);
        }
    });
};

const getPizzaAvailable = (user, cb) => {
    MongoClient.connect(url, (err, client) => {
        const db = client.db(dbName);

        if (err) {
            console.log(err);
            return;
        }
        const collection = db.collection('employees');
        collection.findOne({ employeeId: user }, (err, result) => {
            if (!result) {
                cb(false);
            } else {
                cb(result.available);
            }
        });
    });
};

const getPIzzaEarned = (user, cb) => {
    MongoClient.connect(url, (err, client) => {
        const db = client.db(dbName);

        if (err) {
            console.log(err);
            return;
        }
        const collection = db.collection('employees');
        collection.findOne({ employeeId: user }, (err, result) => {
            if (!result) {
                cb(false);
            } else {
                cb(resulte.earned);
            }
        })
    });
};

const resetPizzas = () => {
    MongoClient.connect(url, (err, client) => {
        const db = client.db(dbName);

        if (err) {
            console.log(err);
            return;
        }
        const collection = db.collection('employees');
        collection.updateMany({}, { '$set': { 'available': 5 } })
    });
};

/**
 * A demonstration for how to handle websocket events. In this case, just log when we have and have not
 * been disconnected from the websocket. In the future, it would be super awesome to be able to specify
 * a reconnect policy, and do reconnections automatically. In the meantime, we aren't going to attempt reconnects,
 * WHICH IS A B0RKED WAY TO HANDLE BEING DISCONNECTED. So we need to fix this.
 *
 * TODO: fixed b0rked reconnect behavior
 */
// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
    console.log('** The RTM api just connected!');
    onStartup(bot);
});

controller.on('rtm_close', function (bot) {
    console.log('** The RTM api just closed');
    // you may want to attempt to re-open
});

/**
 * Core bot logic goes here!
 */
// BEGIN EDITING HERE!

controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "Oh Hai! I am Accubot the Pizza bot! You can give others pizzas by simply mentioning @username with :pizza: anywhere in the text. You can also check your pizza status by typing '@accubot pizzas'")
});

controller.hears('hello', 'direct_message', function (bot, message) {
    console.log(bot, message);
});

controller.hears('reset pizzas', 'direct_mention', (bot, message) => {
    bot.say({text: `${message.user} debugging`});
});

controller.hears('pizzas', 'direct_mention', (bot, message) => {
    MongoClient.connect(url, (err, client) => {
        const db = client.db(dbName);
        const collection = db.collection('employees');
        collection.findOne({ employeeId: message.user }, (err, result) => {
            bot.say({ text: `<@${message.user}> You currently have earned ${result.earned} pizzas and ${result.available} pizzas left to give away!`, channel: message.channel });
        });
    });
});



// controller.hears('pizzas', 'mention', (bot, message) => {
//     console.log('test');
//     getPIzzaEarned(message.user, (earned) => {
//         bot.say({ text: `@<${message.user}> You currently have ${earned} pizzas!`, channel: message.channel });
//     });
// });

controller.hears('tell a joke', 'direct_mention', (bot, message) => {
    const jokes = [
        ['How do you fix a broken pizza?', 'With tomato paste'],
        ['Why did the hipster burn his mouth while eating pizza?', 'He at it way before it was cool'],
        ['What did the pizza say to the delivery guy?', 'You don\'t pepper-own me'],
        ['What does pizza wear to smell good?', 'Calzogne'],
        ['What did the pepperoni say to the cheese?', 'Slice to meat you!'],
        ['Why does the mushroom always get invited to pizza parties?', 'Because he is such a fungi!'],
        ['What type of person does\'nt like pizza?', 'A weir-dough'],
        ['Did you hear about the Italian chef with the terminal illness?', 'He pastaway. Now he\'s just a pizza history'],
        ['What\'s a pizza maker\'s favorite song?', 'Slice, Slice Baby'],
        ['Why was the pizzeria desperate for business?', 'Becayse they kneaded the dough!']
    ];
    const rando = getRandomInt(0, jokes.length);
    bot.say({ text: jokes[rando][0], channel: message.channel });
    setTimeout(() => {
        bot.say({ text: jokes[rando][1], channel: message.channel });
    }, 5000);

});

controller.hears('dance', 'direct_mention', (bot, message) => {
    bot.say({ text: 'https://media.giphy.com/media/werVqqNW4mixG/giphy.gif', channel: message.channel });
});

controller.hears(':pizza:', 'ambient', (bot, message) => {
    const usersMatch = message.text.match(/((?<=@).+?(?=\>))/ig);
    if (!usersMatch) {
        bot.whisper(message, "Share the pizza love by adding it after a username, like this: @username :pizza:");
    } else if (usersMatch.includes(message.user)) {
        bot.say({ text: `Don't be greedy <@${message.user}>, you can't give yourself pizzas! No one gets a pizza now!`, channel: message.channel });
    } else {
        getPizzaAvailable(message.user, (pizzaAvailable) => {
            if (usersMatch.length > pizzaAvailable) {
                bot.say({ text: `You tried to give ${usersMatch.length} pizzas out but only have ${pizzaAvailable} pizzas available`, channel: message.user });
            } else {
                bot.say({ text: `<@${usersMatch.join('><@')}> received a pizza from you. You have ${pizzaAvailable - usersMatch.length} pizzas left to give out today!`, channel: message.user });

                usersMatch.forEach((user) => {
                    bot.say({ text: `You received a pizza from <@${message.user}> - ${message.text}`, channel: user });
                    MongoClient.connect(url, (err, client) => {
                        const db = client.db(dbName);

                        if (err) {
                            console.log(err);
                            return;
                        }

                        const collection = db.collection('employees');

                        collection.updateOne({ employeeId: user }, { '$inc': { 'earned': 1 } });

                        collection.updateOne({ employeeId: message.user }, { '$inc': { 'available': -1 } });
                    });
                });
            }
        });

    }
    // message.match.forEach((user) => {
    //     MongoClient.connect(url, (err, client) => {
    //         const db = client.db(dbName);

    //         if (err) {
    //             console.log(err);
    //             return;
    //         }

    //         // bot.say({ text: `You tried to give ${message.match.length} users some :pizza: but I don't have any to give yet!`, channel: message.channel });
    //         const collection = db.collection('employees');
    //         collection.findOne({ employeeId: user }, (err, result) => {
    //             if (!result) {
    //                 collection.insertOne({ employeeId: user, earned: 1 });
    //             } else {
    //                 collection.updateOne({ employeeId: user }, { '$set': { 'earned': result.earned + 1 } })
    //             }
    //             console.log(getUsername(bot, message.user));
    //             // bot.say({ text: `${getUsername(bot, message.user)} gave ${getUsername(bot, user)} a pizza!`, channel: message.channel });
    //         });
    //     });

    // });

    // var currentUser;

    // bot.reply(message, 'Yo');
});


/**
 * AN example of what could be:
 * Any un-handled direct mention gets a reaction and a pat response!
 */
//controller.on('direct_message,mention,direct_mention', function (bot, message) {
//    bot.api.reactions.add({
//        timestamp: message.ts,
//        channel: message.channel,
//        name: 'robot_face',
//    }, function (err) {
//        if (err) {
//            console.log(err)
//        }
//        bot.reply(message, 'I heard you loud and clear boss.');
//    });
//});
