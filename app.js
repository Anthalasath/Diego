'use strict';

const Discord = require('discord.js');
const bot = new Discord.Client();
const jsonfile = require('jsonfile');
const settingsFile = './config/settings.json';
const settingsDefaultFile = './config/settings-default.json';
const botdata = './config/botdata.json';

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
    const moderator = message.guild.roles.find('name', 'Moderator').id;
    const trusted = message.guild.roles.find('name', 'Trusted Members').id;
    const mentions = message.mentions.users.array();

    let settings = jsonfile.readFileSync(settingsFile);
    let command;

    if (message.content[0] !== `${ settings.prefix }`) {
        return;
    }

    if (!message.member) { return; }

    command = message.content.slice(1, message.content.length);

    // Commands reserved to mods
    if (message.member.roles.has(moderator)) {
        if (command === 'removeAllWarnings') {
            removeAllWarnings(message.author);
            return;
        } else if (command === 'clearLogs') {
            clearLogs();
            message.reply('Logs have been cleared');
        // } else if (command.slice(0, 4) === 'logs') {
        //     let targetLogs = command.slice(5, command.length);

        //     if (targetLogs === 'warnings' || targetLogs === 'removedWarnings') {
        //         showLogs('removedWarnings');
        //     }
        // }
        } else if (command === 'clearSpamList') {
            clearSpamList();
            message.reply('Spam list has been cleared');
        }
    }

    // Commands for moderators and trusted members
    if (message.member.roles.has(moderator) || message.member.roles.has(trusted)) {
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
                clearTrollList();
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

    //Commands for everyone
    if (command.toLowerCase() === `mywarning` || command.toLowerCase() === `mywarnings`) {
        checkUserWarnings(message);
    }

    // Commands that only affect normal members
    if (!message.member.roles.has(moderator) && !message.member.roles.has(trusted)) {
        // Mentioning mods is prohibited
        for (let i = 0; i < mentions.length; i++) {
            const mentionnedUserID = mentions[i].id;
            const mentionnedUserGuild = message.guild.members.find('id', mentionnedUserID);
    
            if (mentionnedUserGuild.roles.has(moderator)) {
                warnUser(message, message.author);
            }
        }

        // DiegoLUL
        if (command.slice(0, 7) === `warning` || command.slice(0, 4) === `warn`) {
            punishTheTroll(message);
        }

        if (command === bot.user.username.toLowerCase()) {
            if (!addUserToSpamList(message.author.id)) { return; } 
            message.author.send('https://www.youtube.com/watch?v=wS9yN9YuDBg');
        }
    }
}


