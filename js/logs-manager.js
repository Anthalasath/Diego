'use strict';

const fs = require('fs');
const logsFile = './data/logs.txt';

function LogsManager() {
    
    this.getLogs = function(user) {
        user.send('Here are my logs: ', {
            files: [
                logsFile
            ]
        });
    }
    
    
    this.clearLogs = function(user) {
        fs.writeFileSync(logsFile, '', err => {
            if (err) { console.log(err); }
        });
    }
    
    // // TODO can't update logs that easy
    // this.updateLogs = function(file) {
    //     let newLogs = fs.readFileSync(file);
    
    //     fs.writeFileSync(logsFile, newLogs, err => {
    //         console.log(err);
    //     });
    // }
}

module.exports = LogsManager;