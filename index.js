const glob = require('glob');
const fs = require('fs');
const path = require('path');
const sc = require('lodash/snakeCase');
const cap = require('lodash/capitalize');
const times = require('lodash/times');
const argv = require('yargs').argv;

function convertToIr(fileGlob){
    const files = glob.sync(fileGlob || path.resolve(__dirname, "./codes/**/*.csv"));
    console.log(`converting ${files.length} files`);
    for (let index = 0; index < files.length; index++) {
        console.log("converting", files[index]);
        const filePath = path.resolve(__dirname, files[index]);
        const outputPath = getOutputLocation(filePath).replace(".csv", ".ir");
        fs.writeFileSync(outputPath, fileToIr(filePath));
    }
}

function getOutputLocation(filePath){
    if(argv.output){
        const relPath = path.relative(path.resolve(__dirname, "./codes"), filePath);
        let outputPath = path.resolve(__dirname, argv.output, relPath);
        if(argv.flat){
            outputPath = path.resolve(__dirname, argv.output, sc(relPath)).replace("_csv","") + path.extname(relPath);
        }
        if(!fs.existsSync(path.dirname(outputPath))){
            fs.mkdirSync(path.dirname(outputPath), {recursive: true});
        }
        return outputPath;
    }
    return filePath;
}

function numToHex(num){
    let _num = parseInt(num);
    let _hexNum = _num.toString(16);
    if(_hexNum.length < 2){
        _hexNum = "0" + _hexNum;
    }
    let _hexNumSplit = _hexNum.split(" ");
    const suffixZeros = 4 - _hexNumSplit.length;
    times(suffixZeros, () => _hexNumSplit.push("00"))

    return _hexNumSplit.join(" ");
}

function normalizeName(name){
    return name;
    let _name = name
        
    return cap(sc(_name))
}

function normalizeProtocol(protocol){
    const translationTable = {
        "NEC1": "NEC",
        "NECx1": "NEC",
    }

    return translationTable[protocol] || protocol;
}

function fileToIr(filePath){
    if(fs.existsSync(filePath)){
        const fileText = fs.readFileSync(filePath, 'utf8');
        const lines = fileText.split("\n");
        const irLines = [];
        const namesUsed = {};
        for (let ix = 1; ix < lines.length; ix++) {
            const line = lines[ix];
            const [name, protocol, device, subdevice, fn] = line.split(",");
            if(name !== "" && typeof protocol !== "undefined" && !Number.isNaN(parseInt(device))){
                const normalizedName = normalizeName(name);
                if(!namesUsed[normalizedName]){
                    const irLine = `#\nname: ${normalizedName}\ntype: parsed\nprotocol: ${normalizeProtocol(protocol)}\naddress: ${numToHex(device)}\ncommand: ${numToHex(fn)}\n`;
                    irLines.push(irLine);
                }
            }
        }
        return `Filetype: IR signals file\nVersion: 1\n${irLines.join("")}`;
    }
    return "";
}

if(argv.file){
    const filePath = path.resolve(__dirname, argv.file);
    fs.writeFileSync(fileToIr(filePath), filePath.replace(".csv", ".ir"));
} else if(argv.glob){
    convertToIr(argv.glob);
} else {
    convertToIr();
}
