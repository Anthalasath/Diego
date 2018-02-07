'use strict';

const Discord = require('discord.js');
const bot = new Discord.Client();
const jsonfile = require('jsonfile');
const warnedFile = './config/warned.json';
const trollsFile = './config/trolls.json';
const settingsFile = './config/settings.json';
const settingsDefaultFile = './config/settings-default.json';

// Use this to hardcode your token (NOT RECOMMENDED):
// const token = 'Your token here';

// Use this for Heroku:
// const token = process.env.TOKEN;

// Use this if you're using a custom JSON file to store your token:
const token = jsonfile.readFileSync('./config/token.json').token;

let refreshTimer = jsonfile.readFileSync(settingsFile).refreshTimer;
let timeBeforeUnwarned = jsonfile.readFileSync(settingsFile).timeBeforeUnwarned;
let timeToGetRemovedFromTrollList = jsonfile.readFileSync(settingsFile).timeToGetRemovedFromTrollList;

bot.on('disconnect', () => {
    bot.login(token);
});

bot.on('message', message => {

    if (message.author === bot.user) { return; }

    const settings = jsonfile.readFileSync(settingsFile);
    const masters = jsonfile.readFileSync(settingsFile).masters;

    let content = message.content;

    if (message.guild) {
        for (let i = 0; i < masters.length; i++) {
            let roleName = masters[i];
            let approvedRole = message.guild.roles.find('name', roleName).id;
            if (message.member.roles.has(approvedRole)) {
                parseMessage(message);
                return;
            }
        }
    }

    if (content.slice(0, 8) === `${ settings.prefix }warning` || content.slice(0, 5) === `${ settings.prefix }warn`) {
        punishTheTroll(message);
    }
});

// Process the message and checking for commands
function parseMessage(message) {

    let settings = jsonfile.readFileSync(settingsFile);
    let command;

    if (message.content[0] !== `${ settings.prefix }`) {
        return;
    }
    command = message.content.slice(1, message.content.length);
    switch (command) {
        case 'reset':
        let defaultSettings = jsonfile.readFileSync(settingsDefaultFile);
        jsonfile.writeFileSync(settingsFile, defaultSettings, err => {
            if (err) { console.log(err); }
        });
        message.reply('My settings have been set to default.');
            break;

        case 'removeAllWarnings':
            removeAllWarnings();
            break;

        case 'clearTrollList':
        case 'clearTrollsList':
        case 'clearTrolls':
            clearTrollList(message);
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

    if (command.toLowerCase() === `${ bot.user.username.toLowerCase() }`) {
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
            removeWarning(null, user, message);
        });
        return;
    }
    if (command.slice(0, 7) === 'warning' || command.slice(0, 4) === 'warn') {
        const users = message.mentions.users.array();

        users.forEach(user => {
            warnUser(message, user);
        });
        return;
    }
}


function punishTheTroll(message) {

    let trolls = jsonfile.readFileSync(trollsFile);
    let warned = jsonfile.readFileSync(warnedFile);
    let userID = message.author.id;
    let username = message.author.username;
    let isAlreadyATroll;
    let isAlreadyWarned;
    let indexOnTrollList;

    for (let i = 0; i < trolls.list.length; i++) {
        if (trolls.list[i].id === userID) {
            isAlreadyATroll = true;
            
            // Ignore users who were already kicked to avoid spam
            if (trolls.list[i].wasKicked) {
                return;
            }
            break;
        }
    }

    for (let i = 0; i < warned.list.length; i++) {
        if (warned.list[i].id === userID) {
            isAlreadyWarned = true;
            indexOnTrollList = i;
            break;
        }
    }

    if (isAlreadyATroll && isAlreadyWarned) {
        const members = message.guild.members;
        const userToKick = members.find('id', userID);
        const me = members.find('id', bot.user.id);

        if (me.hasPermission(0x00000002)) {
            userToKick.kick('I told you to not abuse my warning powers...');
            message.reply('Enough of this... goodbye *kick* :diegoLUL:');
            
        }
        // Even without permissions, the bot will tag the user
        // as "kicked", because it uses this tag to ignore users.
        trolls.list[indexOnTrollList].wasKicked = true;

    } else if (isAlreadyATroll) {
        warnUser(message, message.author);
        
    } else {
        const trollData = {"username": username, "id": userID, "time": Date.now(), "wasKicked": false};
        trolls.list.push(trollData);

        if (isAlreadyWarned) {
            message.reply('Be carefull, you\'ve already been warned...');
            
        } else {
            message.reply('What are you trying to do, brah ? Wanna get a warning ? :diegoLUL:');
        }
    }

    jsonfile.writeFileSync(trollsFile, trolls, err => {
        if (err) { console.log(err); }
    });
}


