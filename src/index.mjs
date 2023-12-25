import { WebSocketServer } from 'ws';
import Database from 'better-sqlite3';

import startAPI from './api.mjs'
import bot from "./bot.mjs"

import { tokens, botIDs } from "/static/config.mjs"

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


const guildMap = new Map();
const botsArray = []
const expandedAPI = new startAPI(botsArray)
const API = expandedAPI.start()
const wss = new WebSocketServer({
    server: API.server,
    path: "/ws"
});


process.on("newShrimp", async() => {
    db.prepare('UPDATE stats SET count = count+1 WHERE id = @id').run({
        id: "shrimps",
    })

    const count = db.prepare('SELECT count FROM stats').all()[0].count

    Array.from(wss.clients).map(client => {
        if (client.readyState === 1) client.send(count);
    })
})
process.on("getShrimps", () => {
    const count = db.prepare('SELECT count FROM stats').all()[0].count
    
    process.emit("getShrimpsResponse", count)
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


function delay(t, data) {
    return new Promise(resolve => {
        setTimeout(resolve, t, data);
    });
}

for (let index = 0; index < botIDs.length; index++) {
    const botInstance = new bot({
        botID: botIDs[index],
        token: tokens[index]
    })

    botInstance.connect()
    botsArray.push(botInstance)

    await delay(1000*10)
}