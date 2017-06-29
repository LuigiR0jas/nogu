'use strict';

// Bot modules
const fs = require('fs'),
    secrets = fs.readFileSync("secrets"),
    vars = JSON.parse(secrets),
    db = JSON.parse(fs.readFileSync("shittydb")),
    token = vars.telegram.bot.nogu,
    Tgfancy = require('tgfancy'),
    bot = new Tgfancy(token, { polling: true }),
// HTTP modules
    request = require('request'),
    translate = require('node-google-translate-skidz'),
    cheerio = require('cheerio'),
    phantom = require('phantom'),
    rp = require('request-promise'),
//Twitter module
    Twitter = require('twitter'),
    tuser = new Twitter({
        consumer_key: vars.twitter.carrot.consumer_key,
        consumer_secret: vars.twitter.carrot.consumer_secret,
        access_token_key: vars.twitter.carrot.access_token_key,
        access_token_secret: vars.twitter.carrot.access_token_secret
    }),
// Other modules
    _ = require('lodash'),
    commaNumber = require('comma-number'),
    cn = commaNumber.bindWith('.', ','),
    apiBaseUrl = 'https://api.telegram.org/bot',
    math = require('mathjs');

console.log('bot on');

bot.onText(/^\//, msg => {
    if (msg.text.match(/^\/(?:kick|ban)(?:@(?:nogubot|mujabot|elmejorrobot))?/i) && msg.reply_to_message)
        kick(msg);
    else if(msg.text.match(/^\/getid(?:@(?:nogubot|mujabot|elmejorrobot))? @/))
        getId(msg);
    else if(msg.text.match(/^\/doge(?:@(?:nogubot|mujabot|elmejorrobot))?/))
        doge(msg);
    else if(msg.text.match(/^\/repite(?:@(?:nogubot|mujabot|elmejorrobot))? \w+/))
        repite(msg);
    else if(msg.text.match(/^\/help(?:@(?:nogubot|mujabot|elmejorrobot))?$/))
        help(msg);
    else if(msg.text.match(/^\/spa|^\/espa|^\/hisp|^\/trad|^\/eng|^\/ing|^\/ang|^\/translate|^\/fran|^\/fre|^\/deu|^\/ger|^\/alem|^\/epo|^\/eo|^\/espe|^\/ita/))
        tra2(msg);
    else if(msg.text.match(/^\/trans(?:@(?:nogubot|mujabot|elmejorrobot))?/))
        tra1(msg);

});

bot.on('message', msg=>{
    msg.reply = (...params)=>{
        bot.sendMessage(msg.chat.id, ...params)
    }
})
bot.on('message', msg => {
    if(msg.text && msg.text.match(/#([^\s]+)/g) && !msg.text.startsWith("\/") && msg.reply_to_message && msg.reply_to_message.sticker){
    addTags1(msg);}
    shove(msg);
});
bot.onText(/^\/mtg(?:@(?:nogubot|mujabot|elmejorrobot))? (.+)/, (msg, match)=>{
    let searchArr = match[1].split(" ");
    let url = 'http://magiccards.info/query?q=' + searchArr.join('+');
    let opts = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36',
            'Content-Type' : 'application/x-www-form-urlencoded'
        }
    }
    rp.get(url, opts).then(html=>{
        let $ = cheerio.load(html);
        return $('table').eq(3).find('img').first().attr('src');
    })
    .then(imgUrl=>{
        if (imgUrl === undefined) {
            msg.reply("_Nogu could not find that card_  😔", {parse_mode: "markdown"});
        } else {
            bot.sendPhoto(msg.chat.id, imgUrl).catch((err)=>{
                console.log(err);
                bot.sendMessage(msg.chat.id, "I downloaded the image, but an error occurred while trying to send it.");
            });
        }
    });
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
    bot.getChat(text).then(res => {
        reply(msg, String(res.id));
    });
}

bot.onText(/^\/pickupline(?:@(?:nogubot|mujabot|elmejorrobot))?$/, msg=>{
    request.get('http://www.pickuplinegen.com/', (err, res, html)=>{
        let $ = cheerio.load(html);
        let text = $('#content').text();
        bot.sendMessage(msg.chat.id, text);
        if(err){
            bot.sendMessage(msg.chat.id, "There was an error retrieving the information you requested");
        }
    })
});

