var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');
var process = require('process')
var fs = require('fs')

function showUsage() {
    console.log(
        'Usage:  ' + process.argv[1].split('/').pop() + " <Config file>\n" +
        '\n' +
        'Config file should be a JSON file w/ all values filled in.  Here are the defaults:\n' +
        '\n' +
        '{\n' +
        '  "sheetID": null,\n' +
        '  "folder": "lang/",\n' +
        '  "header": "export default ",\n' +
        '  "hashName": "messages"\n' +
        '}\n'
    )
    process.exit();
}

if (process.argv.length < 3) {
    showUsage();
}

const configFilePath = process.argv[2];

console.log('Config: ' + configFilePath);
const config = JSON.parse(fs.readFileSync(configFilePath, "utf8"));

if (!config.sheetID) {
    showUsage();
}


// spreadsheet key is the long id in the sheets URL
var doc = new GoogleSpreadsheet(config.sheetID);

var sheet;
var sheetRows;

Array.prototype.removeItems = function(array2) {
    var array1 = this;
    return array1.filter(value => -1 === array2.indexOf(value));
}

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

let locales = [];
let translations = {};
let appFolder = config.folder;


async.series([
    function getInfoAndWorksheets(step) {
        doc.getInfo(function(err, info) {
            if (err) {
                console.log(err);
                process.exit();
            }
            console.log('Loaded doc: '+info.title+' by '+info.author.email);
            sheet = info.worksheets[0];
            console.log('sheet 1: '+sheet.title+' '+sheet.rowCount+'x'+sheet.colCount);
            step();
        })
    },
    function getRows(step) {
        // google provides some query options
        sheet.getRows({
            offset: 1
        }, function( err, rows ){
            console.log('Read '+rows.length+' rows');

            sheetRows = rows
            step();
        });
    },
    function surmiseLocales(step) {
        locales = Object.keys(sheetRows[0]).removeItems(['id', 'key', 'save', 'del', '_links', '_xml']);
        locales.forEach(locale => translations[locale] = {});

        step();
    },
    function loadExistingFiles(step) {

        locales.forEach(locale => {
            const localeFilePath = appFolder + locale + '.js';

            console.log('Reading ' + localeFilePath);
            var script = fs.readFileSync(localeFilePath, "utf8");
            script = script.replaceAll(config.header, '')
            translations[locale] = JSON.parse(script)[config.hashName];
        });

        step();
    },
    function parseRows(step) {
        sheetRows.forEach(row => {
            locales.forEach(locale => {
                if (row[locale].length === 0) {
                    // Keep existing translation

                    if (!translations[locale][row.key] || translations[locale][row.key].length == 0) {
                        // If no existing translation use English
                        translations[locale][row.key] = row['en'];
                    }

                    return;
                }

                translations[locale][row.key] = row[locale];
            });
        });

        step();
    },
    function outputFiles(step) {

        // Create localization files in each input file's output folder
        for (let k = 0; k < locales.length; k++) {
            const locale = locales[k];
            const localeFilePath = appFolder + locale + '.js';

            console.log('Writing ' + localeFilePath);

            // contents should first begin export default
            let fileContents = config.header + '{\n  "' + config.hashName + '": ';

            // stringify JSON contents
            let translationsJson = JSON.stringify(translations[locale], Object.keys(translations[locale]).sort(), 2);

            // Apply proper to each translation line
            translationsJson = translationsJson.replaceAll("  ", "    ");

            // Apply proper padding to closing line
            translationsJson = translationsJson.replace('}', "  }");

            // Add formatted file contents to file contents
            fileContents += translationsJson;

            // end export default
            fileContents += "\n}\n";

            // Write the contents to the file
            fs.writeFileSync(localeFilePath, fileContents)
        }

            step();
    }
], function(err){
    if( err ) {
        console.log(err);
    }
});
