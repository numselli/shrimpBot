import { Client } from "oceanic.js"
import { Token } from "/static/config.mjs"

const client = new Client({
    auth: Token,
    gateway: {
        intents: ["GUILDS", "GUILD_MESSAGES", "MESSAGE_CONTENT"]
    }
});

client.on("ready", () => console.log("Ready as", client.user.tag));

// An error handler
client.on("error", (error) => {
    console.error("Something went wrong:", error);
});

const shrimpChars = ["s", "h", "r", "i", "m", "p"]
// Message Sent
client.on("messageCreate", (msg) => {
    const lowerMsg = msg.content.toLowerCase()
    if (shrimpChars.some(char=>lowerMsg.includes(char))){
        msg.createReaction("🦐").catch(err=>{})
    }
});

// Connect to Discord
client.connect();