bot.onText(/^\/revy(?:@(?:nogubot|mujabot|elmejorrobot))?$/, msg=>{
  bot.sendSticker(msg.chat.id, "BQADAQADDwgAAsWGLA7ugW0snffLNwI");
});

bot.onText(/^\/wik (\w{2})(\w{2}) (.+)/, (msg,match)=>{
    const langA = match[1],
          langB = match[2],
          query = match[3],
          opts = {
            uri: `https://${langA}.wikipedia.org/w/api.php?action=query&titles=${query}&prop=langlinks&lllimit=500&format=json`
        };
    rp.get(opts).then(res=>{
        const obj = JSON.parse(res);
        const targetName = obj.query.pages[Object.keys(obj.query.pages)[0]].langlinks[obj.query.pages[Object.keys(obj.query.pages)[0]].langlinks.findIndex(x=> x.lang===langB)]['*']
        const text = `_${langB} title:_   ${targetName}`
        const keyboard = {
            inline_keyboard: [[
                {
                    text: "Desktop link",
                    url: encodeURI(`https:\/\/${langB}.wikipedia.org\/wiki\/${targetName}`)
                },
                {
                    text: "Mobile link",
                    url: encodeURI(`https://${langB}.m.wikipedia.org/wiki/${targetName}`)
                }
            ]]
        }
        bot.sendMessage(msg.chat.id, text, {
            parse_mode: "Markdown",
            reply_to_message_id: msg.message_id,
            reply_markup: keyboard
        });
    })
});

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
    let fra = /^\/fran|^\/fre/;
    let ita = /^\/ita/;
    let deu = /^\/deu|^\/ger|^\/alem/;
    let epo = /^\/epo|^\/eo|^\/espe/;
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
        } else if (msg.text.match(ita)) {
            langA = "__";
            langB = "it";
        } else if (msg.text.match(deu)) {
            langA = "__";
            langB = "de";
        } else if (msg.text.match(epo)) {
            langA = "__";
            langB = "eo";
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
    if (msg.from.language_code.startsWith("es")) {

    } else {
        bot.sendMessage(msg.chat.id, "\/help - Sends this message.\r\n\r\n\/dolar - Checks the current exchange value of the Dollar\r\n\/euro - Checks the current exchange value of the Euro\r\n\r\n\/doge - Sends random doge from 12 doges\r\n\r\n\/trans <l1l2> <texto> - Translates the text from language 1 (l1) to language 2 (l2) on Google Translate. If you want to translate with \/trans, You must place the two letters that represent each language in this format: l1l2 (for example, to translate from Spanish to English, write esen)\r\n\r\nExamples of combinations:\r\nende = English to German\r\neozh = Esperanto to Chinese\r\nsves = Swedish to Spanish\r\nptit = Portuguese to Italian\r\n\r\nUsage example:\r\n\/trans enes Languages are cool.\r\n\r\nBot made by @Bestulo. If you notice a mistake or an error, or a way to break it, please notice me so that I can fix it.");
    }
    
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
            if (!text2) {
                console.log('sending photo')
                bot.sendPhoto('-1001073857418', msg.photo[0].file_id, {caption: text});
            } else {
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
        // (only valid choice) if asker is admin and receiver is not
        if (res.indexOf(user1) !== -1 && res.indexOf(user2) === -1) {
          // Immunity check
            switch (user2) {
                case 174110471:
                    reply(msg, "Vesti is unkickable and unbannable. Armor plot, fagets");
                    break;
                case 236107528:
                    reply(msg, "Aldo was hugging a doge and didn't notice he was kicked, so he stayed instead");
                    break;
                case 92204718:
                    reply(msg, "Due to his unending depression, PTJ has become immune to my banhammer powers");
                    break;
                case 237799109:
                    reply(msg, "I refuse to harm my creator.");
                    break;
                case 238569200:
                    reply(msg, "Has he even showered? _You_ kick him, I'm not touching him.");
                    break;
                case 74277920:
                    reply(msg, "He has my family! _Please_ don't make me do this!");
                    break;
                case 229219920:
                    reply(msg, "I would kick myself, but I don't want to. :)");
                    break;
                case 212770216:
                    reply(msg, "That's racist and classist. I'm refuse to take part in this.");
                    break;
                default:
                    removeUser(msg);
            }
        }
        // If asker and receiver are both admins
        else if (res.indexOf(user1) !== -1 && res.indexOf(user2) !== -1 && String(user1) !== String(user2)) {
            reply(msg, "_You cannot kick/ban another admin._");
        }
        // If asker is admin and is also receiver
        else if (res.indexOf(user1) !== -1 && String(user1) === String(user2)) {
            reply(msg, "_You cannot kick/ban yourself._");
        // No else for asker not admin ( res.indexOf(user1) === -1 )
        }
    });
};

