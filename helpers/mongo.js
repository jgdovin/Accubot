const { MongoClient } = require('mongodb');

const client = new MongoClient("mongodb://localhost:27017/?connectTimeoutMS=4000", { useUnifiedTopology: true });

const mongo = async options => {
    let collection;
    try {
        client.connect();
        const db = await client.db(options.db);
        collection = await db.collection(options.collection);
    } catch (err) {
        console.error(err);
    }
    return collection;
};

module.exports = {
    mongo
};