import { Client } from "oceanic.js"
import Redis from "ioredis"

const shrimpChars = ["s", "h", "r", "i", "m", "p"]

export default class shrimpBot{
    #client
    #redisPub
    #redisCache
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

        this.#redisPub = new Redis(6379, process.env.NODE_ENV === "production" ? "shrimpcache" : "127.0.0.1");
        this.#redisCache = new Redis(6379, process.env.NODE_ENV === "production" ? "shrimpcache" : "127.0.0.1");

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
            console.error("Something went wrong:", error);
        });

        this.#client.on("packet", async(packet) => {
            // console.log(packet.t)
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
                        this.#redisPub.publish("newShrimp", "") 
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
                    const redisData = await this.#redisCache.get(`shrimpGuild:${packet.d.id}`);
                    if (redisData && packet.d.id !== redisData) return await this.#client.rest.users.leaveGuild(packet.d.id)

                    this.guildCount++;

                    this.#redisCache.set(`shrimpGuild:${packet.d.id}`, this.id)

                    break;
                }
                case "GUILD_DELETE":{
                    this.guildCount--;

                    this.#redisCache.del(`shrimpGuild:${packet.d.id}`)
                    break;
                }
            }
        })
    }

    connect(){
        this.#client.connect()
    }
}