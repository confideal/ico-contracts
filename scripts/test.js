require('babel-core/register');

process.env.NODE_ENV = 'test';

const Command = require("truffle-core/lib/command");


const command = new Command(require("truffle-core/lib/commands"));

const options = {
    logger: console
};

command.run('test', options, function (err) {
    if (err) {
        console.log(err);
    }
});
