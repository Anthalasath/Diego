'use strict';

const CoinMarketCap = require("node-coinmarketcap");
const market = new CoinMarketCap();

const request = require('request');

const jsonfile = require('jsonfile');
const settingsFile = './config/settings.json';

const getJSON = require('get-json');

class CommandParser {

    constructor() {
        this.commandsThisTime = 0;
        this.canParseCommands = true;
        this.usersNotifiedOfBlockedCommands = [];
    }
    ///////////////////
    // LIMIT METHODS //
    ///////////////////
    startTimer() {
        const settings = jsonfile.readFileSync(settingsFile);
        setTimeout(() => {
            this.commandsThisTime = 0;
        }, settings.commandTime);
    }

    blockCommands() {
        const settings = jsonfile.readFileSync(settingsFile);

        this.canParseCommands = false;
        setTimeout(() => {
            this.canParseCommands = true;
            this.usersNotifiedOfBlockedCommands = [];
        }, settings.blockTime);
    }

    regulateCommand() {
        const settings = jsonfile.readFileSync(settingsFile);

        this.commandsThisTime++;
        if (this.commandsThisTime === 1) {
            this.startTimer();
        } else if (this.commandsThisTime === settings.maxCommandsPerTime) {
            this.blockCommands();
        }
    }

    //////////////////
    // MISC METHODS //
    //////////////////

    // At what price will the specified amount be worth a million dollars
    calculateMillion(amount) {
    
        let price;
    
        if (amount >= 1000000) {
            price = -1;
        } else {
            price = 1000000 / amount;
        }
    
        return price;
    }
    
