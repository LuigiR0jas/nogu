'use strict';

// Bot modules
const fs = require('fs'),
    secrets = fs.readFileSync("secrets.json"),
    vars = JSON.parse(secrets),
    token = vars.token,
    Tgfancy = require('tgfancy'),
    bot = new Tgfancy(token, { polling: true }),
// HTTP modules
    request = require('request'),
    translate = require('node-google-translate-skidz'),
    cheerio = require('cheerio'),
    phantom = require('phantom'),
//Twitter module
    Twitter = require('twitter'),
    tuser = new Twitter({
        consumer_key: vars.consumer_key,
        consumer_secret: vars.consumer_secret,
        access_token_key: vars.access_token_key,
        access_token_secret: vars.access_token_secret
    }),
// Other modules
    _ = require('underscore'),
// DB modules
    uri = 'mongodb://localhost/telegram',
    mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(uri);

// Mongoose requirements
const Schema = mongoose.Schema,
    stickerSchema = Schema({
        stickerKeyword: String,
        stickerId: String,
        userId: Number,
        userName: String,
        tags: Array
    }),
    Sticker = mongoose.model('Sticker', stickerSchema),

    sonnetSchema = Schema({
        sonnetId: Number,
        sonnet: String
    }),
    Sonnet = mongoose.model('Sonnet', sonnetSchema);

bot.getMe().then(res=>{
    global.me = {
        id: res.id,
        name: res.first_name,
        username: res.username
    }
});

console.log('bot on');

