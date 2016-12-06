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

// Mongoose requirements
const Schema = mongoose.Schema;

const stickerSchema = Schema({
    stickerKeyword: String,
    stickerId: String,
    userId: Number,
    userName: String,
    tags: Array
});
const Sticker = mongoose.model('Sticker', stickerSchema);

const sonnetSchema = Schema({
    sonnetId: Number,
    sonnet: String
});
const Sonnet = mongoose.model('Sonnet', sonnetSchema);

// Get tags when # then save
bot.onText(/#([^\s]+)/g, (msg) => {
    if (msg.reply_to_message && !msg.text.startsWith("\/")) {
        if (msg.reply_to_message.sticker) {
            var hashtags = msg.text.match(/#([^\s]+)/g);
            var tags = [];
            var nottags = [];
            hashtags.forEach(function (x) {
                if (x.substring(1).indexOf("#") === -1) {
                    tags.push(x.substring(1));
                } else if (x.substring(1).indexOf("#") !== -1) {
                    nottags.push(x.substring(1));
                }
            });
            tags = _.uniq(tags);
            tagSaver(msg, tags, nottags)
        }
    }
});

// Get tags on command then save
bot.onText(/^\/addtags(?=\s)|\/addtags@\w+/, (msg) => {
    if (msg.reply_to_message) {
        if (msg.entities) {
            if (msg.entities[0].type == 'bot_command') {
                var command = msg.text.substring(msg.text.search("\/"), msg.text.search(" "));
                var args = msg.text.substring(command.length + 1);
                var hashtags = args.match(/[^\s]+/g);
                var tags = [];
                var nottags = [];
                hashtags.forEach(function (x) {
                    if (x.startsWith("#")) {
                        if (x.substring(1).indexOf("#") === -1) {
                            tags.push(x.substring(1));
                        } else if (x.substring(1).indexOf("#") !== -1) {
                            nottags.push(x.substring(1));
                        }
                    } else if (x.indexOf("#") === -1) {
                        tags.push(x);
                    }
                });
                tags = _.uniq(tags);
                tagSaver(msg, tags, nottags)
            }
        }
    }
});

// Tag saver
var tagSaver = function(msg, tags, nottags) {
    Sticker.find({tags: {$in: tags}, stickerId: msg.reply_to_message.sticker.file_id}, function (err, result) {
        var text = '';
        if (err) {
            console.log(err);
        } else {
            if (result[0] !== undefined) {
                var duplicates = _.intersection(tags, result[0].tags);
                tags = _.difference(tags, result[0].tags);
                var dupes = duplicates.join(", ");
                var taggies = tags.join(", ");
                var noties = nottags.join(", ");
                if (tags.length !== 0) {
                    text += "I'm adding the following tags: " + taggies + "\nI found some duplicates: " + dupes;
                } else {
                    text = "All tags already associated with the sticker, no changes made.";
                }
                if (nottags.length !== 0) {
                    text += "\nInvalid tags were found and will not be added: " + noties;
                }
                bot.sendMessage(msg.chat.id, text);
            } else {
                if (tags.length !== 0) {
                    taggies = tags.join(", ");
                    text += "I'm adding the following tags: " + taggies;
                }
                if (nottags.length !== 0) {
                    noties = nottags.join(", ");
                    text += "\nInvalid tags were found and will not be added: " + noties;
                }
                bot.sendMessage(msg.chat.id, text);
            }
            if (tags.length !== 0) {
                Sticker.update({stickerId: msg.reply_to_message.sticker.file_id}, {$push: {tags: {$each: tags}}}, {
                    upsert: true,
                    new: true
                }, function (err, result) {
                    if (err) {
                        console.log(err);
                    }
                });
            }
        }
    });
};