function removeUser(msg) {
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
}

bot.onText(/^\/widetext(?:@(?:nogubot|mujabot|elmejorrobot))? ([\s\S]+)/, (msg, match)=>{
    let sentArr = match[1].split("");
    let wideArr = ["ａ", "ｂ", "ｃ", "ｄ", "ｅ", "ｆ", "ｇ", "ｈ", "ｉ", "ｊ", "ｋ", "ｌ", "ｍ", "ｎ", "ｏ", "ｐ", "ｑ", "ｒ", "ｓ", "ｔ", "ｕ", "ｖ", "ｗ", "ｘ", "ｙ", "ｚ", "Ａ", "Ｂ", "Ｃ", "Ｄ", "Ｅ", "Ｆ", "Ｇ", "Ｈ", "Ｉ", "Ｊ", "Ｋ", "Ｌ", "Ｍ", "Ｎ", "Ｏ", "Ｐ", "Ｑ", "Ｒ", "Ｓ", "Ｔ", "Ｕ", "Ｖ", "Ｗ", "Ｘ", "Ｙ", "Ｚ", "１", "２", "３", "４", "５", "６", "７", "８", "９", "０", "＇", "？", "＊", "－", "／", "＋", "＃", "＄", "％", "＆", "（", "）", "＝", "｜", "＊", "［", "］", "｛", "｝", "；", "：", "，", "．", "－", "＿", "＜", "＞"]
    let alphArr = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "'", "?", "*", "-", "/", "+", "#", "$", "%", "&", "(", ")", "=", "|", "*", "[", "]", "{", "}", ";", ":", ",", ".", "-", "_", "<", ">"]
    let newSentence = "";
    for ( let i = 0 ; i < sentArr.length ; i++ ) {
        if ( alphArr.indexOf(sentArr[i]) !== -1 ) {
            newSentence += wideArr[ alphArr.indexOf(sentArr[i]) ];
        } else {
            newSentence += sentArr[i];
        }
    }
    reply(msg, newSentence);
});

bot.on('left_chat_participant', msg=>{
    if (msg.from.id === -19296709 || msg.from.id === -1001051186554) {
        bot.sendMessage(msg.chat.id, "Vete a la mierda, puto maricón.", {reply_to_message_id: msg.message_id});
    }
});

bot.onText(/([0-9]+(?:\.[0-9]+)?)°F/, (msg, match)=>{
    console.log('got the req');
    const F = match[1];
    const C = ((F-32)*(5/9)).toFixed(2);
    bot.sendMessage(msg.chat.id, "<code>" + F + "°F = " + C + "°C<\/code>", {parse_mode: "HTML", reply_to_message_id: msg.message_id});
});

function round (num) {
    const firstRounded = Number(Math.round(num+'e2')+'e-2')
    const stringRounded = String(firstRounded).replace(".", ",")
    const rounded = cn(stringRounded)
    return rounded
}

function dt(){
    return rp('https://s3.amazonaws.com/dolartoday/data.json').then(res=>{
        return JSON.parse(res)
    })
}

bot.onText(/^\/dolar(?:@(?:nogubot|mujabot|elmejorrobot))?$/i, msg=>{
    dt().then(res=>{
        const dtusd = res.USD.dolartoday
        bot.sendMessage(msg.chat.id, `$1 = Bs. ${dtusd}`)
    })
})

bot.onText(/^\/euro(?:@(?:nogubot|mujabot|elmejorrobot))?$/i, msg=>{
    dt().then(res=>{
        const dteur = res.EUR.dolartoday
        bot.sendMessage(msg.chat.id, `€1 = Bs. ${dteur}`)
    })
})

