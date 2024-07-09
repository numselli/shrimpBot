import { Client } from "oceanic.js"
import WebSocket from 'ws';

const shrimpChars = ["s", "h", "r", "i", "m", "p"]

export default class shrimpBot{
    #client
    #ws
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
            this.#client.editStatus("idle");
        });

        // An error handler
        this.#client.on("error", (error) => {
            console.error("Something went wrong:", error);
        });

        this.#client.on("packet", async(packet) => {
            // when a message is sent check if the message includes the letters of shrimp
            if (packet.t !== "MESSAGE_CREATE") return;
           
            // convert the message to lower case
            const lowerMsg = packet.d.content.toLowerCase()

            // check if the message has the letters
            if (shrimpChars.every(char=>lowerMsg.includes(char))){
                // if it has the letters add the reaction
                this.#client.rest.channels.createReaction(packet.d.channel_id, packet.d.id, "🦐").catch((e)=>{
                    console.log(e)
                });

                // brodcast new shrimp
                this.sendWS()

                if (packet.d.author.id === this.id) return;

                this.#client.rest.channels.createMessage(packet.d.channel_id, {
                    messageReference: {
                        messageID: packet.d.id
                    },
                    content: `The main shrimp bot has now been verified. Please kick this bot and [invite the main bot](https://discord.com/oauth2/authorize?client_id=1042495791694086194&permissions=65600&scope=bot).`
                }).catch(()=>{});
            }
        })
    }

    connect(){
        this.#client.connect()
    }

    connectWS(){
        this.#ws = new WebSocket("ws://shrimpbot:8899")
        
        this.#ws.onclose = (e) => {
            console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
            setTimeout(() =>{
                this.connectWS()
            }, 1000);
        };
    
        this.#ws.onerror = (err)=> {
            console.error('Socket encountered error: ', err.message, 'Closing socket');
            this.#ws.close();
        };
    }

    sendWS(){
        if (this.#ws.readyState === 1) this.#ws.send("newShrimp")
    }
}