function clearTrollList(message) {
    message.reply('Troll list has been cleared');
    jsonfile.writeFileSync(trollsFile, {"list":[]}, err => {
        if (err) { console.log(err); }
    });
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
    message.reply('Sliding into your DMs...');
    message.author.send('```\n' + helper + '\n```');
}



function addMaster(message, master) {
    let settings = jsonfile.readFileSync(settingsFile);
    let masterExists;

    if (!master) {
        message.reply('I can\'t accept nothing as my master!');
        return;
    }
    masterExists = message.guild.roles.find('name', master);

    if (!masterExists) {
        message.reply(`The specified role doesn't exist`)
        return;
    }

    if (settings.masters.includes(master)) {
        message.reply(`${ master } are already my masters.`);
        return;
    }

    settings.masters.push(master);
    jsonfile.writeFileSync(settingsFile, settings, err => {
        console.log(err);
    });
    message.reply(`I now accept ${ master } as my masters.`);
}


function removeMaster(message, master) {
    let settings = jsonfile.readFileSync(settingsFile);
    const curChan = message.channel;

    let index = -1;
    let user;
    let warned = jsonfile.readFileSync(warnedFile);

    if (settings.masters.length === 1) {
        message.reply(`Sorry, but if you would remove this role from my masters I would be left with no masters. \n Type ${ settings.prefix }masters for a list of my masters.`)
        return;
    }

    if (!master) {
        message.reply('Uhm... I can\'t remove nothing from my masters.');
        return;
    }

    for (let i = 0; i < settings.masters.length; i++) {
        if (settings.masters[i] === master) {
            index = i;
            break;
        }
    }
    if (index >= 0) {
        settings.masters.splice(index, 1);
        jsonfile.writeFileSync(settingsFile, settings, err => {
            console.log(err);
        });
        message.reply(`${ master } are no longer my masters. Am I going to be free at last ?`);
    } else {
        message.reply(`${ master } are already not my masters. To get a list of my masters type ${ settings.prefix }masters`);
    }
}


function warnUser(message, user) {
    const warned = jsonfile.readFileSync(warnedFile);
    const warnings = message.guild.channels.find('name', 'warnings');
    const general = message.guild.channels.find('name', 'general');
    const warnedTime = new Date();
    const warnedData = {"username": user.username, "id": user.id, "time": warnedTime.getTime()};

    for (var i = 0; i < warned.list.length; i++) {
        const userID = warned.list[i].id;
        if (user.id === userID) {
            message.reply(`It seems like ${ user.username } was already warned.`);
            return;
        }
    }
    general.send(`<@${ user.id }> has been warned.`);
    warnings.send(`:warning: <@${ user.id }> has been warned.`);
    warned.list.push(warnedData);

    jsonfile.writeFileSync(warnedFile, warned, err => {
        if (err) {
            console.log(err);
        }
    });
}


