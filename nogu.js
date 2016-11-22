'use strict';

// Bot modules
var token = process.env.TOKEN;
var Tgfancy = require('tgfancy');
const bot = new Tgfancy(token, { polling: true });

// HTTP modules
var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var translate = require('node-google-translate-skidz');

// DB modules
var uri = 'mongodb://localhost/telegram';
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(uri);

// Mongoose sticker adder requirements
var stickerSchema = mongoose.Schema({
    stickerKeyword: String,
    stickerId: String,
    userId: Number,
    userName: String
});
var Schema = mongoose.Schema;

var Sticker = mongoose.model('Sticker', stickerSchema);

// Sticker adder on query
bot.on('message', function (msg) {
    if (msg.entities) {
        if (msg.entities[0].type == 'bot_command' && msg.text.startsWith('\/addsticker')) {
            var command = msg.text.substring(msg.text.search("\/"), msg.text.search(" "));
            var keyword = msg.text.substring(command.length + 1, msg.text.length);
            var afterSpace = msg.text.substring(msg.text.search("!") + 1, msg.text.length);
            var kwArray = afterSpace.split(' ', 2);
            var kw = [];
            var stickerer = [];
            kw.push(kwArray[0]);
            if (keyword.length <= 50 && keyword.substring(0, 1) == '!') {
                if (!stickerer.includes(msg.from.id)) {
                    stickerer.push(msg.from.id);
                    Sticker.find({stickerKeyword: kw[0], userId: msg.from.id}, function (err, result) {
                        if (result[0] === undefined) {
                            bot.sendMessage(msg.chat.id, 'Now send Nogu the sticker you want Nogu  to add that keyword to.');
                            bot.on('message', (msg) => {
                                if (msg.sticker && stickerer.includes(msg.from.id)) {
                                    stickerer.splice(stickerer.indexOf(msg.from.id), 1);
                                    kw.splice(1, 1);
                                    bot.sendMessage(msg.chat.id, "Alright, then Nogu will assign that keyword to that sticker.");
                                    var stickerToSave = new Sticker({
                                        stickerKeyword: kw[0],
                                        stickerId: msg.sticker.file_id,
                                        userId: msg.from.id,
                                        userName: msg.from.username
                                    });
                                    stickerToSave.save(function (err) {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            console.log('adding success');
                                        }
                                    });
                                } else if (stickerer.includes(msg.from.id)){
                                    stickerer.splice(stickerer.indexOf(msg.from.id), 1);
                                    kw.splice(1, 1);
                                    bot.sendMessage(msg.chat.id, "That's not a sticker! You'll have to send Nogu a keyword again if you want to retry.")
                                }
                            });
                        } else {
                            bot.sendMessage(msg.chat.id, 'That keyword already exists.');
                            kw.splice(kw.indexOf(msg.text.substring(msg.text.search("!") + 1)), 1);
                            stickerer.splice(stickerer.indexOf(msg.from.id), 1);
                        }
                    });
                }
            } else {
                kw.splice(kw.indexOf(msg.text.substring(msg.text.search("!") + 1)), 1);
                bot.sendMessage(msg.chat.id, 'That keyword is too long or does not start with an exclamation sign (!).')
            }
        }
    }
});

// Sticker puller
bot.onText(/(^|\s)(!.+)/, function (msg) {
    if (!msg.entities) {
        var afterSpace = msg.text.substring(msg.text.search("!") + 1, msg.text.length);
        var kwArray = afterSpace.split(' ', 2);
        var kwd = kwArray[0];
        console.log("kwd is '" + kwd + "'");
        Sticker.find({stickerKeyword: kwd, userId: msg.from.id}, (err, result) => {
            if (err) {
                console.log(err);
                bot.sendMessage(msg.chat.id, 'ERROR! NOGU BE DEAD! OR maybe not')
            } else if (result[0] !== undefined) {
                if (result[0].stickerId !== undefined) {
                    bot.sendSticker(msg.chat.id, result[0].stickerId)
                } else {
                    bot.sendMessage(msg.chat.id, 'Nogu cannot find that sticker in your collection.')
                }
            } else {
                bot.sendMessage(msg.chat.id, 'Nogu cannot find that sticker in your collection.')
            }
        });
    }
});

