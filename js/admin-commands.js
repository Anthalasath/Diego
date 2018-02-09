'use strict';

const jsonfile = require('jsonfile');
const settingsFile = './config/settings.json';
const settingsDefaultFile = './config/settings-default.json';
const adminCommands = './config/admin-commands.json';

////////////////////
// ADMIN COMMANDS //
////////////////////
class CommandAdminParser {

    parse(message) {

        const content = message.content;

        let settings = jsonfile.readFileSync(settingsFile);
        const commands = jsonfile.readFileSync(adminCommands);
        let command;

            // Check if the command is known
            Object.keys(commands).forEach((com,index) => {
                const cPos = content.search(com);
                if (cPos == 1) {
                    command = com;
                    return;
                }
            });

            switch (command) {
                // Sets the prefix 
                case 'prefix':
                    const oldP = settings.prefix;
                    const prefix = content.slice(8, content.length);

                    if (prefix !== '@' && prefix !== '/') {
                        let settings = jsonfile.readFileSync(settingsFile);
                        settings.prefix = prefix;
            
                        jsonfile.writeFileSync(settingsFile, settings, err => {
                            if (err) {
                                console.log(err);
                            }
                        });
                        message.reply(`Command prefix has been successfully replaced to " ${ prefix } " Old prefix was: " ${ oldP } ".`);
                    } else {
                        message.reply(`" ${ prefix } " is not a valid prefix.`);
                    }

                    break;
                // How much time is allowed for the max commands settings. 
                // For ex if set to 1 sec, there can be maxCommands in 1 sec before being blocked
                // temporarily
                case 'commandtime': 
                    const commandTimeStr = content.slice(17, content.length);
                    const commandTime = Number(commandTimeStr);

                    if (commandTime && !Number.isNaN(commandTime)) {
                        settings.commandTime = commandTime;
                        jsonfile.writeFileSync(settingsFile, settings, err => {
                            if (err) {
                                console.log(err);
                            }
                        });
                        message.reply(`Command Time successfully set to: ${ commandTime }`);
                    } else {
                        message.reply(`" ${ commandTimeStr } " is not a correct argument.`);
                    }
                    break;
                // How many commands can be issued each commandTime
                case 'maxcommands':
                    const maxCommandsPerTimeStr = content.slice(17, content.length);
                    const maxCommandsPerTime = Number(maxCommandsPerTimeStr);

                    if (maxCommandsPerTime && !Number.isNaN(maxCommandsPerTime)) {
                        settings.maxCommandsPerTime = maxCommandsPerTime;
                        jsonfile.writeFileSync(settingsFile, settings, err => {
                            if (err) {
                                console.log(err);
                            }
                        });
                        message.reply(`Max Commands per time successfully set to: ${ maxCommandsPerTime }`);
                    } else {
                        message.reply(`" ${ maxCommandsPerTimeStr } " is not a correct argument.`);
                    }
                    
                    break;
                // How much time the bot stops parsing commands
                case 'blocktime':
                    const blockTimeStr = content.slice(15, content.length);
                    const blockTime = Number(blockTimeStr);

                    if (blockTime && !Number.isNaN(blockTime)) {
                        this.setBlockTime(blockTime);

                        settings.blockTime = blockTime;
                        jsonfile.writeFileSync(settingsFile, settings, err => {
                            if (err) {
                                console.log(err);
                            }
                        });
                        message.reply(`Block time successfully set to: ${ blockTime }`);
                    } else {
                        message.reply(`" ${ blockTimeStr } " is not a correct argument.`);
                    }

                    break;
                case 'reset':
                    const settingsDefault = jsonfile.readFileSync(settingsDefaultFile);
                    jsonfile.writeFileSync(settingsFile, settingsDefault, err => {
                        if (err) {
                            console.log(err);
                        }
                    });
                    message.reply(`Settings reset to default.`);
                    break;
            }
    }
}

module.exports = {
    CommandAdminParser: CommandAdminParser
}
