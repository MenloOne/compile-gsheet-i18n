var fs = require('fs');
var LineReader = require('readline')

const dirName = 'input';

const delimiter = '\t';

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

// Get a list of all of the files.
fs.readdir(dirName, function (err, items) {
    console.log('File List:', items);

    // Loop through all files.
    for (var i = 0; i < items.length; i++) {

        let currentLine = 0;
        const fileName = items[i];

        var file = dirName + '/' + fileName;

        // Collect stats on each file
        const lineReader = LineReader.createInterface({
            input: fs.createReadStream(file)
        });

        let locales = [];
        let translations = {};

        lineReader.on('line', function (line) {

            // Get list of translation keys from the first row
            if (currentLine === 0) {
                // First, remove the "key" column from the translation list
                locales = line.split(delimiter);
                const keyColumn = locales.indexOf('key')
                locales.splice(keyColumn, 1);

                // Populate the translations object with empty objects for each locale.
                for (let i = 0; i < locales.length; i++) {
                    const locale = locales[i];
                    translations[locale] = {};
                }
            } else {
                // Process all other rows and add their contects to the proper translation object.
                line = line.split(delimiter);
                const key = line[0];
                
                for (let j = 0; j < line.length; j++) {
                    if(j !== 0) {
                        const item = line[j];
                        const itemIndex = j;
                        translations[locales[j - 1]][key] = item;
                    }
                }
            }
            
            // Add the translations to the proper translation object.


            currentLine++;
        });

        lineReader.on('close', () => {
            // Create Output Folder for each input file.
            const filenameParts = fileName.split('.')
            filenameParts.pop() // This automatically ignores files that start with ".", WOOHOO :)
            const fileOutputDir = 'output/' + filenameParts.join('.');
            
            if (!fs.existsSync(fileOutputDir)) {
                fs.mkdirSync(fileOutputDir);
            }
            // Create localization files in each input file's output folder
            for (let k = 0; k < locales.length; k++) {
                const locale = locales[k];
                const localeFilePath = fileOutputDir + '/' + locale + '.js';
                
                // contents should first begin export default
                let fileContents = 'export default {\n\tmessages: ';

                // stringify JSON contents
                let translationsJson = JSON.stringify(translations[locale], null, 2);

                // Apply proper to each translation line
                translationsJson = translationsJson.replaceAll("  ", "    ") 

                // Apply proper padding to closing line
                translationsJson = translationsJson.replace('}', "  }")
                
                // Add formatted file contents to file contents
                fileContents += translationsJson;

                // end export default
                fileContents += "\n}"

                // Write the contents to the file
                fs.writeFileSync(localeFilePath, fileContents)
            }
        })
    }
});