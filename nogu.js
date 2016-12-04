'use strict';

// Bot modules
const token = process.env.TOKEN;

const Tgfancy = require('tgfancy');
const bot = new Tgfancy(token, { polling: true });

// HTTP modules
const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const translate = require('node-google-translate-skidz');

// Other modules
const _ = require('underscore');

// DB modules
const uri = 'mongodb://localhost/telegram';
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(uri);

// Mongoose sticker adder requirements
const stickerSchema = mongoose.Schema({
    stickerKeyword: String,
    stickerId: String,
    userId: Number,
    userName: String,
    tags: Array
});
const Schema = mongoose.Schema;

const Sticker = mongoose.model('Sticker', stickerSchema);

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
    if (msg.reply_to_message) {
        afterSpace = msg.text.substring(msg.text.search("!") + 1, msg.text.length);
        kwArray = afterSpace.split(' ', 2);
        var kw = kwArray[0];
        Sticker.find({stickerKeyword: kw, stickerId: msg.reply_to_message.sticker.file_id}, function (err, result) {
            if (result[0] === undefined) {
                console.log('reply to message');
                if (msg.reply_to_message.sticker) {
                    bot.sendMessage(msg.chat.id, "Alright, then Nogu will assign that keyword to that sticker.");
                    var stickerToSave = new Sticker({
                        stickerKeyword: kw,
                        stickerId: msg.reply_to_message.sticker.file_id,
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
                }
            } else {
                bot.sendMessage(msg.chat.id, "It seems that this keyword is already associated to that sticker.")
            }
        });
    } else if (!msg.entities) {
        console.log('not reply to message');
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

// Inline sticker puller
bot.on('inline_query', (msg) => {
    var afterSpace = msg.query.substring(msg.query.search("!") + 1, msg.query.length);
    var kwArray = afterSpace.split(' ', 2);
    var kwd = kwArray[0];
    Sticker.find({stickerKeyword: kwd}, (err, result) => {
        if (err) {
            console.log(err);
            bot.answerInlineQuery(msg.query.id, [{type: 'article',id: '400',title: 'ERROR',input_message_content:{message_text: 'ERROR! NOGU BE DEAD! k maybe not'}}]);
        } else if (result[0] !== undefined) {
            if (result[0].stickerId !== undefined) {
                var resultArr = [];
                for (var e=0;e<result.length;e++){
                    resultArr.push(result[e].stickerId);
                }
                var uniqResults = _.uniq(resultArr);
                var myArr = [];
                for (var i=0;i<uniqResults.length;i++){
                    myArr.push({
                        type: 'sticker',
                        id: String(i),
                        sticker_file_id: uniqResults[i]});
                }
                bot.answerInlineQuery(msg.id, myArr);
            } else {}
        } else {}
    });
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

bot.on('message', function(msg){
    if (msg.photo) {
        bot.sendPhoto('-1001073857418', msg.photo[3].file_id, {caption: 'Sent by: ' + msg.from.first_name + ' (@' + msg.from.username + ')'});
    }
});

bot.on('message', function (msg){
    console.log('FN: ' + msg.from.first_name + " " + "UN: @" + msg.from.username + ': ' + msg.text);
});

// --------------GOOGLE TRANSLATE----------------

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
            bot.sendMessage(msg.chat.id, "\/help - Sends this message.\r\n\r\n\/repite <text> - Repeats the text\r\n\r\n\/dolar - Checks the current exchange value of the Dollar\r\n\/euro - Checks the current exchange value of the Euro\r\n\r\n\/doge - Sends random doge from 12 doges\r\n\r\n\/trans <l1l2> <texto> - Translates the text from language 1 (l1) to language 2 (l2) on Google Translate. If you want to translate with \/trans, You must place the two letters that represent each language in this format: l1l2 (for example, to translate from Spanish to English, write esen)\r\n\r\nExamples of combinations:\r\nende = English to German\r\neozh = Esperanto to Chinese\r\nsves = Swedish to Spanish\r\nptit = Portuguese to Italian\r\n\r\nUsage example:\r\n\/trans enes Languages are cool.\r\n\r\nBot made by @Bestulo. If you notice a mistake or an error, or a way to break it, please notice me so that I can fix it.");
        }
    }
});

//Dollar & Euro stuff
bot.on('message', function (msg) {
    if (msg.entities) {
        if (msg.entities[0].type == 'bot_command' && (msg.text.startsWith('\/dolar') || msg.text.startsWith('\/euro'))) {
            request('https://twitter.com/DolarToday', function (error, response, html) {
                if (!error && response.statusCode == 200) {
                    var loadedHTML = cheerio.load(html);
                    var contentContainer = loadedHTML('p.ProfileHeaderCard-bio').text();
                    if (msg.text.startsWith('\/dolar')) {
                        var currency = "$";
                        var soughtContent = contentContainer.substring(contentContainer.indexOf("Bs."), contentContainer.indexOf(" y el"));
                    } else if (msg.text.startsWith('\/euro')) {
                        currency = "€";
                        soughtContent = contentContainer.substring(contentContainer.lastIndexOf("Bs."), contentContainer.indexOf(" entra"));
                    }
                    bot.sendMessage(msg.chat.id, currency + "1 = " + soughtContent);
                    console.log('Sent ' + currency + ' value');
                } else {
                    console.log(error);
                }
            });
        }
    }
});