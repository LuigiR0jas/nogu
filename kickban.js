'use strict';
const _ = require('underscore');
const token = "273509825:AAEoibz-8BTdv6UAMMzDIL_9XME6fHMCYbA";
const Tgfancy = require('tgfancy');
const bot = new Tgfancy(token, { polling: true });
// HTTP modules
const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const translate = require('node-google-translate-skidz');

function botAPI (...args) { //method, object, cb
    const methodName = args.shift();
    const callback = (typeof args[args.length - 1] === 'function') ? args.pop() : null;
    const object = (args.length > 0) ? args.shift() : null;
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

function report(msg, text) {
    bot.sendMessage(msg.chat.id, text, {parse_mode: "Markdown"});
}

bot.onText(/^\/kick|^\/ban/, msg => {
    if (msg.reply_to_message) {
        const user = msg.reply_to_message.from;
        botAPI("kickChatMember", {chat_id: msg.chat.id, user_id: user.id}, result => {
            if (result.ok === false) {
                bot.sendMessage(msg.chat.id, "I cannot kick that member.");
                console.log(result);
            } else {
                if (msg.text.startsWith("\/kick")) {
                    botAPI("unbanChatMember", {chat_id: msg.chat.id, user_id: user.id}, () => {
                        if (user.username !== undefined) {
                            var text = "I have kicked `" + user.first_name + "`" + " ( @" + user.username + " )";
                        } else {
                            text = "I have kicked `" + user.first_name + "`";
                        }
                        report(msg, text);
                    });
                } else {
                    if (user.username !== undefined) {
                        var text = "I have banned `" + user.first_name + "`" + " ( @" + user.username + " )";
                    } else {
                        text = "I have banned `" + user.first_name + "`";
                    }
                    report(msg, text);
                }
                console.log(result);
            }
        });
    }
});

console.log('bot on');