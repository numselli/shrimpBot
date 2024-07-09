import { tokens, botIDs } from "/static/config.mjs"
import bot from './bot.mjs'

const botsArray = []

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

    botInstance.connectWS()
    botInstance.connect()
    botsArray.push(botInstance)

    await delay(1000*1)
}
