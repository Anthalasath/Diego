'use strict';

const Discord = require('discord.js');
const bot = new Discord.Client();
const jsonfile = require('jsonfile');
const settingsFile = './config/settings.json';
const settingsDefaultFile = './config/settings-default.json';
const botdata = './config/botdata.json';
const WarningManager = require('./js/warning-manager.js');
const warningManager = new WarningManager(bot);
const ListManager = require('./js/list-manager.js');
const listManager = new ListManager();
const PriceGetter = require('./js/price-getter.js');
const priceGetter = new PriceGetter();

// Use this to hardcode your token (NOT RECOMMENDED):
// const token = 'Your token here';

// Use this for Heroku:
// const token = process.env.TOKEN;

// Use this if you're using a custom JSON file to store your token:
const token = jsonfile.readFileSync('./config/token.json').token;

let refreshTimer = jsonfile.readFileSync(settingsFile).refreshTimer;
let warnTimer = jsonfile.readFileSync(settingsFile).warnTimer;
let trollTimer = jsonfile.readFileSync(settingsFile).trollTimer;
let spamTimer = jsonfile.readFileSync(settingsFile).spamTimer;

bot.on('disconnect', () => {
    bot.login(token);
});


bot.on('guildMemberAdd', member => {
    member.send(`Welcome to the PRPS Discord ${ member.displayName }. Please read the #rules before you do anything.`);
});

bot.on('message', message => {
    if (message.author === bot.user) { return; }
    parseMessage(message);
});


// Process the message and checking for commands
function parseMessage(message) {
    const mentions = message.mentions.users.array();

    let settings = jsonfile.readFileSync(settingsFile);
    let command;
    let isMod = false;
    let isTrusted = false;
    let trusted;

    if (message.guild.roles) {
        trusted = message.guild.roles.find('name', 'Trusted Members').id;
    }

    if (message.content[0] !== `${ settings.prefix }`) {
        return;
    }

    if (!message.member) { return; }

    command = message.content.slice(1, message.content.length);
    if (message.member.roles.find('name', 'Moderator')) { // ugly hack because there are multiple roles named 'Moderator'
        isMod = true;
    }

    // Commands reserved to mods
    if (isMod) {
        switch (command) {
            case 'removeAllWarnings':
                warningManager.removeAllWarnings(message.author);
                break;
            case 'clearLogs':
                clearLogs();
                message.reply('Logs have been cleared');
                break;
            case 'logs':
                showLogs(message.author);
                break;
        }
    }

    // Commands for moderators and trusted members
    if (isMod || message.member.roles.has(trusted)) {
        switch (command) {
            case 'reset':
            let defaultSettings = jsonfile.readFileSync(settingsDefaultFile);
            jsonfile.writeFileSync(settingsFile, defaultSettings, err => {
                if (err) { console.log(err); }
            });
            message.reply('My settings have been set to default.');
                break;
    
            case 'clearTrollList':
            case 'clearTrollsList':
            case 'clearTrolls':
                listManager.clearTrollList();
                message.reply('Troll list has been cleared');
                break;
        }
    
        if (command.toLowerCase() === bot.user.username.toLowerCase()) {
            listMyCommands(message);
            return;
        }
    
        if (command.slice(0, 13) === 'removeWarning' || command.slice(0, 7) === 'forgive') {
            const users = message.mentions.users.array();
    
            users.forEach(user => {
                warningManager.removeWarning(null, user, message);
            });
            return;
        }
        if (command.slice(0, 7) === 'warning' || command.slice(0, 4) === 'warn') {
            const users = message.mentions.users.array();
            for (let i = 0; i < users.length; i++) {
                // Don't warn yourself
                if (message.author.id !== users[i].id) {
                    warningManager.warnUser(message, users[i]);
                }
            }
            return;
        }
    }

    //Commands for everyone
    if (command.toLowerCase() === `mywarning` || command.toLowerCase() === `mywarnings`) {
        warningManager.checkUserWarnings(message);
    }

    if (command.slice(0, 5) === 'price') {
        let args = command.slice(6, command.length);

        if (args.length === 0) {
            priceGetter.getPurpose(message);
            priceGetter.getDUBI(message);

        } else if (args.toLowerCase() === 'purpose' || args.toLowerCase() === 'prps') {
            priceGetter.getPurpose(message);

        } else if (args.toLowerCase() === 'dubi') {
            priceGetter.getDUBI(message);
        }
    }

    if (command === 'masters') {
        const masters = settings.masters;

        let response = `My masters are`;
        let userID = message.author.id;

        for (let i = 0; i < masters.length; i++) {
            if (i === 0) {
                response += ` ${ masters[i] }`
            } else if (i < masters.length - 1) {
                response += `, ${ masters[i] }`;
            } else {
                response += ` and ${ masters[i] }`;
            }
        }
        message.author.send(response);
    }

    // Commands that only affect normal members
    if (!isMod && !message.member.roles.has(trusted)) {
        // Mentioning mods is prohibited
        try {
            for (let i = 0; i < mentions.length; i++) {
                const mentionnedUserID = mentions[i].id;
                const mentionnedUserGuild = message.guild.members.find('id', mentionnedUserID);
        
                if (mentionnedUserGuild.roles.find('name', 'Moderator')) {
                    warningManager.warnUser(message, message.author);
                }
            }
        }
        catch(err) {
            console.log(err);
        }

        // DiegoLUL users can warn themselves if they don't have permission, fun feature
        if (command.slice(0, 7) === `warning` || command.slice(0, 4) === `warn`) {
            listManager.punishTheTroll(message);
        }

        if (command === bot.user.username.toLowerCase()) {
            message.author.send('https://www.youtube.com/watch?v=wS9yN9YuDBg');
        }
    }
}

function listMyCommands(message) {
    let helper = `Here's a list of the commands available to you: \n \n`;
    let commands = jsonfile.readFileSync('./config/commands.json');

    Object.keys(commands).forEach((com,index) => {
        helper += `${ com }: ${ commands[com] }\n`;
    });

    // In case the name changes, we update it here
    helper += `!${ bot.user.username.toLowerCase() }: Get a list of my commands`;

    // Messaging into DMs to avoid flood
    message.author.send('```\n' + helper + '\n```');
}

function showLogs(user) {
    // const data = jsonfile.readFileSync(botdata);
    // const logs = data.warning.removeAlWarnings;

    // let output = '================ LOGS ================';

    // for (let i = 0; i < logs.length; i++) {
    //     output += `\n Username: ${ logs.username }`
    // }
    
}


function clearLogs() {
    let data = jsonfile.readFileSync(botdata);
    let logs = data.removedWarnings;

    logs = [];

    data.removedWarnings = logs;
    jsonfile.writeFileSync(botdata, data, err => {
        if (err) { console.log(err); }
    });
}

// Check every hour if it can do something interesting on its own
setInterval(() => { 
    listManager.removeUserFromList('warned', warnTimer, warningManager.removeWarning);
    listManager.removeUserFromList('trolls', trollTimer);

}, refreshTimer);



bot.login(token);