// Delete sticker

bot.on('message', function (msg) {
    if (msg.entities) {
        if (msg.entities[0].type == 'bot_command' && msg.text.startsWith('\/delsticker')) {
            var command = msg.text.substring(msg.text.search("\/"), msg.text.search(" "));
            var keyword = msg.text.substring(command.length + 1, msg.text.length);
            var kw = [];
            if (keyword.length <= 50 && keyword.substring(0, 1) == '!') {
                kw.push(msg.text.substring(msg.text.search("!") + 1));
                Sticker.find({stickerKeyword: kw[0], userId: msg.from.id}).remove().exec();
                bot.sendMessage(msg.chat.id, 'If that keyword was in your personal collection, Nogu deleted it.')
            }
        }
    }
});

// List own stickers
bot.on('message', function (msg) {
    if (msg.entities) {
        if (msg.entities[0].type == 'bot_command' && msg.text.startsWith('\/mystickers')) {
            Sticker.find({userId: msg.from.id}, function (err, result) {
                var text ="";
                var i;
                for (i = 0; i<result.length; i++) {
                    text += "*!*" + result[i].stickerKeyword + " ";
                }
                bot.sendMessage(msg.chat.id, 'The keywords in your collection are:\n' + text, {parse_mode: 'markdown'})
            });
        }
    }
});

//Sonnet Schema requirements
var sonnetSchema = new Schema({
    sonnetId: Number,
    sonnet: String
});

var Sonnet = mongoose.model('Sonnet', sonnetSchema);

//Sonnet puller
bot.on('message', function (msg) {
    if (msg.entities) {
        if (msg.entities[0].type == 'bot_command' && msg.text.startsWith('\/sonnet')) {
            console.log('Action log: Sent a sonnet');
            var text = msg.text.substring(msg.entities[0].length + 1);
            Sonnet.find({sonnetId: text}, (err, result) => {
                if (err) {
                    console.log(err);
                    bot.sendMessage(msg.chat.id, 'ERROR! NOGU BE DEAD! or maybe not')
                } else if (result[0] !== undefined) {
                    if (result[0].sonnetId !== undefined) {
                        bot.sendMessage(msg.chat.id, result[0].sonnet)
                    } else {
                        bot.sendMessage(msg.chat.id, 'Nogu cannot find that sonnet.')
                    }
                } else {
                    bot.sendMessage(msg.chat.id, 'Nogu cannot find that sonnet.')
                }
            });
        }
    }
});

bot.on('message', function (msg) {
    if (msg.entities) {
        if (msg.entities[0].type == 'bot_command' && msg.text.startsWith('\/dq1')) {
            console.log('Action log: Sent a message');
            var text = msg.text.substring(msg.entities[0].length + 1);
            bot.sendMessage('-1001055742276', text, {parse_mode: 'markdown'});
        }
    }
});

bot.onText(/\/qlq/, function (msg) {
    var chatId = msg.chat.id;
    var photo = 'AgADAQAD3qcxGxrvBBB-awk0sDD9Xe6a5y8ABI9yasUBQPX8AAHxAQABAg';
    return bot.sendPhoto(chatId, photo, { caption: 'qlq menol' });
});

bot.onText(/\/pajuo/, function (msg) {
    var chatId = msg.chat.id;
    var photo = 'AgADAQADK74xG8WGLA4Qaex4hp-Lt-OR5y8ABKd4zcJq3RFSjuwBAAEC';
    bot.sendPhoto(chatId, photo, { caption: 'qlq menol' });
});

