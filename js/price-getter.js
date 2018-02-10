const request = require('request');
const Coinmarketcap = require('node-coinmarketcap');
const market = new Coinmarketcap();

            
function priceGetter() {
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
}

module.exports = priceGetter;