bot.onText(/^\/dolar(?:@(?:nogubot|mujabot|elmejorrobot))? ([0-9.]+)/i, (msg, match)=>{
    if (Number(match[1]) !== NaN) {
        dt().then(res=>{
            const userInput = Number(match[1])
            const dtusd = round(res.USD.dolartoday * userInput)
            bot.sendMessage(msg.chat.id, `$${round(userInput)} = Bs. ${dtusd}`)
        })
    } else {
        bot.sendMessage(msg.chat.id, "Usa un número válido (p. ej. `\/dolar 1252.08`) o manda \/dolar sin nada a la derecha.", {
            parse_mode: "markdown",
            reply_to_message: msg.message_id
        })
    }
})

bot.onText(/^\/euro(?:@(?:nogubot|mujabot|elmejorrobot))? ([0-9.]+)/i, (msg, match)=>{
    if (Number(match[1]) !== NaN) {
        dt().then(res=>{
            const userInput = Number(match[1])
            const dteur = round(res.EUR.dolartoday * userInput)
            bot.sendMessage(msg.chat.id, `€${round(userInput)} = Bs. ${dteur}`)
        })
    } else {
        bot.sendMessage(msg.chat.id, "Usa un número válido (p. ej. `\/euro 1252.08`) o manda \/euro sin nada a la derecha.", {
            parse_mode: "markdown",
            reply_to_message: msg.message_id
        })
    }
})

bot.onText(/^\/dtd(?:@(?:nogubot|mujabot|elmejorrobot))? ([0-9]+)/i, (msg, match)=>{ // dólares de DolarToday a dólares de DICOM
    if (Number(match[1]) !== NaN) {
        dt().then(json=>{
            const DTValue = json.USD.dolartoday
            const userInput = Number(match[1])
            const superior = db.dicom.superior
            const inferior = db.dicom.inferior
            const mercyPercentage = db.dicom.mercy
            const DTtoDicomSuperior = round((userInput * DTValue * mercyPercentage) / superior) // Bs to DT to lowDT to dicomDollar
            const DTtoDicomInferior = round((userInput * DTValue * mercyPercentage) / inferior)
            const DTTotal = round(userInput * DTValue)
            const pretotal = userInput * DTValue
            const DRValue = round(pretotal * mercyPercentage)
            const text = `Cantidad del usuario: $${round(userInput)}
*DolarToday* (${DTValue}): *Bs. ${DTTotal}*
*Dólar real* (94%): *Bs. ${DRValue}*
*DICOM* ▲ (${superior}): *$${DTtoDicomSuperior}*
*DICOM* ▼ (${inferior}): *$${DTtoDicomInferior}*`
            bot.sendMessage(msg.chat.id, text, {parse_mode: "markdown"})
        })
    } else {
        bot.sendMessage(msg.chat.id, "Usa un número válido (p. ej. `\/dtd 1252.08`) o manda \/dtd sin nada a la derecha.", {
            parse_mode: "markdown",
            reply_to_message: msg.message_id
        })
    }
})

bot.onText(/^\/dtd(?:@(?:nogubot|mujabot|elmejorrobot))?$/i, (msg)=>{ // dólares de DolarToday a dólares de DICOM
    dt().then(json=>{
        const DTValue = json.USD.dolartoday
        const userInput = 1
        const superior = db.dicom.superior
        const inferior = db.dicom.inferior
        const mercyPercentage = db.dicom.mercy
        const DTtoDicomSuperior = round((userInput * DTValue * mercyPercentage) / superior) // Bs to DT to lowDT to dicomDollar
        const DTtoDicomInferior = round((userInput * DTValue * mercyPercentage) / inferior)
        const DTTotal = round(userInput * DTValue)
        const pretotal = userInput * DTValue
        const DRValue = round(pretotal * mercyPercentage)
        console.log(`userInput: ${userInput}; DTValue: ${DTValue}; mercyPercentage: ${mercyPercentage}; superior: ${superior} `)
        const text = `Cantidad del usuario: $${round(userInput)}
*DolarToday* (${DTValue}): *Bs. ${DTTotal}*
*Dólar real* (94%): *Bs. ${DRValue}*
*DICOM* ▲ (${superior}): *$${DTtoDicomSuperior}*
*DICOM* ▼ (${inferior}): *$${DTtoDicomInferior}*`
        bot.sendMessage(msg.chat.id, text, {parse_mode: "markdown"})
    })
})

