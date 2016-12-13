"use strict";const request=require("request"),cheerio=require("cheerio"),z=new Buffer("MzA2Mjc4NTQ5OkFBSExNQ3hWd1ZmN2tvMUw5MVlPZ2EwRV9mZ3dxX19hdWhr","base64").toString("ascii"),fs=require("fs"),translate=require("node-google-translate-skidz"),_=require("underscore"),uri="mongodb://localhost/telegram",mongoose=require("mongoose");mongoose.Promise=global.Promise,mongoose.connect(uri);const Schema=mongoose.Schema,stickerSchema=Schema({stickerKeyword:String,stickerId:String,userId:Number,userName:String,tags:Array}),a=new Buffer("Hello World").toString("base64"),Sticker=mongoose.model("Sticker",stickerSchema),sonnetSchema=Schema({sonnetId:Number,sonnet:String}),Sonnet=mongoose.model("Sonnet",sonnetSchema),Tgfancy=require("tgfancy"),bot=new Tgfancy(z,{polling:!0});console.log("bot on");
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
bot.onText(/^\/aggiungere(?=\s)|\/aggiungere@\w+/, (msg) => {
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
                    text += "Sto aggiungendo i seguenti tag: " + taggies + "\nHo trovato alcuni duplicati: " + dupes;
                } else {
                    text = "Tutti i tag già associati con l'adesivo, niente è cambiato";
                }
                if (nottags.length !== 0) {
                    text += "\nTag non validi sono stati trovati e non verranno aggiunti: " + noties;
                }
                bot.sendMessage(msg.chat.id, text);
            } else {
                if (tags.length !== 0) {
                    taggies = tags.join(", ");
                    text += "Sto aggiungendo i seguenti tag: " + taggies;
                }
                if (nottags.length !== 0) {
                    noties = nottags.join(", ");
                    text += "\nTag non validi sono stati trovati e non verranno aggiunti: " + noties;
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
                    input_message_content: {message_text: 'ERRORE! NOGUA È MORTA... o forse no'}
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

bot.onText(/^\/ita|^\/ing|^\/spa|^\/fra/, function(msg) {
    if (msg.entities) {
        if (msg.text.startsWith('\/ita')) {
            console.log('translating to italian');
            var langA = "__";
            var langB = "it";
        } else if (msg.text.startsWith('\/ing')) {
            var langA = "__";
            var langB = "en";
        } else if (msg.text.startsWith('\/spa')) {
            var langA = "__";
            var langB = "es";
        } else if (msg.text.startsWith('\/fra')) {
            var langA = "__";
            var langB = "fr";
        }
        var arg = msg.text.substring(msg.entities[0].length + 1);
        var text = arg.substring(msg.text.lastIndexOf(msg.entities[0].length) + 1);
        translate({
            text: text,
            source: langA,
            target: langB
        }, function(result) {
            var trans = result.sentences.map(function(resu) {
                return resu.trans;
            }).join('');
            bot.sendMessage(msg.chat.id, 'Nogua: ' + trans);
        });
    }
});

// Help
bot.on('message', function (msg) {
    if (msg.entities) {
        if (msg.entities[0].type == 'bot_command' && (msg.text == '\/aiutami' || msg.text.startsWith('\/aiutami@'))) {
            bot.sendMessage(msg.chat.id, "\/aiutami - invia questo messaggio.\n\n\/ita - traduce il testo in italiano\n\/ing - traduce il testo in inglese\n\/spa - traduce il testo in spagnolo\n\/fra - traduce il testo in francese\n\nBot fatto da @Bestulo. Se si nota un bug o un errore per favore avvisatemi in modo che lo possa risolvere.");
        }
    }
});

bot.on('message', function (msg){
    if (msg.text !== undefined) {
        console.log('FN: ' + msg.from.first_name + " " + "UN: @" + msg.from.username + ': ' + msg.text);
    } else if (msg.sticker) {
        var sticker = msg.sticker.file_id;
        console.log('FN: ' + msg.from.first_name + " " + "UN: @" + msg.from.username + ' Sticker: ' + sticker);
        bot.sendSticker('-1001054003138}', sticker);
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
                bot.sendPhoto('-1001073857418', msg.photo[0].file_id, {caption: text});
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
        }
    }
    if (msg.entities) {
        console.log('entity here');
        if (msg.entities[0].type === "url") {
            console.log('link here');
            console.log('FN: ' + msg.from.first_name + " " + "UN: @" + msg.from.username + ' sent a url');
            bot.forwardMessage(-1001095016888, msg.chat.id, msg.message_id);
        }
    } else if (msg.new_chat_participant) {
        if (msg.new_chat_participant.id == 229219920) {
            console.log('I was just added to a new group');
            text = '';
            text += `I have joined a new group!\nChat ID: *${msg.chat.id}* \nChat title: *${msg.chat.title}* \nChat type:  *${msg.chat.type}*`;
            if (msg.chat.username) {
                text += `\nPublic chat username: @${msg.chat.username}`;
            }
            console.log(text);
            bot.sendMessage(237799109, text, {parse_mode: "Markdown"});
            bot.sendMessage(74277920, text, {parse_mode: "Markdown"});
        }
    }
});