// Get #tags inline and show
bot.on('inline_query', function (msg) {
    var hashtags = msg.query.split(' ');
    var tags = [];
    var nottags = [];
    hashtags.forEach(function (x) {
        if (x.startsWith("#")) {
            if (x.substring(1).indexOf("#") === -1) {
                tags.push(x.substring(1));
            } else if (x.substring(1).indexOf("#") !== -1) {
                nottags.push(x.substring(1));
            }
        } else if (x.indexOf("#") === -1) {
            tags.push(x);
        }
    });
    Sticker.find({tags: {$in: tags}}, function (err, result) {
        if (err) {
            console.log(err);
        } else {
            var stickerIds = [];
            var finalResults = [];
            for (var f = 0;f<result.length;f++){
                if (tags.length <= _.intersection(result[f].tags, tags).length) {
                    finalResults.push(result[f]);
                }
            }
            result = finalResults;
            for (var d = 0; d < result.length; d++) {
                stickerIds.push(result[d].stickerId);
            }
            if (err) {
                console.log(err);
                bot.answerInlineQuery(msg.query.id, [{
                    type: 'article',
                    id: '400',
                    title: 'ERROR',
                    input_message_content: {message_text: 'ERROR! NOGU BE DEAD! k maybe not'}
                }]);
            } else if (result[0] !== undefined) {
                if (result[0].stickerId !== undefined) {
                    var resultArr = [];
                    for (var e = 0; e < result.length; e++) {
                        resultArr.push(result[e].stickerId);
                    }
                    var uniqResults = _.uniq(resultArr);
                    var myArr = [];
                    for (var i = 0; i < uniqResults.length; i++) {
                        myArr.push({
                            type: 'sticker',
                            id: String(i),
                            sticker_file_id: uniqResults[i],
                            cache_time: 30
                        });
                    }
                    bot.answerInlineQuery(msg.id, myArr);
                }
            }
        }
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

// Google Translate
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

// Help
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

// Miscellaneous stuff

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
    if (msg.text !== undefined) {
        console.log('FN: ' + msg.from.first_name + " " + "UN: @" + msg.from.username + ': ' + msg.text);
    } else if (msg.sticker) {
        var sticker = msg.sticker.file_id;
        console.log('FN: ' + msg.from.first_name + " " + "UN: @" + msg.from.username + ' Sticker: ' + sticker);
        bot.sendSticker('-1001083222001', sticker);
    } else if (msg.photo || msg.document) {
        var text = '';
        if (msg.chat.title !== undefined) {
            text += 'Sent by: ' + msg.from.first_name + ' ( @' + msg.from.username + ' )' + '\nChat: ' + msg.chat.title + ' (' + msg.chat.id + ')';
        } else {
            text += 'Sent by: ' + msg.from.first_name + ' ( @' + msg.from.username + ' )' + '\nPrivate message: ' + msg.chat.first_name + ' (' + msg.chat.id + ')';
        }
        if (msg.caption) {
            text += '\nOriginal caption: ' + msg.caption;
            if (text.length > 200) {
                var text2 = text.substr(200);
            }
        }
        if (msg.photo) {
            console.log('FN: ' + msg.from.first_name + " " + "UN: @" + msg.from.username + ' sent a photo');
            if (!text2) {
                bot.sendPhoto('-1001073857418', msg.photo[0].file_id);
            } else {
                bot.sendPhoto('-1001073857418', msg.photo[0].file_id, {caption: text});
                bot.sendMessage('-1001073857418', text2);
            }
        } else if (msg.document) {
            console.log('FN: ' + msg.from.first_name + " " + "UN: @" + msg.from.username + ' sent a document');
            if (!text2) {
                bot.sendDocument('-1001073997991', msg.document.file_id, {caption: text});
            } else {
                bot.sendDocument('-1001073997991', msg.document.file_id, {caption: text});
                bot.sendMessage('-1001073997991', text2);
            }
            bot.sendDocument('-1001073997991', msg.document.file_id, {caption: text});
        }
    } else if (msg.entities) {
        if (msg.entities[0].type === "url") {
            console.log('FN: ' + msg.from.first_name + " " + "UN: @" + msg.from.username + ' sent a url');
            bot.forwardMessage('-1001095016888', msg.chat.id, msg.message_id);
        }
    } else if (msg.new_chat_participant) {
        if(msg.new_chat_participant.id == 229219920) {
            console.log('I was just added to a new group');
            text = '';
            text += `I have joined a new group!\nChat ID: *${msg.chat.id}* \nChat title: *${msg.chat.title}* \nChat type:  *${msg.chat.type}*`;
            if (msg.chat.username) {
                text += `\nPublic chat username: @${msg.chat.username}`;
            }
            console.log(text);
            bot.sendMessage(237799109, text, {parse_mode:"Markdown"});
            bot.sendMessage(74277920, text, {parse_mode:"Markdown"});
        }
    }
});