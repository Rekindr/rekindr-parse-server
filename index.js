// Example express application adding the parse-server module to expose Parse
// compatible API routes.
const express = require('express');
const { ParseServer } = require('parse-server');
const path = require('path');

const DATABASE_URI = process.env.DATABASE_URI || process.env.MONGODB_URI;

if (!DATABASE_URI) {
    console.log('DATABASE_URI not specified, falling back to localhost.');
}

const api = new ParseServer({
    databaseURI: DATABASE_URI || 'mongodb://localhost:27017/dev',
    cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
    appId: process.env.APP_ID || 'rekindr',
    masterKey: process.env.MASTER_KEY || '', //Add your master key here. Keep it secret!
    // liveQuery: {
    //     classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
    // }
});

const app = express();

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
const MOUNT_PATH = process.env.PARSE_MOUNT || '/parse';
app.use(MOUNT_PATH, api);

// Parse Server plays nicely with the rest of your web routes
app.get('/', (req, res) => {
    res.status(200).send('I dream of being a website.  Please star the parse-server repo on GitHub!');
});

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
// app.get('/test', (req, res) => {
//     res.sendFile(path.join(__dirname, '/public/test.html'));
// });

const port = process.env.PORT || 1337;
const httpServer = require('http').createServer(app);
httpServer.listen(port, () => console.log('rekindr-parse-server running on port ' + port + '.'));

// This will enable the Live Query real-time server
// ParseServer.createLiveQueryServer(httpServer);