function removeAllWarnings() {
    const warnedUsers = jsonfile.readFileSync(warnedFile).list;
    const warnings = bot.channels.find(val => val.name === 'warnings');
    const general = bot.channels.find(val => val.name === 'general');

    if (warnedUsers.length === 0) { return; }

    jsonfile.writeFileSync(warnedFile, { "list": [] }, err => {
        if (err) {
            console.log(err);
        }
    });

    warnings.fetchMessages({limit: 100})
        .then(messages => {
                let messagesArr = messages.array();
                let messageCount = messagesArr.length;

                for (let i = 0; i < messageCount; i++) {
                    messagesArr[i].delete();

                    if (i === messageCount -1) {
                        general.send('All warnings have been removed.');
                    }
                }
        }).catch(err => {
            console.log(err);
        });
}


// Only 2 parameters are required for this function to work properly
function removeWarning(index, user, message) {
    const warnings = bot.channels.find(val => val.name === 'warnings');

    let warned = jsonfile.readFileSync(warnedFile);
    let warnedTime;
    let userID;
    let username;

    message = message || null;

    if (index !== null && index >= warned.list.length) {
        index = null; // Prevents incorrect index input
    }

    if (index === null && !user) {
        if (message) {
            message.reply('Missing parameters in function call.');
        }
        return;
    }

    // This big bloc makes sure to complete any missing parameters
    if (index !== null && !user) {
        userID = warned.list[index].id;
        username = warned.list[index].username;

    } else if (index === null && user) {
        username = user.username;
        userID = user.id;

        for (var i = 0; i < warned.list.length; i++) {
            if (warned.list[i].id === userID) {
                index = i;
                // warnedTime = new Date(warned.list[i].time); // Getting the time for later on
                break;
            } else if (i === warned.list.length -1) {
                if (message) {
                    message.reply(`${ username } has not been warned. Are you sure that's the correct username ?`);
                    return;
                }
            }
        }
    }
    //Removing the user from the list on the channel
    warnings.fetchMessages({limit: 100})
        .then(messages => {
            let messagesArr = messages.array();
            let messageCount = messagesArr.length;

            for (let i = 0; i < messageCount; i++) {
                let msg = messagesArr[i];
                let content = msg.content;
                // let userToRemove = content.search(`:warning: ${ username }`);
                let userToRemove = msg.mentions.users.find(val => val.id === userID);
                if (userToRemove) {
                    msg.delete();
                    return;
                }
            }
        }).catch(err => {
            console.log(err);
        });

    warned.list.splice(index, 1); // removes the user from the list
    jsonfile.writeFileSync(warnedFile, warned, err => {
        if (err) {
            console.log(err);
        }
    });

    // Responding in the appropriate channel
    let channel;
    if (message) {
        channel = message.channel;
        channel.send(`<@${ userID }> , your warning has been removed and your crimes expiated. CryptoJesus has forgiven your sins... for now.`)
    } else {
        channel = bot.channels.find('name', 'general');
        channel.send(`<@${ userID }> , your warning has been removed and your crimes expiated. CryptoJesus has forgiven your sins... for now.`);
    }
}


// Check every hour if it can do something interesting on its own
setInterval(() => {
    let warned = jsonfile.readFileSync(warnedFile);
    let trolls = jsonfile.readFileSync(trollsFile);
    let indexToRemoveFromTrollList = [];

    // Checks if it can remove users from the warned list
    for (var i = 0; i < warned.list.length; i++) {
        const hasWarnedTimePassed = (Date.now() - warned.list[i].time) >= timeBeforeUnwarned ? true : false;
        if (hasWarnedTimePassed) {
            removeWarning(i);
        }
    }

    // Checks if it can remove users from the troll list
    for (let i = 0; i < trolls.list.length; i++) {
        const timeSinceRegistered = Date.now() - trolls.list[i].time;

        if (timeSinceRegistered >= timeToGetRemovedFromTrollList) {
            indexToRemoveFromTrollList.push(i);
        }
    }
    indexToRemoveFromTrollList.forEach(index => {
        trolls.list.splice(index, 1);
    });
    if (indexToRemoveFromTrollList.length !== 0) {
        jsonfile.writeFileSync(trollsFile, trolls, err => {
            if (err) { console.log(err); }
        })
    }
}, refreshTimer);


bot.login(token);
