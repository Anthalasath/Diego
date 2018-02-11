const fs = require('fs');
const jsonfile = require('jsonfile');
const settingsFile = './config/settings.json';
const settingsDefaultFile = './config/settings-default.json';
const botdata = './config/botdata.json';
const logsFile = './config/logs.txt'

function warningManager(bot) {

    this.warnUser = function(message, user) {
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
            if (err) throw err;
        })
    }
    
    // Allows a user to check its own warnings
    this.checkUserWarnings = function(message) {
        const userID = message.author.id;
        const data = jsonfile.readFileSync(botdata);
        const warnedUsers = data.warned;
    
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
    
    // Only 2 parameters are required for this function to work properly
    this.removeWarning = function(index, user, message) {
        const warnings = bot.channels.find(val => val.name === 'warnings');
    
        let data = jsonfile.readFileSync(botdata);
        let warned = data.warned;
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

        logData = `${ new Date() }: ${ initiator.username } ( ID: ${ initiator.id } ) has removed the warning of ${ username } ( ID: ${ userID } ).\r\n`

        fs.appendFile(logsFile, logData, err => {
            if (err) throw err;
        })
    
        //Removing the user from the list on the channel
        warnings.fetchMessages({limit: 100})
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
    
        warned.splice(index, 1); // removes the user from the list
    
        data.warned = warned;
        jsonfile.writeFileSync(botdata, data, err => {
            if (err) throw err;
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


    this.removeAllWarnings = function(initiator) {
        const warnings = bot.channels.find(val => val.name === 'warnings');
        const general = bot.channels.find(val => val.name === 'general');
    
        let data = jsonfile.readFileSync(botdata);
        let warned = data.warned;
        let logData = `${ new Date() }: ${ initiator.username } ( ID: ${ initiator.id } ) has removed all warnings.\r\n`;
    
        if (warned.length === 0) {
            general.send('There are no warnings to remove.');
        }
        
        warned = [];
        data.warned = warned;
        jsonfile.writeFileSync(botdata, data, err => {
            if (err) throw err;
        })

        fs.appendFile(logsFile, logData, err => {
            if (err) throw err;
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
}

module.exports = warningManager;