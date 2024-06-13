import { WebSocketServer } from 'ws';
import Database from 'better-sqlite3';
import { schedule } from 'node-cron';
import { Client } from "oceanic.js"

import path from 'path'
import fastify from "fastify";
import fastifyStatic from '@fastify/static'
import fastifyView from '@fastify/view';
import ejs from 'ejs'

import { tokens, botIDs, statKey, siteHost } from "/static/config.mjs"


import bot from './bot.mjs'

// init db
const db = new Database("/static/database.db");
try {
    db.prepare('CREATE TABLE IF NOT EXISTS stats (id TEXT NOT NULL PRIMARY KEY, count INTEGER) WITHOUT ROWID').run()
    db.prepare('INSERT INTO stats (id, count) VALUES (@id, @count)').run({
        id: "shrimps",
        count: 0
    })
} catch (error) {
    console.log("table failed to create")
    console.log(error)
}

// legacy
const botsArray = []
process.on("newShrimp", async() => {
    db.prepare('UPDATE stats SET count = count+1 WHERE id = @id').run({
        id: "shrimps",
    })
})
process.on("getShrimps", () => {
    const count = db.prepare('SELECT count FROM stats').all()[0].count
    
    process.emit("getShrimpsResponse", count)
})
function delay(t, data) {
    return new Promise(resolve => {
        setTimeout(resolve, t, data);
    });
}
for (let index = 0; index < botIDs.length; index++) {
    if (index !== 0){
        const botInstance = new bot({
            botID: botIDs[index],
            token: tokens[index]
        })
    
        botInstance.connect()
        botsArray.push(botInstance)
    
        await delay(1000*10)
    }
}


// main bot
const commandMap = new Map();
const API = fastify();

const getShrimps = () => db.prepare('SELECT count FROM stats').all()[0].count

// register the static plugin for hosting static assets
API.register(fastifyStatic, {
    root: path.resolve("./site/assets/"),
    prefix: '/static/'
})

// use ejs for templating
API.register(fastifyView, {
    engine: {
        ejs
    },
});

// listen to get requests on /
API.get("/", (req, reply) => {
    // render and send main page
    reply.view("/site/templates/index.ejs", { count: getShrimps(), host: siteHost});
});

// render and send privacy page
API.get("/privacy", (req, reply) => {
    reply.view("/site/templates/privacy.ejs", {host: siteHost});
});

API.get("/invite", (req, reply) => {
    reply.redirect('https://stackoverflow.com/')
});

// robots.txt file
API.get('/robots.txt', (req, reply) => {
    reply.send(`
    user-agent: *
    Disallow: /assets/
    `)
})

// send 404 page for all other pages
API.get("/*", (req, reply) => {
    reply.view("/site/templates/404.ejs", {host: siteHost});
});

API.listen({ port: 8114, host: "0.0.0.0" }, (err, address) => {
    console.log(`API live on 0.0.0.0:8114`)
    if (err) throw err
});


const wss = new WebSocketServer({
    server: API.server,
    path: "/ws"
});


const shrimpChars = ["s", "h", "r", "i", "m", "p"]

// create the discord client
const client = new Client({
    auth: tokens[0],
    // disableCache: "no-warning",
    collectionLimits: {
        auditLogEntries: 0,
        members: 0,
        messages: 0,
        users: 0
    },
    gateway: {
        intents: ["GUILDS", "GUILD_MESSAGES", "MESSAGE_CONTENT"]
    }
});

// every time the bot turns ready
client.on("ready", () => {
    client.editStatus("dnd");
});

// the first time the bot is ready
client.once("ready", async() => {
    // create shrimpcount slash command
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

client.on("packet", async(packet) => {
    switch (packet.t){
        // when a message is sent check if the message includes the letters of shrimp
        case "MESSAGE_CREATE": {
            // convert the message to lower case
            const lowerMsg = packet.d.content.toLowerCase()

            // check if the message has the letters
            if (shrimpChars.every(char=>lowerMsg.includes(char))){
                // if it has the letters add the reaction
                client.rest.channels.createReaction(packet.d.channel_id, packet.d.id, "🦐").catch(()=>{});

                // brodcast new shrimp
                db.prepare('UPDATE stats SET count = count+1 WHERE id = @id').run({
                    id: "shrimps",
                })

                const count = getShrimps()
                Array.from(wss.clients).map(client => {
                    if (client.readyState === 1) client.send(count);
                })
            }
            break;
        }
        case "INTERACTION_CREATE": {
            switch (packet.d.data.name){
                case "shrimpcount": {
                    const shrimps = getShrimps()

                    client.rest.interactions.createInteractionResponse(packet.d.id, packet.d.token, { type: 4, data: {"embeds": [{"description": `[${shrimps.toLocaleString()} shrimps captured.](https://shrimp.numselli.xyz)`, "color": 16742221}]}}).catch(()=>{});
                }
                break;
            }

            const currentCount = commandMap.get(data.name) ?? 0
            commandMap.set(data.name, (currentCount+1)) 
            break;
        }
    }
})

client.connect()


if (statKey !== ""){
    schedule('* * * * *', async () => {
        const shrimps = getShrimps()
        const req = await fetch(`https://statcord.com/api/bots/1042495791694086194/stats`, {
            method: "post",
            body: JSON.stringify({
                "guildCount": client.guilds.size,
                "customCharts": [
                    {
                        "id": "shrimpCount",
                        "data": {
                            "shrimps": shrimps
                        }
                    }
                ],
                "topCommands":  Array.from(commandMap, ([name, count]) => {
                    return {name, count};
                })
            }),
            headers: {
                "Content-Type": "application/json",
                'Authorization': statKey,
            }
        })

        commandMap.clear()
        console.log(`Stats post with response ${req.status}`)
    })
}