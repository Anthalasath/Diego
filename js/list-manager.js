const jsonfile = require('jsonfile');
const settingsFile = './config/settings.json';
const settingsDefaultFile = './config/settings-default.json';
const botdata = './config/botdata.json';

class ListManager {

    constructor(bot) {
        this.bot = bot;
    }

    punishTheTroll(message) {
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
            const me = members.find('id', this.bot.user.id);
    
            if (me.hasPermission(0x00000002)) {
                userToKick.kick('I told you to not abuse my warning powers...');
                message.reply('Enough of this... goodbye *kick* :diegoLUL:');
                
            }
            // Even without permissions, the this.bot will tag the user
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
                message.reply('What are you trying to do, brah ? Wanna get a warning ? :diegoLUL:');
            }
        }
    
        data.trolls = trolls;
        data.warned = warned;
        jsonfile.writeFileSync(botdata, data, err => {
            if (err) { console.log(err); }
        })
    }
    
    clearTrollList() {
        let data = jsonfile.readFileSync(botdata);
        let trolls = data.trolls;
    
        trolls = [];
    
        data.trolls = trolls;
        jsonfile.writeFileSync(botdata, data, err => {
            if (err) { console.log(err); }
        })
    }
    
    clearSpamList() {
        let data = jsonfile.readFileSync(botdata);
        let spams = data.spams;
    
        spams = [];
    
        data.spams = spams;
        jsonfile.writeFileSync(botdata, data, err => {
            if (err) { console.log(err); }
        });
    }
    
    addUserToSpamList(userID) {
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
    
    // Removes users if the timer has passed
    removeUserFromList(listName, timer, removalFunc) {
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
    
}

module.exports = {
    ListManager: ListManager
}