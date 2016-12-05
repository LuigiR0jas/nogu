'use strict';

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

Sticker.find({stickerKeyword: /[^\s]+/}, function (err, result) {
    if (err) {
        console.log(err);
    } else {
        result.forEach(function (x) {
            Sticker.update({_id: x._id}, {$push: {tags: x.stickerKeyword}}, function (err) {
                if (err){
                    console.log(err);
                } else {
                    console.log('Pushed kw ' + x.stickerKeyword + ' into tags of ' + x.stickerId);
                }
            });
        });
    }
});