bot.on('message', function (msg) {
    if (msg.entities) {
        if (msg.entities[0].type == 'bot_command' && (msg.text == '\/doge' || msg.text.startsWith('\/doge@'))) {
            var cualDoge = [
                'BQADAQADmwIAAmczbQpYL0n24ELb8wI',
                'BQADBAADiwEAAljp-gOQagmTpQABMr8C',
                'BQADAgADTwADNraOCO6Evpsh_B78Ag',
                'BQADBAADeQEAAljp-gMfLjGh0UcsqgI',
                'BQADBAADrwEAAljp-gOUGQERkzLDSAI',
                'BQADBAADpwEA Aljp-gMZqYA2TcCQigI',
                'BQADAgADKAADNraOCCqXlVqUKd4SAg',
                'BQADAgADHAADNraOCLBipsm-lf2XAg',
                'BQADAgADCgADNraOCEl_Jsv8JOo9Ag',
                'BQADBAADlQEAAljp-gNqbe1l60dGtAI',
                'BQADBAADmQEAAljp-gMzkzYmzu3eyAI',
                'BQADBAADfQEAAljp-gORGeHcXUkb-wI'
            ];
            var elDoge = cualDoge[Math.floor(Math.random() * 12)];
            bot.sendSticker(msg.chat.id, elDoge);
        }
    }
});

bot.on('message', function (msg) {
    if (msg.entities) {
        if (msg.entities[0].type == 'bot_command' && msg.text.startsWith('\/repite')) {
            console.log('Action log: Repeated a message');
            var text = msg.text.substring(msg.entities[0].length + 1);
            bot.sendMessage(msg.chat.id, text, {parse_mode: 'markdown'});
        }
    }
});

bot.on('message', function (msg){
    if (msg.sticker) {
        var sticker = msg.sticker.file_id;
        /* console.log(msg); */
        console.log(sticker);
        bot.sendSticker('-1001083222001', sticker);
    }
});

bot.on('message', function (msg){
    console.log('FN: ' + msg.from.first_name + " " + "UN: @" + msg.from.username + ': ' + msg.text);
});

/*------------------------  G O O G L E   T R A N S L A T E ----------------------*/

bot.on('message', function(msg) {
    if (msg.entities) {
        if (msg.entities[0].type == 'bot_command' && msg.text.startsWith('\/trans')) {
            var arg = msg.text.substring(msg.entities[0].length + 1);
            var langA = arg.substring(0, 2);
            var langB = arg.substring(2, 4);
            var text = arg.substring(msg.text.lastIndexOf(msg.entities[0].length) + 6);
            translate({
                text: text,
                source: langA,
                target: langB
            }, function(result) {
                var trans = result.sentences.map(function(resu) {
                    return resu.trans;
                }).join('');
                bot.sendMessage(msg.chat.id, 'Nogu: ' + trans);
            })
        }
    }
});

/*---------------------------- H E L P ------------------------------------------*/

bot.on('message', function (msg) {
    if (msg.entities) {
        if (msg.entities[0].type == 'bot_command' && (msg.text == '\/help' || msg.text.startsWith('\/help@'))) {
            bot.sendMessage(msg.chat.id, "\/help - Env\u00EDa este mensaje.\r\n\r\n\/repite <texto> - Repite el texto.\r\n\r\n\/dolar - Busca el valor actual del d\u00F3lar en el Twitter de DolarToday\r\n\r\n\/doge - Env\u00EDa un sticker de doge aleatorio entre 12\r\n\r\n\/trans <i1i2> <texto> - Traduce de i1 a i2 el texto en Google Translate\r\nPara traducir con \/trans debes colocar las dos letras que representan el primer idioma seguido de las letras que representan el segundo en este formato: i1i2 (por ejemplo, de espa\u00F1ol a ingl\u00E9s, esen)\r\n\r\nEjemplos de combinaciones:\r\nende = ingl\u00E9s a alem\u00E1n\r\neozh = esperanto a chino\r\nsves = sueco a espa\u00F1ol\r\nptit = portugu\u00E9s a italiano\r\n\r\nEjemplo de uso:\r\n\/trans enes Languages are cool.\r\n\r\nBot de @Bestulo. Si ves un error o una manera de romperlo, av\u00EDsame para corregirlo.");
        }
    }
});