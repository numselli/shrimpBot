// import deps
import { Client } from "oceanic.js"
import db from "./utils/db.mjs";

// import config
import { Token, botID } from "./static/config.mjs"

// discord stuff
// create the discord client
const client = new Client({
    auth: Token,
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
    await db`INSERT INTO stats (count, id) VALUES (0, 'shrimps') ON CONFLICT (id) DO NOTHING`.catch(err=>{})

    // create shrimpcount slash command
    client.rest.applicationCommands.bulkEditGlobalCommands(botID, [
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

const shrimpChars = ["s", "h", "r", "i", "m", "p"]

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
                
                // add one to the shrimp count
                const shrimpCount = await db`UPDATE stats SET count = count+1 WHERE id = 'shrimps' RETURNING count`.catch(err=>{})
                brodcastToWs(shrimpCount[0].count)
            }
            break;
        }
        case "INTERACTION_CREATE": {
            switch (packet.d.data.name){
                case "shrimpcount": {
                    // get shrimp count from database
                    const dbResult = await db`SELECT count FROM stats WHERE id = 'shrimps'`.catch(err=>{})
        
                    // format the number
                    const count = (dbResult[0]?.count ?? 0).toLocaleString()

                    // respond to the interaction
                    client.rest.interactions.createInteractionResponse(packet.d.id, packet.d.token, { type: 4, data: {"embeds": [{"description": `[${count} shrimps captured.](https://shrimp.numselli.xyz)`, "color": 16742221}]}}).catch(()=>{});
                }
                break;
            }
            break;
        }
    }
})



export default (ws) => {
    client.ws = ws
    // Connect to Discord
    client.connect();
}

// brodcast to everyone on the website that a new shrimp has been captured
const brodcastToWs = (count) => {
    Array.from(client.ws.clients).map(client => {
        if (client.readyState === 1) client.send(count);
    })
}