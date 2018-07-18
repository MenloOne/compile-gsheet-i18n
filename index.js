var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');
var process = require('process')
var fs = require('fs')

// spreadsheet key is the long id in the sheets URL
var doc = new GoogleSpreadsheet('1XX4ioIjbwr9UUptq4-XToO8UKg1B1hPhStawiFaJ4Nw');
var sheet;

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
            offset: 1,
            limit: 100
        }, function( err, rows ){
            console.log('Read '+rows.length+' rows');

            locales = Object.keys(rows[0]).removeItems(['id','key', 'save', 'del', '_links', '_xml']);
            locales.forEach(locale => translations[locale] = {});

            rows.forEach(row => {
                locales.forEach(locale => translations[locale][row.key] = row[locale]);
            });

            step();
        });
    },
    function outputFiles(step) {

        const fileOutputDir = 'app/data/'

        // Create localization files in each input file's output folder
        for (let k = 0; k < locales.length; k++) {
            const locale = locales[k];
            const localeFilePath = fileOutputDir + locale + '.js';

            console.log('Writing ' + localeFilePath);

            // contents should first begin export default
            let fileContents = 'export default {\n  messages: ';

            // stringify JSON contents
            let translationsJson = JSON.stringify(translations[locale], null, 2);

            // Apply proper to each translation line
            translationsJson = translationsJson.replaceAll("  ", "    ")

            // Apply proper padding to closing line
            translationsJson = translationsJson.replace('}', "  }")

            // Add formatted file contents to file contents
            fileContents += translationsJson;

            // end export default
            fileContents += "\n}\n"

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
