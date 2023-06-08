// import libs
import { Client } from "oceanic.js"
import postgres from "postgres";
import path from 'path'
import fastify from "fastify";
import fastifyStatic from '@fastify/static'

// import config
import { Token, Postgrelogin } from "/static/config.mjs"

// connect to the database
const DB = postgres(
    {
        ...Postgrelogin,
        types: {
            rect: {
                to        : 1700,
                from      : [1700],
                serialize : x => '' + x,
                parse     : parseFloat
            }
        }
    }
)

// discord stuff
// create the discord client
const client = new Client({
    auth: Token,
    disableCache: "no-warning",
    gateway: {
        intents: ["GUILD_MESSAGES", "MESSAGE_CONTENT"]
    }
});

// every time the bot turns ready
client.on("ready", () => {
    // set the status to do not disturb
    client.editStatus("dnd");
});
// the first time the bot is ready
client.once("ready", async() => {
    // ensure that the shrimp stats row exists
    await DB`INSERT INTO stats (count, id) VALUES (0, 'shrimps') ON CONFLICT (id) DO NOTHING`.catch(err=>{})

    client.application.bulkEditGlobalCommands([
        {
            "name": "shrimpcount",
            "type": 1,
            "description": "The number of shrimps."
        }
    ])
});

// An error handler
client.on("error", (error) => {
    console.error("Something went wrong:", error);
});

// when a message is sent check if the message includes the letters of shrimp
const shrimpChars = ["s", "h", "r", "i", "m", "p"]
client.on("messageCreate", (msg) => {
    // convert the message to lower case
    const lowerMsg = msg.content.toLowerCase()

    // check if the message has the letters
    if (shrimpChars.every(char=>lowerMsg.includes(char))){
        // if it has the letters add the reaction
        msg.createReaction("🦐").catch(err=>{})

        // add one to the shrimp count
        DB`UPDATE stats SET count = count+1 WHERE id = 'shrimps'`.catch(err=>{})
    }
});

// when an interaction is created 
client.on("interactionCreate", async(interaction) => {
    switch (interaction.data.name){
        case "shrimpcount": {
            // get shrimp count from database
            const dbResult = await DB`SELECT count FROM stats WHERE id = 'shrimps'`.catch(err=>{})

            // format the number
            const count = (dbResult[0]?.count ?? 0).toLocaleString()
        
            // respond to the interaction
            interaction.createMessage({"embeds": [{"description": `[${count} shrimps.](https://shrimp.numselli.xyz)`, "color": 16742221}]}).catch(()=>{});
        }
        break;
    }
})

// Connect to Discord
client.connect();

// website stuff
// create a fastify webserver
const API = fastify();

// register the static plugin for hosting static assets
API.register(fastifyStatic, {
    root: path.resolve("./site/assets/"),
    prefix: '/static/'
})

// listen to get requests on /
API.get('/', async (request, reply) => {
    // get shrimp count from database
    const dbResult = await DB`SELECT count FROM stats WHERE id = 'shrimps'`.catch(err=>{})

    // format the number
    const count = (dbResult[0]?.count ?? 0).toLocaleString()

    // respond with the html page
    reply
    .code(200)
    .header('Content-Type', 'text/html; charset=utf-8')
    .send(`<head><title>${count} Shrimps</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="theme-color" content="#c16a4f"><link rel="icon" sizes="192x192" href="/static/img/shrimp.svg"><style>body{margin:0;width:100%;height:100%;display:flex;justify-content: center; align-items: center; font-family: 'Courier New', Courier, monospace;} .shrimp {width:2em;height:2em;vertical-align: middle;}</style></head><body><h1><span>${count}</span><img class="shrimp" src="/static/img/shrimp.svg"></h1></body>`)
})

// redirect /invite to the discord invite
API.get('/invite', async (request, reply) => {
    redirect(303, `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=65600&scope=bot`)
})

// start the web server
API.listen({ port: 8114, host: "0.0.0.0" }, (err, address) => {
    console.log(`API live on 0.0.0.0:8114`)
    if (err) throw err
});