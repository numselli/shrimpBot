import { Client } from "oceanic.js"

const shrimpChars = ["s", "h", "r", "i", "m", "p"]

export default class shrimpBot{
    #client
    constructor(clientInfo){
        this.id = clientInfo.botID
        
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
                        this.#client.rest.channels.createReaction(packet.d.channel_id, packet.d.id, "🦐").catch((e)=>{
                            console.log(e)
                        });

                        // brodcast new shrimp
                        process.emit("newShrimp")

                        if (packet.d.author.id === this.id) return;

                        this.#client.rest.channels.createMessage(packet.d.channel_id, {
                            messageReference: {
                                messageID: packet.d.id
                            },
                            content: `The main shrimp bot has now been verified. Please kick this bot and [invite the main bot](https://discord.com/oauth2/authorize?client_id=1042495791694086194&permissions=65600&scope=bot).`
                        }).catch(()=>{});
                    }
                    break;
                }
                case "INTERACTION_CREATE": {
                    process.emit("newCommand", {name: packet.d.data.name})

                    switch (packet.d.data.name){
                        case "shrimpcount": {
                            process.once("getShrimpsResponse", (d)=>{
                                this.#client.rest.interactions.createInteractionResponse(packet.d.id, packet.d.token, { type: 4, data: {"embeds": [{"description": `[${d.toLocaleString()} shrimps captured.](https://shrimp.numselli.xyz)`, "color": 16742221}]}}).catch(()=>{});
                            })

                            process.emit("getShrimps")
                        }
                        break;
                    }
                    break;
                }
            }
        })
    }

    connect(){
        this.#client.connect()
    }
}