    parse(message) {

        // Only execute commands if the limits where not breached
        if (!this.canParseCommands) {

            const user = message.author.username;
            const isUserInList = this.usersNotifiedOfBlockedCommands.find(usr => {
                return usr === user;
            });

            if (!isUserInList) {
                message.reply('Commands are temporarily blocked and will be available again in a few seconds.');
                this.usersNotifiedOfBlockedCommands.push(user);
            }

            return; 
        }
        
        const content = message.content;
        let settings = jsonfile.readFileSync(settingsFile);
        
        /////////////////////////////
        // COMMANDS WITH ARGUMENTS //
        /////////////////////////////
        if (content.slice(0, 8) === `${ settings.prefix }million`) {

            const coin = content.slice(9, 13);
            let amountOfPrps = content.slice(14, content.length);
        
            if (coin.toLowerCase() !== 'prps' && coin.toLowerCase() !== 'dubi') {
                message.reply('I\'m sorry, please use PRPS or DUBI.');
        
                this.regulateCommand();
                return;
            }
        
            amountOfPrps.replace(' ', '');
            amountOfPrps = Number(amountOfPrps);
        
            if (amountOfPrps && !Number.isNaN(amountOfPrps)) {
                const price = this.calculateMillion(amountOfPrps);
                
                if (price > 1) {
                    message.reply(`That amount of ${ coin.toUpperCase() } will become a million $ when the price hits ${ price } $`);
                    this.regulateCommand();
        
                } else {
                    message.reply(`That amount of ${ coin.toUpperCase() } will become more than a million $ when the price hits 1 $`);
                    this.regulateCommand();
                }
                
            } else {
                message.reply(`Please type ${ settings.prefix }million [coin] [amount]`);
                this.regulateCommand();
                
            }
        }
        
        
        ///////////////////////
        // STANDARD COMMANDS //
        ///////////////////////

        switch (content) {
            
            case `${ settings.prefix }purpose price`:
            case `${ settings.prefix }purpose`:
            case `${ settings.prefix }prps price`:
            case `${ settings.prefix }prps`:

                /* I'm taking information from the actual Purpose page on Coinmarketcap
                because the api call using node-coinmarketcap seems to not work for some reason */
                request('https://coinmarketcap.com/currencies/purpose/', (err, res, body) => {
                    if (err) {
                        console.log(err);
                    } else {
                        let pos =  body.search('data-usd') + 10;
                        let prpsUSD = `${ body.slice(pos, pos + 6) }`;
                        market.get('ethereum', coin => {
                            let ethUSD = coin.price_usd;
                            let prpsETH = prpsUSD / ethUSD;
                            message.reply(`Current PRPS price: ${ prpsUSD } $ (${ prpsETH } ETH)`);
                        });
                    }
                });

                this.regulateCommand();
                break;
        
            case `${ settings.prefix }decentralized universal basic income price`:
            case `${ settings.prefix }decentralized universal basic income`:
            case `${ settings.prefix }dubi price`:
            case `${ settings.prefix }dubi`:

                market.get('decentralized-universal-basic-income', coin => {
                    let dubiUSD = coin.price_usd;
                    market.get('ethereum', coin => {
                        let ethUSD = coin.price_usd;
                        let dubiETH = dubiUSD / ethUSD;
                        message.reply(`Current DUBI price: ${ dubiUSD } $ (${ dubiETH } ETH)`);
                    });
                });

                this.regulateCommand();
                break;
        
            case `${ settings.prefix }ethereum`:
            case `${ settings.prefix }ethereum price`:
            case `${ settings.prefix }eth`:

                let ethUSD = 'ERROR';
                market.get('ethereum', coin => {
                    ethUSD = coin.price_usd;
                    message.reply(`Current Ethereum price: ${ ethUSD } $`);
                });

                this.regulateCommand();
                break;
            case `${ settings.prefix }get`:
            case `${ settings.prefix }buy`:
                message.reply('You can buy PRPS & DUBI on DUBIEX (no fees): https://dubiex.com/');
                this.regulateCommand();
                break;

            case `${ settings.prefix }token contract address`:
            case `${ settings.prefix }token contract`:
            case `${ settings.prefix }contract`:
            case `${ settings.prefix }token address`:
            case `${ settings.prefix }address`:
            case `${ settings.prefix }verification`:
            case `${ settings.prefix }verif`:
                message.reply('PRPS contract address: 0x7641b2Ca9DDD58adDf6e3381c1F994Aac5f1A32f \n DUBI contract address: 0xd4cffeef10f60eca581b5e1146b5aca4194a4c3b');
                this.regulateCommand();
                break;
            case `${ settings.prefix }website`:
            case `${ settings.prefix }site`:
                message.reply('PRPS website: https://www.prps.io/');
                this.regulateCommand();
                break;
        
            case `${ settings.prefix }support`:
                message.reply('Mail support: support@gamingforgood.net');
                this.regulateCommand();
                break;

            case `${ settings.prefix }faq`:
                message.reply('Check the PRPS FAQ here: https://goo.gl/4NqwRq');
                this.regulateCommand();
                break;

            case `${ settings.prefix }reddit`:
                message.reply('PRPS subreddit: https://www.reddit.com/r/PRPS/');
                this.regulateCommand();
                break;
        
            case `${ settings.prefix }whitepaper`:
            case `${ settings.prefix }info`:
                message.reply('PRPS whitepaper: https://www.prps.io/Purpose.pdf');
                this.regulateCommand();
                break;
        
            case `${ settings.prefix }code`:
            case `${ settings.prefix }github`:
                message.reply('PRPS code: https://github.com/nionis/purpose');
                this.regulateCommand();
                break;

            case `${ settings.prefix }scan`:
            message.reply('You can track transactions here: \n PRPS: https://etherscan.io/token/0x7641b2ca9ddd58addf6e3381c1f994aac5f1a32f \n DUBI: https://etherscan.io/token/0x7641b2ca9ddd58addf6e3381c1f994aac5f1a32f')
                this.regulateCommand();
                break;

            case `${ settings.prefix }athenelive`:
            case `${ settings.prefix }athene`:
            case `${ settings.prefix }stream`:
            case `${ settings.prefix }live`:
                const url = 'https://wind-bow.glitch.me/twitch-api/streams/athenelive';
        
                getJSON(url, (err, res) => {
                    if (err) {
                        console.log(err);
                    } else {
                        if (res.stream) {
                            const link = res.stream.channel.url;
                            message.reply(`Athene is LIVE: ${link}`);
                        } else {
                            message.reply('Athene is not streaming.');
                        }
                    }
                });
                this.regulateCommand();
                break;
                
            case `${ settings.prefix }help`:
                let admin = message.guild.roles.find('name', 'Admin').id;
                let helper = `Here's a list of the commands available to you: \n \n`;

                if (message.member.roles.has(admin)) {
                    helper += 'Admin commands: \n \n'
                    // add each admin command
                    let adminCommands = jsonfile.readFileSync('./config/admin-commands.json');
                    Object.keys(adminCommands).forEach((com,index) => {
                        // key: the name of the object key
                        // index: the ordinal position of the key within the object 
                        helper += `${ settings.prefix }${ com }: ${ adminCommands[com] }\n`;
                    });

                    helper += '\n ========================================================= \n \n';
                }

                helper += 'Commands: \n \n';

                let commands = jsonfile.readFileSync('./config/commands.json');

                Object.keys(commands).forEach((com,index) => {
                    // key: the name of the object key
                    // index: the ordinal position of the key within the object 
                    helper += `${ settings.prefix }${ com }: ${ commands[com] }\n`;
                });
                message.reply('Sliding into your DMs...');
                message.author.send('```\n' + helper + '\n```');
                this.regulateCommand();
                break;
        }
    }
}

module.exports = {
    CommandParser: CommandParser
}
