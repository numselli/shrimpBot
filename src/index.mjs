import { WebSocketServer } from 'ws';
import Database from 'better-sqlite3';
import { schedule } from 'node-cron';
import { Client } from "oceanic.js"

import path from 'path'
import fastify from "fastify";
import fastifyStatic from '@fastify/static'
import fastifyView from '@fastify/view';
import ejs from 'ejs'
import rawBody from 'fastify-raw-body';

import verifyKey from './utils/verifyKey.mjs'

import { token, statKey, siteHost, PUBLIC_KEY } from "/static/config.mjs"

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


// main bot
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
await API.register(rawBody, { 
    runFirst: true, 
}); 

API.addHook("preHandler", async (request, response) => {
	// We don't want to check GET requests to our root url
	if (request.method === "POST") {
		const signature = request.headers["x-signature-ed25519"]; 
		const timestamp = request.headers["x-signature-timestamp"]; 
		const isValidRequest = await verifyKey(
			request.rawBody, 
			signature, 
			timestamp, 
			PUBLIC_KEY
		); 
		if (!isValidRequest) {
			return response.status(401).send("invalid request signature"); 
		} 
	} 
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

// render and send privacy page
API.get("/sitemap.xml", (req, reply) => {
    reply.header("content-type", "text/xml").send(`<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${siteHost}/</loc>
    </url>
    <url>
        <loc>${siteHost}/privacy</loc>
    </url>
    <url>
        <loc>${siteHost}/invite</loc>
    </url>
</urlset>`)
});

// redirect to bot invite
API.get("/invite", (req, reply) => {
    reply.redirect('https://discord.com/oauth2/authorize?client_id=1042495791694086194&permissions=65600&scope=bot')
});

// centrally handle interactions
API.post("/api/interactions", (req, reply) => {
    const message = req.body

    switch (message.type){
        case 1: {
            reply.status(200).send({
                type: 1
            });
        } break;
        case 2: {
            switch (message.data.name){
                case "shrimpcount": {
                    const shrimps = getShrimps()
                    reply.status(200).send({
                        type: 4, 
                        data: {
                            "embeds": [{"description": `[${shrimps.toLocaleString()} shrimps captured.](https://shrimp.numselli.xyz)`, "color": 16742221}]
                        }, 
                    }); 
                } break;
            }
        } break;
    }
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

const addShrimp = () => {
    // update shrimp count
    const row = db.prepare('UPDATE stats SET count = count+1 WHERE id = @id RETURNING count').get({
        id: "shrimps",
    })
    
    // brodcast new shrimp
    wss.clients.forEach(client=>{
        if (client.readyState === 1) client.send(row.count);
    })
}


const shrimpChars = ["s", "h", "r", "i", "m", "p"]

// create the discord client
const client = new Client({
    auth: token,
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
    // when a message is sent check if the message includes the letters of shrimp
    if (packet.t !== "MESSAGE_CREATE") return;
 
    // convert the message to lower case
    const lowerMsg = packet.d.content.toLowerCase()

    // check if the message has the letters
    if (!shrimpChars.every(char=>lowerMsg.includes(char))) return;

    // add shrimp reaction
    client.rest.channels.createReaction(packet.d.channel_id, packet.d.id, "🦐").catch(()=>{});

    // add shrimp count
    addShrimp()
})

// connect the discord client
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
                ]
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