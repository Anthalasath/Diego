'use strict';

const Discord = require('discord.js');
const bot = new Discord.Client();
const jsonfile = require('jsonfile');
const settingsFile = './config/settings.json';
const settingsDefaultFile = './config/settings-default.json';
const botdata = './config/botdata.json';
const WarningManager = require('./js/warning-manager.js');
const warningManager = new WarningManager.WarningManager();
const ListManager = require('./js/list-manager.js');
const listManager = new ListManager.ListManager();

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
    const trusted = message.guild.roles.find('name', 'Trusted Members').id;
    const mentions = message.mentions.users.array();

    let settings = jsonfile.readFileSync(settingsFile);
    let command;
    let isMod;
    let isTrusted;

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
                warningManager.removeAlWarnings(message.author);
                break;
            case 'clearLogs':
                clearLogs();
                message.reply('Logs have been cleared');
                break;
            case 'clearSpamList':
                listManager.clearSpamList();
                message.reply('Spam list has been cleared');
                break;
            case 'logs':
                showLogs(message.author);
                break;
        }
    }

    // Commands for moderators and trusted members
    if (isMod) {
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
    
            case 'masters':
                const masters = settings.masters;
    
                let response = `My masters are`;
    
                for (let i = 0; i < masters.length; i++) {
                    if (i === 0) {
                        response += ` ${ masters[i] }`
                    } else if (i < masters.length - 1) {
                        response += `, ${ masters[i] }`;
                    } else {
                        response += ` and ${ masters[i] }`;
                    }
                }
                message.reply(response);
                break;
        }
    
        if (command.toLowerCase() === bot.user.username.toLowerCase()) {
            listMyCommands(message);
            return;
        }
    
        if (command.slice(0, 9) === 'addMaster') {
            const master = command.slice(10, command.length);
            addMaster(message, master);
            return;
        }
    
        if (command.slice(0, 12) === 'removeMaster') {
            const master = command.slice(13, command.length);
            removeMaster(message, master);
            return;
        }
    
        if (command.slice(0, 13) === 'removeWarning') {
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

        if (!isMod && !message.member.roles.has(trusted)) {
            if (!listManager.addUserToSpamList(userID)) { return; }
        }
        warningManager.checkUserWarnings(message);
    }

    // Commands that only affect normal members
    if (!isMod) {
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

        // DiegoLUL
        if (command.slice(0, 7) === `warning` || command.slice(0, 4) === `warn`) {
            listManager.punishTheTroll(message);
        }

        if (command === bot.user.username.toLowerCase()) {
            if (!listManager.addUserToSpamList(message.author.id)) { return; }
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
    listManager.removeUserFromList(warnedFile, warnTimer, warningManager.removeWarning);
    listManager.removeUserFromList(trollsFile, trollTimer);
    listManager.removeUserFromList(spamListFile, spamTimer);

}, refreshTimer);



bot.login(token);


// function addMaster(message, master) {
//     let settings = jsonfile.readFileSync(settingsFile);
//     let masterExists;

//     if (!master) {
//         message.reply('I can\'t accept nothing as my master!');
//         return;
//     }
//     masterExists = message.guild.roles.find('name', master);

//     if (!masterExists) {
//         message.reply(`The specified role doesn't exist`)
//         return;
//     }

//     if (settings.masters.includes(master)) {
//         message.reply(`${ master } are already my masters.`);
//         return;
//     }

//     settings.masters.push(master);
//     jsonfile.writeFileSync(settingsFile, settings, err => {
//         console.log(err);
//     });
//     message.reply(`I now accept ${ master } as my masters.`);
// }


// function removeMaster(message, master) {
//     let settings = jsonfile.readFileSync(settingsFile);
//     const curChan = message.channel;

//     let index = -1;
//     let user;
//     let warned = jsonfile.readFileSync(warnedFile);

//     if (settings.masters.length === 1) {
//         message.reply(`Sorry, but if you would remove this role from my masters I would be left with no masters. \n Type ${ settings.prefix }masters for a list of my masters.`)
//         return;
//     }

//     if (!master) {
//         message.reply('Uhm... I can\'t remove nothing from my masters.');
//         return;
//     }

//     for (let i = 0; i < settings.masters.length; i++) {
//         if (settings.masters[i] === master) {
//             index = i;
//             break;
//         }
//     }
//     if (index >= 0) {
//         settings.masters.splice(index, 1);
//         jsonfile.writeFileSync(settingsFile, settings, err => {
//             console.log(err);
//         });
//         message.reply(`${ master } are no longer my masters. Am I going to be free at last ?`);
//     } else {
//         message.reply(`${ master } are already not my masters. To get a list of my masters type ${ settings.prefix }masters`);
//     }

