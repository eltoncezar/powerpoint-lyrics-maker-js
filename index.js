#!/usr/bin/env node

var argv = require('yargs/yargs')(process.argv.slice(2))
    .usage('Usage: $0 <file> [options]')
    // .command('count', 'Count the lines in a file')
    .check((argv, options) => {
        const filePaths = argv._;
        if (filePaths.length > 1) {
            throw new Error("Only 1 file may be passed.")
        } else {
            return true // tell Yargs that the arguments passed the check
        }
    })
    .example('$0 example.txt', 'default params')
    .example('$0 example.txt -lines 2 -font Bebas -theme dogs', 'custom params')
    
    .alias('l', 'lines')
    .nargs('l', 1)
    .default('l', 2)
    .describe('l', 'Number of lines to render in each slide')
    
    .alias('o', 'opacity')
    .nargs('o', 1)
    .default('o', 30)
    .describe('o', 'Font background transparency, between 0 and 100')

    .alias('c', 'color')
    .nargs('c', 1)
    .default('c', 'FFFFFF')
    .describe('c', 'Font color, hexadecimal value')
    
    .alias('f', 'font')
    .nargs('f', 1)
    .default('f', 'Arial')
    .describe('f', 'Text font family')
    
    .alias('k', 'keywords')
    .nargs('k', 1)
    .default('k', ['landscape'])
    .describe('k', 'The Unsplash keywords that will be used to fetch the backgrounds (if you don\'t want backgrounds, use \'none\')')
    
    .alias('t', 'title')
    .nargs('t', 1)
    .default('t', '')
    .describe('t', 'The presentation title. If not informed, the first line of the txt file will be used.')

    // .demandOption(['f'])
    .help('h')
    .alias('h', 'help')
    .demandCommand(1)
    // .epilog('copyright 2019')
    .argv;

const PptxGenJS = require("pptxgenjs");
const request = require('request');
const pptx = new PptxGenJS();
const fs = require('fs');
const readline = require('readline');
var dir = './temp';

function main() {

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    pptx.setLayout('LAYOUT_16x9');

    const lineReader = readline.createInterface({
        input: fs.createReadStream(argv._[0])
    });

    let lines = [];

    lineReader.on('line', function (line) {
        // if (!line.trim()) return;
        lines.push(line.trim());
    });

    lineReader.on('close', function (line) {
        var slides = [];
        var completedSlides = 0;

        var i = 0;
        while (i < lines.length) {
            if (!lines[i]) i++;

            var increment = argv.l;
            var slideText = lines[i];
            if (i < lines.length - argv.l / 2) {
                for (let j = 1; j < argv.l; j++) {
                    if (!lines[i + j]) {
                        increment = j;
                        break;
                    }
                    slideText = slideText + '\n' + lines[i + j];
                }

                slides.push(slideText);
                if (i == 0) increment = 1;
            }

            i += increment;
        }

        for (var i = 0; i < slides.length; i++) {
            request('https://source.unsplash.com/featured/1600x900/?' + argv.k + '?sig' + i)
                .pipe(fs.createWriteStream(dir + '/img' + i + '.png'), {
                    flags: 'w'
                })
                .on('close', function () {
                    completedSlides++;
                    console.log("slide " + completedSlides);
                    if (completedSlides == slides.length) writeFile(slides);
                });
        }
    });
}

function addNewSlide(text, imagePath) {
    const slide = pptx.addNewSlide();

    if (argv.k != 'none') {
        slide.addImage({
            path: imagePath,
            w: '100%',
            h: '100%',
            x: 0,
            y: 0
        });
    }

    slide.addText(text, {
        fontFace: argv.f,
        fontSize: 28,
        bold: true,
        color: argv.c,
        shape: pptx.shapes.RECTANGLE,
        align: 'c',
        x: '0%',
        y: ((100 - (10 * argv.l)) / 2) + '%',
        w: '100%',
        h: 10 * argv.l + '%',
        fill: {
            type: 'solid',
            color: '333333',
            alpha: argv.o
        },
    });
}

function writeFile(slides) {
    var title = argv.t || slides[0];
    for (var i = 0; i < slides.length; i++) {
        addNewSlide(slides[i], dir + '/img' + i + '.png');
    }

    pptx.save(title);
    fs.rmSync(dir, {
        recursive: true,
        force: true
    });
    console.log('done');
}

main();