bot.onText(/^\/dicom(?:@(?:nogubot|mujabot|elmejorrobot))?$/i, msg=>{
    dt().then(res=>{
        const superior = db.dicom.superior
        const inferior = db.dicom.inferior
        const text = `Las bandas actuales* de DICOM son:
Superior: ${superior}
Inferior: ${inferior}

*Tomar en cuenta que estas bandas son introducidas manualmente.`
        bot.sendMessage(msg.chat.id, text)
    })
})

bot.onText(/^\/dolardicom(?:@(?:nogubot|mujabot|elmejorrobot))? ([0-9.]+)/i, (msg, match)=>{
    if (Number(match[1]) !== NaN) {
        const userInput = Number(match[1])
        const dsup = round(db.dicom.superior * userInput)
        const dinf = round(db.dicom.inferior * userInput)
        const bsup = db.dicom.superior
        const binf = db.dicom.inferior
        const text = `Cantidad del usuario: $${round(userInput)}
*DICOM* ▲ (${bsup}): *Bs. ${dsup}*
*DICOM* ▼ (${binf}): *Bs. ${dinf}*`
        bot.sendMessage(msg.chat.id, `$1 = Bs. ${dtusd}`, {parse_mode: "markdown"})
    } else {
        bot.sendMessage(msg.chat.id, "Usa un número válido (p. ej. `\/dolardicom 1252.08`) o manda \/dolardicom sin nada a la derecha.", {
            parse_mode: "markdown",
            reply_to_message: msg.message_id
        })
    }
})

bot.onText(/^\/bolivardicom(?:@(?:nogubot|mujabot|elmejorrobot))? ([0-9.]+)/i, (msg, match)=>{
    if (Number(match[1]) !== NaN) {
        const userInput = Number(match[1])
        const dsup = round(userInput / db.dicom.superior)
        const dinf = round(userInput / db.dicom.inferior)
        const bsup = db.dicom.superior
        const binf = db.dicom.inferior
        const text = `Cantidad del usuario: Bs. ${round(userInput)}
*DICOM* ▲ (${bsup}): *$${dsup}*
*DICOM* ▼ (${binf}): *$${dinf}*`
        bot.sendMessage(msg.chat.id, `$1 = Bs. ${dtusd}`, {parse_mode: "markdown"})
    } else {
        bot.sendMessage(msg.chat.id, "Usa un número válido (p. ej. `\/bolivardicom 1252.08`) o manda \/bolivardicom sin nada a la derecha.", {
            parse_mode: "markdown",
            reply_to_message: msg.message_id
        })
    }
})

bot.onText(/^\/bolivar(?:@(?:nogubot|mujabot|elmejorrobot))?$/i, msg=>{
    dt().then(res=>{
        const dtusd = 1 / res.USD.dolartoday
        bot.sendMessage(msg.chat.id, `Bs. 1 = $${dtusd}`)
    })
})

bot.onText(/^\/bolivar(?:@(?:nogubot|mujabot|elmejorrobot))? ([0-9.]+)/i, (msg, match)=>{
    if (Number(match[1]) !== NaN) {
        dt().then(res=>{
            const userInput = Number(match[1])
            const dtusd = round(userInput / res.USD.dolartoday)
            bot.sendMessage(msg.chat.id, `Bs. ${round(userInput)} = $${dtusd}`)
        })
    } else {
        bot.sendMessage(msg.chat.id, "Usa un número válido (p. ej. `\/bolivar 1252.08`) o manda \/bolivar sin nada a la derecha.", {
            parse_mode: "markdown",
            reply_to_message: msg.message_id
        })
    }
})