function punishTheTroll(message) {
    let data = jsonfile.readFileSync(botdata);
    let trolls = data.trolls;
    let warned = data.warned;
    let userID = message.author.id;
    let username = message.author.username;
    let isAlreadyATroll;
    let isAlreadyWarned;
    let indexOnTrollList;

    for (let i = 0; i < trolls.length; i++) {
        if (trolls[i].id === userID) {
            isAlreadyATroll = true;
            
            // Ignore users who were already kicked to avoid spam
            if (trolls[i].wasKicked) {
                return;
            }
            break;
        }
    }

    for (let i = 0; i < warned.length; i++) {
        if (warned[i].id === userID) {
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
        trolls[indexOnTrollList].wasKicked = true;

    } else if (isAlreadyATroll) {
        warnUser(message, message.author);
        
    } else {
        const trollData = {"username": username, "id": userID, "time": Date.now(), "wasKicked": false};
        trolls.push(trollData);

        if (isAlreadyWarned) {
            message.reply('Be carefull, you\'ve already been warned...');
            
        } else {
            message.reply('What are you trying to do, brah ? Wanna get a warning ? :diegoLUL:');
        }
    }

    data.trolls = trolls;
    data.warned = warned;
    jsonfile.writeFileSync(botdata, data, err => {
        if (err) { console.log(err); }
    })
}

function clearTrollList() {
    let data = jsonfile.readFileSync(botdata);
    let trolls = data.trolls;

    trolls = [];

    data.trolls = trolls;
    jsonfile.writeFileSync(botdata, data, err => {
        if (err) { console.log(err); }
    })
}

function clearSpamList() {
    let data = jsonfile.readFileSync(botdata);
    let spams = data.spams;

    spams = [];

    data.spams = spams;
    jsonfile.writeFileSync(botdata, data, err => {
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


function warnUser(message, user) {
    const warnings = message.guild.channels.find('name', 'warnings');
    const general = message.guild.channels.find('name', 'general');
    const warnedTime = new Date();
    const warnedData = {"username": user.username, "id": user.id, "time": warnedTime.getTime()};

    let data = jsonfile.readFileSync(botdata);
    let warned = data.warned;

    for (var i = 0; i < warned.length; i++) {
        const userID = warned[i].id;
        if (user.id === userID) {
            message.reply(`It seems like ${ user.username } was already warned.`);
            return;
        }
    }
    general.send(`<@${ user.id }> has been warned.`);
    warnings.send(`:warning: <@${ user.id }> has been warned.`);
    warned.push(warnedData);

    data.warned = warned;
    jsonfile.writeFileSync(botdata, data, err => {
        if (err) { console.log(err); }
    })
}

function addUserToSpamList(userID) {
    let data = jsonfile.readFileSync(botdata);
    let spams = data.spams;
    let spamData;

    for (let i = 0; i < spams.length; i++) {
        const spammer = spams[i];
        if (spammer.id === userID) {
            return false;
        }
    }
    spamData = { "id": userID, "time": Date.now() };
    spams.push(spamData);

    data.spams = spams;
    jsonfile.writeFileSync(botdata, data, err => {
        if (err) { console.log(err); }
    });

    return true;
}


// Allows a user to check its own warnings
function checkUserWarnings(message) {
    const userID = message.author.id;
    const data = jsonfile.readFileSync(botdata);
    const warnedUsers = data.warned;

    if (!addUserToSpamList(userID)) { return; }

    for (let i = 0; i < warnedUsers.length; i++) {
        const warnedUser = warnedUsers[i];

        if (warnedUser.id === userID) {
            message.author.send('You currently have one warning');
            // message.reply('You currently have one warning');
            return;
        } 
    }
    // message.reply('You don\'t have any warnings');
    message.author.send('You don\'t have any warnings');
}



function removeAllWarnings(initiator) {
    const warnings = bot.channels.find(val => val.name === 'warnings');
    const general = bot.channels.find(val => val.name === 'general');

    let data = jsonfile.readFileSync(botdata);
    let warned = data.warned;
    let logs = data.removedWarnings;
    let logData;

    if (warned.length === 0) {
        general.send('There are no warnings to remove.');
    }
    logData = {
        "initiator": {
            "username": initiator.username,
            "id": initiator.id
        },
        "target": {
            "username": "all",
            "id": "all"
        },
        "time": new Date()
    };
    logs.push(logData);
    
    warned = [];

    data.warned = warned;
    data.removedWarnings = logs;
    jsonfile.writeFileSync(botdata, data, err => {
        if (err) { console.log(err); }
    })

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

    let data = jsonfile.readFileSync(botdata);
    let warned = data.warned;
    let removedWarnings = data.removedWarnings;
    let initiator;
    let logData;
    let userID;
    let username;

    if (index !== null && index >= warned.length) {
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
        userID = warned[index].id;
        username = warned[index].username;

    } else if (index === null && user) {
        username = user.username;
        userID = user.id;

        for (var i = 0; i < warned.length; i++) {
            if (warned[i].id === userID) {
                index = i;
                break;
            } else if (i === warned.length -1) {
                if (message) {
                    message.reply(`${ username } has not been warned. Are you sure that's the correct username ?`);
                    return;
                }
            }
        }
    }
    
    // Adding logs to keep track of who removed the warning and for who, and when
    if (message) {
        initiator = message.author;
    } else {
        initiator = bot.user
    }
    logData = {
        "initiator": {
            "username": initiator.username,
            "id": initiator.id
        },
        "target": {
            "username": username,
            "id": userID
        },
        "time": new Date()
    };
    removedWarnings.push(logData);

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

    warned.splice(index, 1); // removes the user from the list

    data.warned = warned;
    data.removedWarnings = removedWarnings;
    jsonfile.writeFileSync(botdata, data, err => {
        if (err) { console.log(err); }
    })

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

// Removes users if the timer has passed
function removeUsersFromList(listName, timer, removalFunc) {
    let data = jsonfile.readFileSync(botdata);
    let list;
    let indexesToRemove = [];

    if (!data.listName) {
        return; 
    }

    list = data.listName;

    for (let i = 0; i < list.length; i++) {
        const hasTimerPassed = (Date.now() - list[i].time) >= timer ? true : false;

        if (hasTimerPassed) {
            if (removalFunc) {
                removalFunc(i);
            } else {
                indexesToRemove.push(i);
            }
        }
    }

    if (indexesToRemove.length === 0) { return; }

    for (let index in indexesToRemove) {
        list.splice(index, 1);
    }

    data.listName = list;
    jsonfile.writeFileSync(botdata, data, err => {
        if (err) { console.log(err); }
    });
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
    removeUsersFromList(warnedFile, warnTimer, removeWarning);
    removeUsersFromList(trollsFile, trollTimer);
    removeUsersFromList(spamListFile, spamTimer);

}, refreshTimer);



bot.login(token);


// function showLogs(targetLogs) {
//     const logs;

//     let data = jsonfile.readFileSync(botdata);
//     let response;
    
//     if (!data.targetLogs.length) { return; }

//     logs = data.targetLogs;
// }

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

