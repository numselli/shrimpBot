import { WebSocketServer } from 'ws';

import startAPI from './api.mjs'
import bot from "./bot.mjs"
import db from "./utils/db.mjs";

import { tokens, botIDs } from "/static/config.mjs"

// init db
db`INSERT INTO stats (count, id) VALUES (0, 'shrimps') ON CONFLICT (id) DO NOTHING`.catch(err=>{})

const guildMap = new Map();

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

process.on("newShrimp", async() => {
    const shrimpCount = await db`UPDATE stats SET count = count+1 WHERE id = 'shrimps' RETURNING count`.catch(err=>{})
    Array.from(wss.clients).map(client => {
        if (client.readyState === 1) client.send(shrimpCount[0].count);
    })
})
process.on("guildRemove", (data) => {
    guildMap.delete(data.guildID)
})
process.on("guildAdd", (data) => {
    guildMap.set(data.guildID, data.botID)
})
process.on("shouldLeaveGuild", (data) => {
    const hasGuild = guildMap.has(data.guildID)
    const guildData = guildMap.get(data.guildID)
    
    process.emit("shouldLeaveGuildResponse", {guildID: data.guildID, botID: data.botID, decision: hasGuild && data.botID !== guildData})
})