'use strict';

const userPrefs = './data/users-prefs.json';
const jsonfile = require('jsonfile');

function PreferencesManager() {

    // update timezone in userprefs
    this.updateTimezone = function(user, timezone) {
        let prefs = jsonfile.readFileSync(userPrefs);
        let userID = user.id;
        let isUserAlreadyInPrefs = false;
        
        if (!timezone) {
            user.send('Missing timezone parameter');
            return;
        }

        for (let i = 0; i < prefs.length; i++) {
            if (prefs[i].userID === userID) {
                prefs[i].timezone = timezone;
                isUserAlreadyInPrefs = true;
            }
        }

        if (!isUserAlreadyInPrefs) {
            let userPref = {'userID':user.id, 'timezone':timezone};
            prefs.push(userPref);
        }

        jsonfile.writeFileSync(userPrefs, prefs, err => {
            if (err) { console.log(err); }
        });

        user.send(`Your preferences have been updated. Your timezone is now ${ timezone }`);
    }

    this.getPrefsFile = function(user) {
        user.send('Here\'s my prefs file:', {
            files: [userPrefs]
        });
    }
}

module.exports = PreferencesManager;