
const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017';
const dbName = 'accubot';

/**
 * Core bot logic goes here!
 */
// BEGIN EDITING HERE!
console.log('hi');

MongoClient.connect(url, function (err, client) {
    console.log('test');

    const db = client.db(dbName);
    if (err) {
        console.log(err);
    }
    // bot.say({ text: `You tried to give ${message.match.length} users some :pizza: but I don't have any to give yet!`, channel: message.channel });

    // if (err) {
    //     console.log(err);
    //     return;
    // }

    // console.log('hi');
    const collection = db.collection('employees');
    collection.insertOne({
        employeeId: 4,
        employeeName: 'test'
    }, (err, result) => {
        console.log(err, result);
    })
    // const employee = collection.findOne({ userId: user });
    // console.log('test', employee);
});