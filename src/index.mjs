import startBot from './bot.mjs'
import startAPI from './api.mjs'
import { WebSocketServer } from 'ws';

const API = startAPI()

const wss = new WebSocketServer({
    server: API.server,
    path: "/ws"
});