bot.onText(/^\/bandas(?:@(?:nogubot|mujabot|elmejorrobot))? ([0-9.]+) ([0-9.]+)/i, (msg, match)=>{
    if (msg.from.id === 237799109 || msg.from.id === 383986968) {
        if (Number(match[1]) !== NaN && Number(match[2]) !== NaN && Number(match[1]) > Number(match[2])) {
            db.dicom.superior = match[1]
            db.dicom.inferior = match[2]
            fs.writeFile('shittydb', JSON.stringify(dicom, null, 2), function(err) {
                if (err) {
                    bot.sendMessage(msg.chat.id, "Hubo un error modificando las bandas")
                } else {
                    bot.sendMessage(msg.chat.id, `Las nuevas bandas son
    Superior: ${db.dicom.superior}
    Inferior: ${db.dicom.inferior}`
                    )
                }
            })
        } else if (Number(match[1]) !== NaN && Number(match[2]) !== NaN && Number(match[1]) < Number(match[2])) {
            bot.sendMessage(msg.chat.id, "Recuerda que es `\/bandas sup inf` (p. ej. `\/bandas 2640 2010`).")
        } else {
            bot.sendMessage(msg.chat.id, "Usa números válidos (p. ej. `\/bandas 2640 2010`). Orden descendiente.")
        }
    } else {
        bot.sendMessage(msg.chat.id, "Solo @SantiagoLaw y @Bestulo están autorizados a cambiar las bandas. Contacta a uno de ellos si hace falta actualizarlas.")
    }
})

function api (method, form) {
    const opts = {
        url: `${apiBaseUrl}${token}/${method}`,
        form: form
    }
    return rp.post(opts).then(data=>{
        const res = JSON.parse(data)
        if (res.ok === false){throw res;}
        else {return res}
    })
}

bot.deleteMessage = function(chatId, msgId) {
    const form = {
        chat_id: chatId,
        message_id: msgId
    }
    return api('deleteMessage', form).catch(err=>{
        bot.sendMessage(237799109, JSON.stringify(err, null, 4))
    })
}

function del(msg) {
    if (msg.chat.type !== "private") {
        bot.deleteMessage(msg.chat.id, msg.message_id)
    }
}

bot.onText(/^\/bdsm(?:@(?:nogubot|mujabot|elmejorrobot))? (\S+)/, (msg, match)=> {
    sendUrl(chatId('bdsm'), match[1])
    del(msg)
})

bot.onText(/^\/file(?:@(?:nogubot|mujabot|elmejorrobot))? (\S+)/, (msg, match)=> {
    sendUrl(msg.chat.id, match[1])
    del(msg)
})

bot.onText(/^\/to(?:@(?:nogubot|mujabot|elmejorrobot))? @?(-?[0-9]+|\w+) (\S+)/, (msg, match)=> {
    let chatId = chatId(match[1])
    sendUrl(chatId, match[2])
    del(msg)
})

bot.onText(/^\/file(?:@(?:nogubot|mujabot|elmejorrobot))?$/, (msg)=> {
    if (msg.reply_to_message && /http\S+/gi.test(msg.reply_to_message.text)) {
        const replyId = msg.reply_to_message.message_id
        const url = msg.reply_to_message.text.match(/http\S+/gi)[0]
        console.log(url)
        sendUrl(msg.chat.id, url, replyId)
        del(msg)
    }
})

function chatId(thing) {
    let chatId;
    switch(thing) {
        case 'darwin':
            chatId = -1001110036651
            break;
        case 'macedonia':
            chatId = -19296709;
            break;
        case 'bdsm':
            chatId = -1001067246661;
            break;
        case 'private':
            chatId = msg.from.id;
            break;
        default:
            chatId = thing
            break;
    }
    return chatId
}

function sendUrl(chatId, url) {
    if (/https?:\/\/(?:www|fat)?\.?gfycat.com\/(?:gifs\/detail\/)?(\w+)(?:$|\/$|\.webm$)/.test(url)) {
        const gfyId = url.match(/https?:\/\/(?:www|fat)?\.?gfycat.com\/(?:gifs\/detail\/)?(\w+)(?:$|\/$|\.webm$)/)[1]
        url = `https://thumbs.gfycat.com/${gfyId}-mobile.mp4`
        console.log(url)
        return bot.sendVideo(chatId, url)
    }
    if (/http.+\.(?:jpg|png|jpeg)/gi.test(url)) {
        return bot.sendPhoto(chatId, url)
    }
    if (/http.+\.(?:gif|mp4)$/gi.test(url)) {
        return bot.sendVideo(chatId, url)
    }
    if (/http.+\.(?:gifv)/gi.test(url)) {
        const newurl = url.substring(0, url.length - 4) + "mp4"
        console.log(newurl)
        return bot.sendVideo(chatId, newurl)
    }
    if (/http.+\.(?:zip|pdf|epub|txt)$/gi.test(url)) {
        return bot.sendDocument(chatId, url)
    }
}

