import { Client } from "oceanic.js"
import db from './utils/db.mjs'

const shrimpChars = ["s", "h", "r", "i", "m", "p"]

export default class shrimpBot{
    #client
    constructor(clientInfo){
        this.id = clientInfo.botID
        this.guildCount = 0
        
        // create the discord client
        this.#client = new Client({
            auth: clientInfo.token,
            disableCache: "no-warning",
            gateway: {
                intents: ["GUILDS", "GUILD_MESSAGES", "MESSAGE_CONTENT"]
            }
        });

        // every time the bot turns ready
        this.#client.on("ready", () => {
            this.#client.editStatus("dnd");
        });

        // the first time the bot is ready
        this.#client.once("ready", async() => {
            // create shrimpcount slash command
            this.#client.rest.applicationCommands.bulkEditGlobalCommands(this.id, [
                {
                    "name": "shrimpcount",
                    "type": 1,
                    "description": "The number of shrimps."
                }
            ])
        });

        // An error handler
        this.#client.on("error", (error) => {
            if (error.message.includes("Server didn't acknowledge previous heartbeat"))  process.exit();

            console.error("Something went wrong:", error);
        });

        this.#client.on("packet", async(packet) => {
            switch (packet.t){
                // when a message is sent check if the message includes the letters of shrimp
                case "MESSAGE_CREATE": {
                    // convert the message to lower case
                    const lowerMsg = packet.d.content.toLowerCase()
        
                    // check if the message has the letters
                    if (shrimpChars.every(char=>lowerMsg.includes(char))){
                        // if it has the letters add the reaction
                        this.#client.rest.channels.createReaction(packet.d.channel_id, packet.d.id, "🦐").catch(()=>{});

                        // brodcast new shrimp
                        process.emit("newShrimp")
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
                            this.#client.rest.interactions.createInteractionResponse(packet.d.id, packet.d.token, { type: 4, data: {"embeds": [{"description": `[${count} shrimps captured.](https://shrimp.numselli.xyz)`, "color": 16742221}]}}).catch(()=>{});
                        }
                        break;
                    }
                    break;
                }
                case "GUILD_CREATE":{
                    process.emit("shouldLeaveGuild", {guildID: packet.d.id, botID: this.id})
                    break;
                }
                case "GUILD_DELETE":{
                    this.guildCount--;

                    process.emit("guildRemove", {guildID: packet.d.id})
                    break;
                }
            }
        })

        process.on("shouldLeaveGuildResponse", async(data) => {
            if (data,botID === this.id && decision) await this.#client.rest.users.leaveGuild(data.guildID);
        })
    }

    connect(){
        this.#client.connect()
    }
}