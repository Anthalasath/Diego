'use strict';

// TODO
// Add graph feature
// Add api calls every X minutes to check prices

const Discord = require('discord.js');
const bot = new Discord.Client();

const CoinMarketCap = require("node-coinmarketcap");
const market = new CoinMarketCap();

const request = require('request');
const getJSON = require('get-json');

const AdminCommand = require('./js/admin-commands');
const adminCommand = new AdminCommand.CommandAdminParser();

const Command = require('./js/commands');
const command = new Command.CommandParser();

const jsonfile = require('jsonfile');
const settingsFile = './config/settings.json';

// Use this to hardcode your token (NOT RECOMMENDED):
// const token = 'Your token here';

// Use this for Heroku:
// const token = process.env.TOKEN;

// Use this if you're using a custom JSON file to store your token:
const token = jsonfile.readFileSync('./config/token.json').token; 

bot.on('disconnect', () => {
    bot.login(token);
});

bot.on('message', message => {
    let admin;
    if (message.guild) {
        admin = message.guild.roles.find('name', 'Admin').id;
    }
    if (admin) {
        if (message.member.roles.has(admin)) {
            adminCommand.parse(message);
        }
    }
    
    command.parse(message);
    
});

bot.login(token);
