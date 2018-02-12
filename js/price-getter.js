'use strict';

const request = require('request');
const Coinmarketcap = require('node-coinmarketcap');
const market = new Coinmarketcap();
const moment = require('moment-timezone');
const jsonfile = require('jsonfile');
const userPrefs = './data/users-prefs.json';
            
function PriceGetter() {
    // Gets the price on cmc because prps is considered inactive and thus the api doesn't support it
    this.getPurpose = function(message) {
        request('https://coinmarketcap.com/currencies/purpose/', (err, res, body) => {
            if (err) {
                console.log(err);
            } else {
                let pos =  body.search('data-usd') + 10;
                let prpsUSD = `${ body.slice(pos, pos + 6) }`;
                market.get('ethereum', coin => {
                    let ethUSD = coin.price_usd;
                    let prpsETH = prpsUSD / ethUSD;
                    message.author.send(`Current PRPS price: ${ prpsUSD } $ (${ prpsETH } ETH)`);
                });
            }
        });
    }

    this.getDUBI = function(message) {
        market.get('decentralized-universal-basic-income', coin => {
            let dubiUSD = coin.price_usd;
            market.get('ethereum', coin => {
                let ethUSD = coin.price_usd;
                let dubiETH = dubiUSD / ethUSD;
                message.author.send(`Current DUBI price: ${ dubiUSD } $ (${ dubiETH } ETH)`);
            });
        });
    }

    this.convertEthToUSD = function(user, amount) {
        let ethUSD = 'ERROR';
        let converted = 0;
        amount = amount || 0;
        amount = Number(amount);

        if (!Number.isNaN(amount)) {
            let prefs = jsonfile.readFileSync(userPrefs);
            let timezone;

            for (let i = 0; i < prefs.length; i++) {
                if (prefs[i].userID === user.id) {
                    timezone = prefs[i].timezone;
                }
            }

            amount = amount < 0 ? -amount : amount;
            market.get('ethereum', coin => {
                let requestDate = moment.tz(new Date(), timezone);

                ethUSD = coin.price_usd;    
                converted = amount * ethUSD;
                user.send(`${ amount } Ether is now worth: ${ converted } $. You requested this the ${ requestDate }. \n If you wish to change your timezone, use !prefs timezone=[your timezone]. Make sure that you input a correct timezone, otherwise nothing will change.`);
            });
        } else {
            user.send('Invalid amount parameter. Make sure the amount you entered is a number.');
        }
        
    }
}

module.exports = PriceGetter;