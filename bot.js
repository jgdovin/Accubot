//  __   __  ___        ___
// |__) /  \  |  |__/ |  |  
// |__) \__/  |  |  \ |  |  

// This is the main file for the Accubot bot.

// Import Botkit's core features
const { Botkit } = require('botkit');
const { BotkitCMSHelper } = require('botkit-plugin-cms');
const { mongo } = require('./helpers/mongo');
const mongoOptions = { db: 'accubot', collection: 'users' };

// Import a platform-specific adapter for slack.

const { SlackAdapter, SlackMessageTypeMiddleware, SlackEventMiddleware } = require('botbuilder-adapter-slack');

// Load process.env values from .env file
require('dotenv').config();

const adapter = new SlackAdapter({
    // REMOVE THIS OPTION AFTER YOU HAVE CONFIGURED YOUR APP!
    enable_incomplete: false,

    // parameters used to secure webhook endpoint
    verificationToken: process.env.VERIFICATION_TOKEN,
    clientSigningSecret: process.env.CLIENT_SIGNING_SECRET,  

    // auth token for a single-team app
    botToken: process.env.BOT_TOKEN,

    // credentials used to set up oauth for multi-team apps
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    scopes: ['bot'], 
    redirectUri: process.env.REDIRECT_URI,
 
    // functions required for retrieving team-specific info
    // for use in multi-team apps
    getTokenForTeam: getTokenForTeam,
    getBotUserByTeam: getBotUserByTeam,
});

// Use SlackEventMiddleware to emit events that match their original Slack event types.
adapter.use(new SlackEventMiddleware());

// Use SlackMessageType middleware to further classify messages as direct_message, direct_mention, or mention
adapter.use(new SlackMessageTypeMiddleware());


const controller = new Botkit({
    webhook_uri: '/api/messages',

    adapter: adapter
});

if (process.env.CMS_URI) {
    controller.usePlugin(new BotkitCMSHelper({
        uri: process.env.CMS_URI,
        token: process.env.CMS_TOKEN,
    }));
}

// Once the bot has booted up its internal services, you can use them to do stuff.
controller.ready(async () => {
    const ops = [];
    // load traditional developer-created local custom feature modules
    controller.loadModules(__dirname + '/features');
    const userList = await controller.adapter.slack.users.list({});
    userList.members.forEach((member) => {
        ops.push({
            updateOne: {
                filter: {
                    userId: member.id
                },
                update: {
                    $setOnInsert: { daily: 8, earned: 0 }
                },
                upsert: true
            }
        });
    });
    controller.db = {
        users: await mongo({...mongoOptions, collection: 'users'})
    };
    await controller.db.users.bulkWrite(ops, { ordered: false });
});



controller.webserver.get('/', (req, res) => {

    res.send(`This app is running Botkit ${ controller.version }.`);

});






controller.webserver.get('/install', (req, res) => {
    // getInstallLink points to slack's oauth endpoint and includes clientId and scopes
    res.redirect(controller.adapter.getInstallLink());
});

controller.webserver.get('/install/auth', async (req, res) => {
    try {
        const results = await controller.adapter.validateOauthCode(req.query.code);

        console.log('FULL OAUTH DETAILS', results);

        // Store token by team in bot state.
        tokenCache[results.team_id] = results.bot.bot_access_token;

        // Capture team to bot id
        userCache[results.team_id] =  results.bot.bot_user_id;

        res.json('Success! Bot installed.');

    } catch (err) {
        console.error('OAUTH ERROR:', err);
        res.status(401);
        res.send(err.message);
    }
});

let tokenCache = {};
let userCache = {};

if (process.env.TOKENS) {
    tokenCache = JSON.parse(process.env.TOKENS);
} 

if (process.env.USERS) {
    userCache = JSON.parse(process.env.USERS);
} 

async function getTokenForTeam(teamId) {
    if (tokenCache[teamId]) {
        return new Promise((resolve) => {
            setTimeout(function() {
                resolve(tokenCache[teamId]);
            }, 150);
        });
    } else {
        console.error('Team not found in tokenCache: ', teamId);
    }
}

async function getBotUserByTeam(teamId) {
    if (userCache[teamId]) {
        return new Promise((resolve) => {
            setTimeout(function() {
                resolve(userCache[teamId]);
            }, 150);
        });
    } else {
        console.error('Team not found in userCache: ', teamId);
    }
}

