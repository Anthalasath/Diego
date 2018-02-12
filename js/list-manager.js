'use strict';

const jsonfile = require('jsonfile');
const settingsFile = './config/settings.json';
const settingsDefaultFile = './config/settings-default.json';
const trollsFile = './data/trolls.json';
const warningsFile = './data/warnings.json';

function listManager(bot) {

    this.punishTheTroll = function(message) {
        let trolls = jsonfile.readFileSync(trollsFile);
        let warnings = jsonfile.readFileSync(warningsFile);
        let userID = message.author.id;
        let username = message.author.username;
        let isAlreadyATroll;
        let isAlreadyWarned;
        let indexOnTrollList;
        let diegoLULEmoji = bot.emojis.find('name', 'diegoLUL');
    
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
    
        for (let i = 0; i < warnings.length; i++) {
            if (warnings[i].id === userID) {
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
                message.reply(`Enough of this... goodbye *kick* ${ diegoLULEmoji }`);
                
            }
            // Even without permissions, the bot will tag the user
            // as "kicked", because it uses this tag to ignore users.
            trolls[indexOnTrollList].wasKicked = true;
    
        } else if (isAlreadyATroll) {
            warning.warnUser(message, message.author);
            
        } else {
            const trollData = {"username": username, "id": userID, "time": Date.now(), "wasKicked": false};
            trolls.push(trollData);
    
            if (isAlreadyWarned) {
                message.reply('Be carefull, you\'ve already been warned...');
                
            } else {
                message.reply(`What are you trying to do, brah ? Wanna get a warning ? ${ diegoLULEmoji }`);
            }
        }

        jsonfile.writeFileSync(trollsFile, trolls, err => {
            if (err) throw err;
        });
        jsonfile.writeFileSync(warningsFile, warnings, err => {
            if (err) throw err;
        });
    }

    this.clearTrollList = function() {
        let trolls = jsonfile.readFileSync(trollsFile);
    
        trolls = [];
    
        jsonfile.writeFileSync(trollsFile, trolls, err => {
            if (err) throw err;
        })
    }

    this.removeUsersWithExpiredTimers = function(list, timer) {
        let usersToRemoveByIndex = [];
    
        for (let i = 0; i < list.length; i++) {
            let hasTimerExpired = Date.now() - list[i].time >= timer ? true : false;
            if (hasTimerExpired) {
                usersToRemoveByIndex.push(i);
            }
        }
    
        for (let i = 0; i < usersToRemoveByIndex.length; i++) {
            list.splice(usersToRemoveByIndex[i], 1);
        }
        return list;
    }
}


module.exports = listManager;