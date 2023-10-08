import Redis from "ioredis"
import { WebSocketServer } from 'ws';

import startAPI from './api.mjs'
import bot from "./bot.mjs"
import db from "./utils/db.mjs";

import { tokens, botIDs } from "/static/config.mjs"

// init db
db`INSERT INTO stats (count, id) VALUES (0, 'shrimps') ON CONFLICT (id) DO NOTHING`.catch(err=>{})

const ioredis = new Redis(6379, process.env.NODE_ENV === "production" ? "shrimpcache" : "127.0.0.1");
const stream = ioredis.scanStream({
    match: 'shrimpGuild:*'
});

await new Promise((resolve, reject) => {
    stream.on('data', function (keys) {
        if (keys.length) {
            const pipeline = ioredis.pipeline();
            keys.forEach(function (key) {
                pipeline.del(key);
            });

            pipeline.exec();
        }
    });

    stream.on('end', resolve);
})
function delay(t, data) {
    return new Promise(resolve => {
        setTimeout(resolve, t, data);
    });
}


const botsArray = []
for (let index = 0; index < botIDs.length; index++) {
    const botInstance = new bot({
        botID: botIDs[index],
        token: tokens[index]
    })

    botInstance.connect()
    botsArray.push(botInstance)

    await delay(1000*5)
}

const expandedAPI = new startAPI(botsArray)
const API = expandedAPI.start()

const wss = new WebSocketServer({
    server: API.server,
    path: "/ws"
});

const subscribeRedis = new Redis(6379, process.env.NODE_ENV === "production" ? "shrimpcache" : "127.0.0.1");

subscribeRedis.subscribe("newShrimp");
subscribeRedis.on("message", async (channel, message) => {
    switch (channel){
        case "newShrimp": {
            const shrimpCount = await db`UPDATE stats SET count = count+1 WHERE id = 'shrimps' RETURNING count`.catch(err=>{})
            Array.from(wss.clients).map(client => {
                if (client.readyState === 1) client.send(shrimpCount[0].count);
            })
        }
        break;
    }
});