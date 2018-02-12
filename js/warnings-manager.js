'use strict';

const fs = require('fs');
const jsonfile = require('jsonfile');
const settingsFile = './config/settings.json';
const settingsDefaultFile = './config/settings-default.json';
const warningsFile = './data/warnings.json';
const logsFile = './data/logs.txt'

function WarningsManager(bot) {

    this.warnUser = function(message, user) {
        const warningsChannel = message.guild.channels.find('name', 'warnings');
        const general = message.guild.channels.find('name', 'general');
        const warnedTime = new Date();
        const warnedData = {"username": user.username, "id": user.id, "time": warnedTime.getTime()};
    
        let warnings = jsonfile.readFileSync(warningsFile);
    
        for (var i = 0; i < warnings.length; i++) {
            const userID = warnings[i].id;
            if (user.id === userID) {
                message.reply(`It seems like ${ user.username } was already warned.`);
                return;
            }
        }
        general.send(`<@${ user.id }> has been warned .Please read the #rules. :warning:`);
        warningsChannel.send(`:warning: <@${ user.id }> has been warned.`);
        warnings.push(warnedData);
    
        jsonfile.writeFileSync(warningsFile, warnings, err => {
            if (err) throw err;
        })
    }
    

    // Allows a user to check its own warnings
    this.checkUserWarnings = function(message) {
        const userID = message.author.id;
        const warnings = jsonfile.readFileSync(warningsFile);
    
        for (let i = 0; i < warnings.length; i++) {
            const warnedUser = warnings[i];
    
            if (warnedUser.id === userID) {
                message.author.send('You currently have one warning');
                // message.reply('You currently have one warning');
                return;
            } 
        }
        // message.reply('You don\'t have any warnings');
        message.author.send('You don\'t have any warnings');
    }
    

    // Only 2 parameters are required for this function to work properly
    this.removeWarning = function(index, user, message) {
        const warningsChannel = bot.channels.find(val => val.name === 'warnings');
        
        let warnings = jsonfile.readFileSync(warningsFile);
        let initiator;
        let logData;
        let userID;
        let username;
    
        if (index !== null && index >= warnings.length) {
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
            userID = warnings[index].id;
            username = warnings[index].username;
    
        } else if (index === null && user) {
            username = user.username;
            userID = user.id;
    
            for (var i = 0; i < warnings.length; i++) {
                if (warnings[i].id === userID) {
                    index = i;
                    break;
                } else if (i === warnings.length -1) {
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

        logData = `- ${ new Date() }: ${ initiator.username } ( ID: ${ initiator.id } ) has removed the warning of ${ username } ( ID: ${ userID } ).\r\n`

        fs.appendFile(logsFile, logData, err => {
            if (err) throw err;
        })
    
        //Removing the user from the list on the channel
        warningsChannel.fetchMessages({limit: 100})
            .then(messages => {
                let messagesArr = messages.array();
                let messageCount = messagesArr.length;
    
                for (let i = 0; i < messageCount; i++) {
                    let msg = messagesArr[i];
                    let content = msg.content;
                    let userToRemove = msg.mentions.users.find(val => val.id === userID);
                    if (userToRemove) {
                        msg.delete();
                        return;
                    }
                }
            }).catch(err => {
                throw err;
            });
    
        warnings.splice(index, 1); // removes the user from the list
    

        jsonfile.writeFileSync(warningsFile, warnings, err => {
            if (err) throw err;
        })
    
        // Responding in the appropriate channel
        let channel;
        if (message) {
            channel = message.channel;
            let general = message.guild.channels.find('name', 'general');

            if (!Object.is(channel, general)) {
                channel.send(`<@${ userID }> , your warning has been removed and your crimes expiated. CryptoJesus has forgiven your sins... for now.`);
            }
            general.send(`<@${ userID }> , your warning has been removed and your crimes expiated. CryptoJesus has forgiven your sins... for now.`);
        } else {
            let guild = bot.guilds.find('name', 'PRPS');
            if (guild) {
                channel = guild.find('name', 'general');
                if (channel) {
                    channel.send(`<@${ userID }> , your warning has been removed and your crimes expiated. CryptoJesus has forgiven your sins... for now.`);
                }
            }
        }
    }

    this.removeAllWarnings = function(initiator) {
        const warningsChannel = bot.channels.find(val => val.name === 'warnings');
        const general = bot.channels.find(val => val.name === 'general');
    
        let warnings = jsonfile.readFileSync(warningsFile);
        let logData = `- ${ new Date() }: ${ initiator.username } ( ID: ${ initiator.id } ) has removed all warnings.\r\n`;
    
        if (warnings.length === 0) {
            general.send('There are no warnings to remove.');
        }
        
        warnings = [];
        jsonfile.writeFileSync(warningsFile, warnings, err => {
            if (err) throw err;
        })

        fs.appendFile(logsFile, logData, err => {
            if (err) throw err;
        })
    
        warningsChannel.fetchMessages({limit: 100})
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

    this.getWarnings = function(user) {
        user.send('Here is the file with all warnings:', {
            files: [
                warningsFile
            ]
        });
    }
}

module.exports = WarningsManager;