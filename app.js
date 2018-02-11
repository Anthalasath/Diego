'use strict';

const Discord = require('discord.js');
const bot = new Discord.Client();
const jsonfile = require('jsonfile');
const fs = require('fs');
const readline = require('readline');
const settingsFile = './config/settings.json';
const settingsDefaultFile = './config/settings-default.json';
const botdata = './config/botdata.json';
const logsFile = './config/logs.txt';
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
            warningManager.removeAllWarnings(message.author);
        }
        
        if (command.slice(0, 4) === 'logs') {
            if (command.includes('clear')) {
                clearLogs();
                message.reply('Logs have been cleared');

            } else {
                showLogs(message.author);
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


// Update logs from a JSON file.
function updateLogs(user, isOverride, file) {
    const hasFailed = false;
    const logs = jsonfile.readFileSync(file, err => {
        if (err) {
            console.log(err);
            hasFailed = true;
        }
    });

    let data;

    if (hasFailed || !logs.removedWarnings || typeof logs.removedWarnings !== "object") { return false; }

    data = jsonfile.readFileSync(botdata);

    if (isOverride) {
        data.removedWarnings = logs.removedWarnings;

    } else {
        data.removedWarnings = data.removedWarnings.concat(logs.removeAllWarnings);
    }

    jsonfile.writeFileSync(botdata, data => {
        if (err) throw err;
    });
    return true;
}


function showLogs(user) {
    const logsPerMsg = 15;
    const timeBetweenMsgs = 3000;

    let lineReader;
    let logs = [];
    let response = '';

    // Nested function
    function sendLogs() {
        fs.readFile(logsFile, 'utf8', (err, data) => {
            if (err) throw err;
            let logsWithoutEND = data.replace('\r\nEND', '');
            fs.writeFileSync(logsFile, logsWithoutEND);
        });

        if (logs.length === 0) {
            user.send('I have nothing in my logs.');
            return;
        }

        for (let i = 0; i < logs.length; i++) {
            response += `${ logs[i] }\n`;
            if (i % logsPerMsg === 0) {
                let res = response;
                response = '';
                setTimeout(() => {
                    user.send(res);
                }, timeBetweenMsgs);                
            }
        }
        if (response) {
            user.send(response);
        } else {
            user.send('tada');
        }
    }

    fs.appendFileSync(logsFile, '\r\nEND', err => {
        if (err) throw err;
    });

    lineReader = readline.createInterface({
        input: fs.createReadStream(logsFile)
    });

    lineReader.on('line', line => {
        if (line !== 'END') {
            logs.push(line);
        } else {
            sendLogs();
        }
    });
    
    // user.send('```' + response + '\n \n To delete all of my logs, use the !clearLogs command.\n To see who has a specific ID in the Discord server, type <@[ID]> and press enter.\n This will mention the user with that ID.\n```');
}


function clearLogs() {
    let data = jsonfile.readFileSync(botdata);
    let logs = data.removedWarnings;

    logs = [];

    data.removedWarnings = logs;
    jsonfile.writeFileSync(botdata, data, err => {
        if (err) throw err;
    });
}

// Check every hour if it can do something interesting on its own
setInterval(() => { 
    listManager.removeUserFromList('warned', warnTimer, warningManager.removeWarning);
    listManager.removeUserFromList('trolls', trollTimer);

}, refreshTimer);



bot.login(token);