bot.onText(/^\/math(?:@(?:nogubot|mujabot|elmejorrobot))? ([\s\S]+)/gi, (msg, match)=>{
    const result = math.eval(match[1])
    const text = `Operation:
<code>${match[1]}<\/code>

Result:
<code>${result}<\/code>`
    bot.sendMessage(msg.chat.id, text, {parse_mode: "HTML"})
})

bot.onText(/^\/habla(?:@(?:nogubot|mujabot|elmejorrobot))?? (.+)/, (msg, match)=>{
    const text = match[1]
    tuser.post('statuses/update', {
        status: text
    }).then(tweet=>{
        console.log("Tweeted: " + tweet.text)
        bot.sendMessage(msg.chat.id, `enviado: https://twitter.com/El_MPJ/status/${tweet.id_str}`)
    }).catch(err=>{
        bot.sendMessage(msg.chat.id, "Ocurrió un error y no pude tuitear eso.")
    })
})

bot.onText(/^\/habla(?:@(?:nogubot|mujabot|elmejorrobot))?$/, msg=>{
    if(msg.reply_to_message && msg.reply_to_message.text) {
        console.log('reply triggered')
        const text = msg.reply_to_message.text
        tuser.post('statuses/update', {
            status: text
        }).then(tweet=>{
            bot.sendMessage(msg.chat.id, `enviado: https://twitter.com/El_MPJ/status/${tweet.id_str}`)
            console.log("Tweeted: " + tweet.text)
        }).catch(err=>{
            bot.sendMessage(msg.chat.id, "Ocurrió un error y no pude tuitear eso.")
        })
    } else if (msg.reply_to_message && !msg.reply_to_message.text) {
        bot.sendMessage(msg.chat.id, "Sólo puedo tuitear textos por ahora.")
    }
})

bot.onText(/^\/etiquetar(?:@(?:nogubot|mujabot|elmejorrobot))? ([\s\S]+)/, (msg, match)=>{
    if (db.tags.taggers.includes(msg.from.id)) {
        const text = db.tags.tagged.join(" ") + `\n\n${match[1]}`
        bot.sendMessage(msg.chat.id, text)
    }
});

bot.onText(/^\/etiquetar(?:@(?:nogubot|mujabot|elmejorrobot))?$/, (msg, match)=>{
    if (db.tags.taggers.includes(msg.from.id)) {
        const text = db.tags.tagged.join(" ")
        const args = [msg.chat.id, text]
        if (msg.reply_to_message) {
            args.push({reply_to_message_id: msg.reply_to_message.message_id})
        }
        bot.sendMessage(...args)
    }
});

bot.onText(/^\/agregar(?:@(?:nogubot|mujabot|elmejorrobot))? ([\s\S]+)/, (msg, match)=>{
    if (db.tags.taggers.includes(msg.from.id)) {
        const newTags = match[1].split(" ")
        const newArr = _.uniq(_.concat(db.tags.tagged, newTags))
        console.log(newArr)
        db.tags.tagged = newArr
        const textTags = "`" + newArr.join(" ") + "`"
        fs.writeFile("shittydb", JSON.stringify(db, null, 2), function(err) {
            if (err) {
                bot.sendMessage(msg.chat.id, "Hubo un error modificando las etiquetas")
            } else {
                const text = `Las etiquetas ahora son: ${textTags}`
                bot.sendMessage(msg.chat.id, text, {parse_mode:"markdown"})
            }
        })
    }
});

bot.onText(/^\/quitar(?:@(?:nogubot|mujabot|elmejorrobot))? ([\s\S]+)/, (msg, match)=>{
    if (db.tags.taggers.includes(msg.from.id)) {
        const tagsToRemove = match[1].split(" ")
        const newArr = _.difference(db.tags.tagged, tagsToRemove)
        db.tags.tagged = newArr
        const textTags = "`" + newArr.join(" ") + "`"
        const text = `Las etiquetas ahora son: \`${textTags}\``
        fs.writeFile("shittydb", JSON.stringify(db, null, 2), function(err) {
            if (err) {
                bot.sendMessage(msg.chat.id, "Hubo un error modificando las etiquetas")
            } else {
                const text = `Las etiquetas ahora son: ${textTags}`
                bot.sendMessage(msg.chat.id, text, {parse_mode:"markdown"})
            }
        })
    }
});