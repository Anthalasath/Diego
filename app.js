'use strict';

const Discord = require('discord.js');
const bot = new Discord.Client();
const WarningsManager = require('./js/warnings-manager.js');
const warningsManager = new WarningsManager(bot);
const ListManager = require('./js/list-manager.js');
const listManager = new ListManager(bot);
const PriceGetter = require('./js/price-getter.js');
const priceGetter = new PriceGetter();
const PreferencesManager = require('./js/preferences-manager.js');
const preferencesManager = new PreferencesManager();
const LogsManager = require('./js/logs-manager.js');
const logsManager = new LogsManager();
const jsonfile = require('jsonfile');
const fs = require('fs');
const readline = require('readline');
const settingsFile = './config/settings.json';
const settingsDefaultFile = './config/settings-default.json';
const logsFile = './data/logs.txt';
const warningsFile = './data/warnings.json';
const trollsFile = './data/trolls.json';
const refreshTimer = jsonfile.readFileSync(settingsFile).refreshTimer;

// Use this to hardcode your token (NOT RECOMMENDED):
// const token = 'Your token here';

// Use this for Heroku:
// const token = process.env.TOKEN;

// Use this if you're using a custom JSON file to store your token:
const token = jsonfile.readFileSync('./config/token.json').token;


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

    if (!message.guild) { return; }

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
        if (command === 'removeAllWarnings') {
            warningsManager.removeAllWarnings(message.author);
            return;
        }

        if (command === 'getWarnings') {
            warningsManager.getWarnings(message.author);
            return;
        }

        if (command === 'getPrefs') {
            preferencesManager.getPrefsFile(message.author);
            return;
        }
        
        if (command.slice(0, 4) === 'logs') {
            if (command.includes('clear')) {
                logsManager.clearLogs();
                message.reply('My logs have been cleared');

            // } else if (command.includes('update')) {
            //     let file = message.attachments.find('filename', 'logs.txt');
            //     if (file) {
            //         updateLogs(file.url);
            //         message.reply('My logs have been updated.');
            //     } else {
            //         message.reply('I can\'t update my logs because you don\'t have any logs.txt file attached to your message.');
            //     }
            } else {
                logsManager.getLogs(message.author);
            }
        }
    }
    // Commands for moderators and trusted members
    if (isMod || message.member.roles.has(trusted)) {
        switch (command) {
            case 'reset':
            let defaultSettings = jsonfile.readFileSync(settingsDefaultFile);
            jsonfile.writeFileSync(settingsFile, defaultSettings, err => {
                if (err) throw err;
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
    
        if (command.slice(0, 13) === 'removeWarning' || command.slice(0, 7) === 'forgive') {
            const users = message.mentions.users.array();
            
            users.forEach(user => {
                warningsManager.removeWarning(null, user, message);
            });
            return;
        }
        if (command.slice(0, 7) === 'warning' || command.slice(0, 4) === 'warn') {
            const users = message.mentions.users.array();
            for (let i = 0; i < users.length; i++) {
                // Don't warn yourself
                if (message.author.id !== users[i].id) {
                    warningsManager.warnUser(message, users[i]);
                }
            }
            return;
        }
    }
    //Commands for everyone
    if (command.toLowerCase() === bot.user.username.toLowerCase()) {
        if (isMod) {
            listMyCommands(message, 'mod');
            
        } else if (message.member.roles.has(trusted)) {
            listMyCommands(message, 'trusted');
            
        } else {
            listMyCommands(message);
        }
        return;
    }

    if (command.slice(0, 7) === 'convert') {
        let amount = command.slice(8, command.length);

        priceGetter.convertEthToUSD(message.author, amount);
    }

    if (command.slice(0, 5) === 'prefs') {
        if (command.slice(6, 15) === 'timezone=') {
            let timezone = command.slice(15, command.length);
            preferencesManager.updateTimezone(message.author, timezone);
        }
    }

    if (command.toLowerCase() === `mywarning` || command.toLowerCase() === `mywarnings`) {
        warningsManager.checkUserWarnings(message);
    }

    if (command.slice(0, 5) === 'price') {
        let args = command.slice(6, command.length);

        if (args.length === 0) {
            priceGetter.getPurpose(message);
            priceGetter.getDUBI(message);

        } else if (args.toLowerCase() === 'purpose' || args.toLowerCase() === 'prps') {
            priceGetter.getPurpose(message);

        } else if (args.toLowerCase() === 'dubi' || args.toLowerCase() === 'decentralized universal basic income') {
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
                    warningsManager.warnUser(message, message.author);
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
    }
}


function listMyCommands(message, role) {
    const settings = jsonfile.readFileSync(settingsFile);

    let helper = `Here's a list of the commands available to you: \n \n`;
    let commands = jsonfile.readFileSync('./config/commands.json');
    let modCommands = commands.mod;
    let trustedCommands = commands.trusted;
    let everyoneCommands = commands.everyone;

    if (role === 'mod') {
        Object.keys(modCommands).forEach((modCom, index) => {
            helper += `${ settings.prefix }${ modCom }: ${ modCommands[modCom] }\n`;
            
        });
    }
    
    if (role === 'mod' || role === 'trusted') {
        Object.keys(trustedCommands).forEach((trustedCom, index) => {
            helper += `${ settings.prefix }${ trustedCom }: ${ trustedCommands[trustedCom] }\n`;
        });
    }

    Object.keys(everyoneCommands).forEach((everyoneCom, index) => {
        helper += `${ settings.prefix }${ everyoneCom }: ${ everyoneCommands[everyoneCom] }\n`;
    });

    // In case the name changes, we update it here
    helper += `${ settings.prefix }${ bot.user.username.toLowerCase() }: Get a list of my commands`;

    // Messaging into DMs to avoid flood
    message.author.send('```\n' + helper + '\n```');
}


// Check every hour if it can do something interesting on its own
setInterval(() => { 
    let warnings = jsonfile.readFileSync(warningsFile);
    let trolls = jsonfile.readFileSync(trollsFile);
    let warnTimer = jsonfile.readFileSync(settingsFile).warnTimer;
    let trollTimer = jsonfile.readFileSync(settingsFile).trollTimer;
    let warningsCleared = listManager.removeUsersWithExpiredTimers(warnings, warnTimer);
    let trollsCleared = listManager.removeUsersWithExpiredTimers(trolls, trollTimer);

    jsonfile.writeFileSync(warningsFile, warningsCleared, err => {
        if (err) console.log(err);
    });
    jsonfile.writeFileSync(trollsFile, trollsCleared, err => {
        if (err) console.log(err);
    });

}, refreshTimer);



bot.login(token);