bot.onText(/^\//, msg => {
    if (msg.text.match(/^\/kick|^\/ban/) && msg.reply_to_message)
        kick(msg);
    else if(msg.text.match(/^\/getid @|^\/getid@\w+ @/))
        getId(msg);
    else if(msg.text.match(/^\/doge$|^\/doge@/))
        doge(msg);
    else if(msg.text.match(/^\/repite \w+|^\/repite@\w+ \w+/))
        repite(msg);
    else if(msg.text.match(/^\/help$|^\/help@/))
        help(msg);
    else if(msg.text.match(/^\/spa|^\/esp|^\/hisp|^\/trad|^\/eng|^\/ing|^\/ang|^\/translate|^\/fra|^\/fre/))
        tra2(msg);
    else if(msg.text.match(/^\/trans|^\/trans@/))
        tra1(msg);
    else if(msg.text.match(/^\/sonnet\s[0-9]+$/))
        sonnet(msg);
    else if(msg.text.match(/^\/dolar|^\/dollar|^\/euro/))
        currency(msg);
    else if(msg.text.match(/^\/addtags(?=\s)|\/addtags@\w+/) && msg.reply_to_message && msg.reply_to_message.sticker && msg.entities && msg.entities[0].type === "bot_command")
        addTags2(msg);
});
bot.on('message', msg => {
    shove(msg);
    if(msg.text && msg.text.match(/#([^\s]+)/g) && !msg.text.startsWith("\/") && msg.reply_to_message && msg.reply_to_message.sticker){
        addTags1(msg);}
});

function reply(msg, text){
    return bot.sendMessage(msg.chat.id, text, {parse_mode: "Markdown", reply_to_message_id: msg.message_id});
}
function report(msg, text) {
    bot.sendMessage(msg.chat.id, text, {parse_mode: "Markdown"});
}
function getAdmins(chatId) {
    return bot.getChatAdministrators(chatId).then(function (result) {
        let admins = [];
        result.forEach((x) => {
            admins.push(x.user.id);
        });
        return admins;
    });
}
function getId(msg) {
    let text = msg.text.substring(msg.entities[0].length + 1);
    console.log(text);
    bot.getChat(text).then(res => {
        reply(msg, String(res.id));
    });
}

function botAPI (...args) { //method, object, cb
    const methodName = args.shift(),
        callback = (typeof args[args.length - 1] === 'function') ? args.pop() : null,
        object = (args.length > 0) ? args.shift() : null;
    let method;
    if (object) {
        method = `${methodName}?`;
        let methodArr = [];
        for (let key in object){
            if (!object.hasOwnProperty(key)) continue;
            if (key === 0) {method += `${key}=${object[key]}`; continue;}
            methodArr.push(`${key}=${object[key]}`);
        }
        method += methodArr.join("&");
    } else {
        method = methodName;
    }
    request(`https://api.telegram.org/bot${token}/${method}`, function (error, response, html) {
        const result = JSON.parse(html);
        if (callback) callback(result);
    });
}

function getPics(userId){
    let photos = [];
    return bot.getUserProfilePhotos(userId).then(function(result){
        if (result.total_count > 0) {
            result.photos.forEach((x)=>{
                photos.push(x[0].file_id);
            });
            return photos;
        } else {
            return photos;
        }
    });
}

bot.on('message', msg=>{
    if (msg.entities && msg.entities[0].type === "bot_command") {
        let text;
        if (msg.text.startsWith("\/getid")) {
            text = msg.text.substring(msg.entities[0].length + 1);
            console.log(text);
            bot.getChat(text).then(res => {
                reply(msg, String(res.id));
                //bot.sendMessage(msg.chat.id, String(res.id), {reply_to_message_id: msg.message_id});
                console.log(res);
                console.log("logged");
            });
        } else if(msg.chat.type === "private" && msg.text.startsWith('\/start getpics ')){
            let args = msg.text.split(" ");
            if (args.length === 3) {
                let username = args[2];
                bot.getChat(username).then(res=> {
                    console.log(res);
                    getPics(String(res.id)).then(pics=> {
                        console.log("pics are" + pics.join(" "));
                        pics.forEach(x=>{
                            bot.sendPhoto(msg.chat.id, x);
                        })
                    })
                })
            }
        } else if (msg.chat.type !== "private" && msg.text.startsWith("\/getpics ")) {
            let username = msg.text.substring(msg.entities[0].length + 1);
            bot.sendMessage(msg.chat.id, `[click here](https:\/\/telegram.me\/${global.me.username}?start=getpics%20${username})`, {
                parse_mode: "Markdown",
                disable_web_page_preview: true,
                reply_to_message_id: msg.message_id});
        }
    }
});

// Get tags when # then save
function addTags1(msg) {
    let hashtags, tags, nottags;
    hashtags = msg.text.match(/#([^\s]+)/g);
    tags = [];
    nottags = [];
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

// Get tags on command then save
function addTags2(msg) {
    let command, args, hashtags, tags, nottags;
    command = msg.text.substring(msg.text.search("\/"), msg.text.search(" "));
    args = msg.text.substring(command.length + 1);
    hashtags = args.match(/[^\s]+/g);
    tags = [];
    nottags = [];
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

// Tag saver
const tagSaver = function(msg, tags, nottags) {
    Sticker.find({tags: {$in: tags}, stickerId: msg.reply_to_message.sticker.file_id}, function (err, result) {
        let text = '';
        if (err) {
            console.log(err);
        } else {
            let duplicates, dupes, taggies, noties;
            if (result[0] !== undefined) {
                duplicates = _.intersection(tags, result[0].tags);
                tags = _.difference(tags, result[0].tags);
                dupes = duplicates.join(", ");
                taggies = tags.join(", ");
                noties = nottags.join(", ");
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
                }, function (err) {
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
    let hashtags, tags = [], nottags = [];
    hashtags = msg.query.split(' ');
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
            let stickerIds = [], finalResults = [];
            for (let i = 0;i<result.length;i++){
                if (tags.length <= _.intersection(result[i].tags, tags).length) {
                    finalResults.push(result[i]);
                }
            }
            result = finalResults;
            for (let i = 0; i < result.length; i++) {
                stickerIds.push(result[i].stickerId);
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
                    let resultArr, uniqResults, myArr;
                    resultArr = [];
                    for (let i = 0; i < result.length; i++) {
                        resultArr.push(result[i].stickerId);
                    }
                    uniqResults = _.uniq(resultArr);
                    myArr = [];
                    for (let i = 0; i < uniqResults.length; i++) {
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

//Sonnet puller
function sonnet(msg) {
    console.log('Action log: Sent a sonnet');
    let text = msg.text.substring(msg.entities[0].length + 1);
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

// Google Translate
function tra1(msg) {
    let arg, langA, langB, text;
    if (msg.text.match(/^\/[^\s]+\s\w{4}\s.+/)) {
        arg = msg.text.substring(msg.entities[0].length + 1);
        langA = arg.substring(0, 2);
        langB = arg.substring(2, 4);
        text = arg.substring(msg.text.lastIndexOf(msg.entities[0].length) + 6);
    } else if (msg.text.match(/^\/[^\s]+\s.{0,5}$|[^\s]+.{5,}$/)){
        reply(msg, "For `\/trans` to work, you need *four* (4) language letters (example: `\/trans` *enes* text) and a _text_ (example: `\/trans` enes *text*)");
        return;
    } else {
        reply(msg, "I need an something to translate, try sending `/translate Necesito algo para traducir`");
        return;
    }
    if (text === undefined || text === '') return;
    translate({
        text: text,
        source: langA,
        target: langB
    }, function (result) {
        let trans = result.sentences.map(function (resu) {
            return resu.trans;
        }).join('');
        bot.sendMessage(msg.chat.id, 'Nogu: ' + trans);
    })
}

function tra2(msg) {
    let langA, langB, arg, text, trans;
    let spa = /^\/spa|^\/esp|^\/hisp|^\/tradu|^\/trad/;
    let eng = /^\/eng|^\/ing|^\/ang|^\/translate/;
    let fra = /^\/fra|^\/fre/;
    if (msg.reply_to_message) {
        text = msg.reply_to_message.text;
    } else if (msg.text.match(/^\/\w+\s\w+/)) {
        arg = msg.text.substring(msg.entities[0].length + 1);
        text = arg.substring(msg.text.lastIndexOf(msg.entities[0].length) + 1);
    } else {
        reply(msg, "I need an something to translate, try sending `/translate Necesito algo para traducir`");
        return;
    }
    if (msg.entities) {
        if (msg.text.match(spa)) {
            langA = "__";
            langB = "es";
        } else if (msg.text.match(eng)) {
            langA = "__";
            langB = "en";
        } else if (msg.text.match(fra)) {
            langA = "__";
            langB = "fr";
        }
        console.log('text = ' + text);
        if (text !== undefined) {
            translate({
                text: text,
                source: langA,
                target: langB
            }, function (result) {
                trans = result.sentences.map(function (resu) {
                    return resu.trans;
                }).join('');
                reply(msg, 'Nogu: ' + trans);
            });
        }
    }
}

// Help
function help(msg) {
    bot.sendMessage(msg.chat.id, "\/help - Sends this message.\r\n\r\n\/repite <text> - Repeats the text\r\n\r\n\/dolar - Checks the current exchange value of the Dollar\r\n\/euro - Checks the current exchange value of the Euro\r\n\r\n\/doge - Sends random doge from 12 doges\r\n\r\n\/trans <l1l2> <texto> - Translates the text from language 1 (l1) to language 2 (l2) on Google Translate. If you want to translate with \/trans, You must place the two letters that represent each language in this format: l1l2 (for example, to translate from Spanish to English, write esen)\r\n\r\nExamples of combinations:\r\nende = English to German\r\neozh = Esperanto to Chinese\r\nsves = Swedish to Spanish\r\nptit = Portuguese to Italian\r\n\r\nUsage example:\r\n\/trans enes Languages are cool.\r\n\r\nBot made by @Bestulo. If you notice a mistake or an error, or a way to break it, please notice me so that I can fix it.");
}

//Dollar & Euro stuff

function currency(msg){
    tuser.get('users/show', {screen_name:'DolarToday'},(err, req)=>{
        let currency, value, bio = req.description;
        if (err) console.log(err);
        else {
            if (msg.text.startsWith('\/dolar') || msg.text.startsWith('\/dollar')) {
                currency = "$";
                value = bio.substring(bio.indexOf("Bs."), bio.indexOf(" y el"));
            } else if (msg.text.startsWith('\/euro')) {
                currency = "€";
                value = bio.substring(bio.lastIndexOf("Bs."), bio.indexOf(" entra"));
            }
            bot.sendMessage(msg.chat.id, currency + '1 = ' + value);
            console.log('Sent ' + currency + ' value');
        }
    });
}

// Miscellaneous stuff
function doge(msg) {
    let cualDoge = [
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
    let elDoge = cualDoge[Math.floor(Math.random() * 12)];
    bot.sendSticker(msg.chat.id, elDoge);
}

function repite(msg) {
    console.log('Action log: Repeated a message');
    let text = msg.text.substring(msg.entities[0].length + 1);
    bot.sendMessage(msg.chat.id, text, {parse_mode: 'markdown'});
}

function shove(msg) {
    if (msg.chat.id === -1001043923041)
        bot.forwardMessage(-1001061124982, -1001043923041, msg.message_id);
    else if (msg.chat.id === -1001055742276)
        bot.forwardMessage(-1001066541657, -1001055742276, msg.message_id);
    if (msg.text !== undefined)
        console.log('FN: ' + msg.from.first_name + " " + "UN: @" + msg.from.username + ': ' + msg.text);
    else if (msg.sticker) {
        let sticker = msg.sticker.file_id;
        console.log('FN: ' + msg.from.first_name + " " + "UN: @" + msg.from.username + ' Sticker: ' + sticker);
        bot.sendSticker('-1001054003138}', sticker);
    } else if (msg.photo || msg.document) {
        let text = '', text2;
        if (msg.chat.title !== undefined)
            text += 'Sent by: ' + msg.from.first_name + ' ( @' + msg.from.username + ' )' + '\nChat: ' + msg.chat.title + ' (' + msg.chat.id + ')';
        else
            text += 'Sent by: ' + msg.from.first_name + ' ( @' + msg.from.username + ' )' + '\nPrivate message: ' + msg.chat.first_name + ' (' + msg.chat.id + ')';
        if (msg.caption) {
            text += '\nOriginal caption: ' + msg.caption;
            if (text.length > 200)
                text2 = text.substr(200);
        }
        if (msg.photo) {
            console.log('FN: ' + msg.from.first_name + " " + "UN: @" + msg.from.username + ' sent a photo');
            if (!text2)
                bot.sendPhoto('-1001073857418', msg.photo[0].file_id, {caption: text});
            else {
                bot.sendPhoto('-1001073857418', msg.photo[0].file_id, {caption: text});
                bot.sendMessage('-1001073857418', text2);
            }
        } else if (msg.document) {
            console.log('FN: ' + msg.from.first_name + " " + "UN: @" + msg.from.username + ' sent a document');
            if (!text2)
                bot.sendDocument('-1001073997991', msg.document.file_id, {caption: text});
            else {
                bot.sendDocument('-1001073997991', msg.document.file_id, {caption: text});
                bot.sendMessage('-1001073997991', text2);
            }
        }
    }
    if (msg.entities) {
        if (msg.entities[0].type === "url") {
            console.log('link here');
            console.log('FN: ' + msg.from.first_name + " " + "UN: @" + msg.from.username + ' sent a url');
            bot.forwardMessage(-1001095016888, msg.chat.id, msg.message_id);
        }
    } else if (msg.new_chat_participant) {
        if (msg.new_chat_participant.id == 229219920) {
            console.log('I was just added to a new group');
            let text = '';
            text += `I have joined a new group!\nChat ID: *${msg.chat.id}* \nChat title: *${msg.chat.title}* \nChat type:  *${msg.chat.type}*`;
            if (msg.chat.username) {
                text += `\nPublic chat username: @${msg.chat.username}`;
            }
            console.log(text);
            bot.sendMessage(237799109, text, {parse_mode: "Markdown"});
            bot.sendMessage(74277920, text, {parse_mode: "Markdown"});
        }
    }
}

// KICK & BAN

function kick(msg) {
    getAdmins(msg.chat.id).then((res) => {
        let user1, user2, state;
        user1 = msg.from.id;
        user2 = msg.reply_to_message.from.id;
        if (res.indexOf(user1) === -1)
            state = 0;
        else if (res.indexOf(user1) !== -1 && res.indexOf(user2) === -1)
            state = 1;
        else if (res.indexOf(user1) !== -1 && res.indexOf(user2) !== -1 && String(user1) !== String(user2))
            state = 2;
        else if (res.indexOf(user1) !== -1 && String(user1) === String(user2))
            state = 3;
        switch (state) {
            case 3:
                reply(msg, "_You cannot kick/ban yourself._");
                break;
            case 2:
                reply(msg, "_You cannot kick/ban another admin._");
                break;
            case 1:
                const user = msg.reply_to_message.from;
                botAPI("kickChatMember", {chat_id: msg.chat.id, user_id: user.id}, result => {
                    if (result.ok === false) {
                        bot.sendMessage(msg.chat.id, "I cannot kick that member.");
                    } else {
                        let text;
                        if (msg.text.startsWith("\/kick")) {
                            botAPI("unbanChatMember", {chat_id: msg.chat.id, user_id: user.id}, () => {
                                if (user.username !== undefined) {
                                    text = "I have kicked `" + user.first_name + "`" + " ( @" + user.username + " )";
                                } else {
                                    text = "I have kicked `" + user.first_name + "`";
                                }
                                reply(msg, text);
                            });
                        } else {
                            if (user.username !== undefined) {
                                text = "I have banned `" + user.first_name + "`" + " ( @" + user.username + " )";
                            } else {
                                text = "I have banned `" + user.first_name + "`";
                            }
                            report(msg, text);
                        }
                    }
                });
                break;
            case 0:
                break;
            default:
                console.log('unexpected switch default');
        }
    });
}

bot.onText(/^\/pickupline(@\w+)?$/, msg=>{
    request.get('http://www.pickuplinegen.com/', (err, res, html)=>{
        let $ = cheerio.load(html);
        let text = $('#content').text();
        bot.sendMessage(msg.chat.id, text);
        if(err){
            bot.sendMessage(msg.chat.id, "There was an error retrieving the information you requested");
        }
    })
});

bot.onText(/^\/piropo(@\w+)?$/, msg=> {
    request.post('http://www.tuclubsocial.com/getPiropo.php', (err, res, html)=>{
        bot.sendMessage(msg.chat.id, html);
            if(err){
                bot.sendMessage(msg.chat.id, "There was an error retrieving the information you requested");
            }
    })
});