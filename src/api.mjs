// import deps
import path from 'path'
import fastify from "fastify";
import fastifyStatic from '@fastify/static'
import fastifyView from '@fastify/view';
import ejs from 'ejs'
import {siteHost} from '/static/config.mjs'

export default class api{
    constructor(botsArray){
        this.botsArray = botsArray,
        this.mainBotID = this.botsArray[0].botID

        // create a fastify webserver
        this.API = fastify();

        // register the static plugin for hosting static assets
        this.API.register(fastifyStatic, {
            root: path.resolve("./site/assets/"),
            prefix: '/static/'
        })

        // use ejs for templating
        this.API.register(fastifyView, {
            engine: {
                ejs
            },
        });

        // listen to get requests on /
        this.API.get("/", (req, reply) => {
            // get shrimp count from database
            process.once("getShrimpsResponse", (d)=>{
                // render and send main page
                reply.view("/site/templates/index.ejs", { count: d, host: siteHost, mainBotID: this.mainBotID });
            })

            process.emit("getShrimps")
        });

        // render and send privacy page
        this.API.get("/privacy", (req, reply) => {
            reply.view("/site/templates/privacy.ejs", {host: siteHost, mainBotID: this.mainBotID});
        });

        this.API.get("/invite", (req, reply) => {
            reply.view("/site/templates/invite.ejs", {bots: this.botsArray, host: siteHost, mainBotID: this.mainBotID});
        });

        // robots.txt file
        this.API.get('/robots.txt', (req, reply) => {
            reply.send(`
            user-agent: *
            Disallow: /assets/
            `)
        })

        // send 404 page for all other pages
        this.API.get("/*", (req, reply) => {
            reply.view("/site/templates/404.ejs", {host: siteHost, mainBotID: this.mainBotID});
        });
    }

    start(){
        this.API.listen({ port: 8114, host: "0.0.0.0" }, (err, address) => {
            console.log(`API live on 0.0.0.0:8114`)
            if (err) throw err
        });

        return this.API
    }
}