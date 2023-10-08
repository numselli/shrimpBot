// import deps
import path from 'path'
import fastify from "fastify";
import fastifyStatic from '@fastify/static'
import fastifyView from '@fastify/view';
import ejs from 'ejs'
import db from "./utils/db.mjs";
import {siteHost} from '/static/config.mjs'

export default class api{
    constructor(botsArray){
        this.botsArray = botsArray

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
        this.API.get("/", async(req, reply) => {
            // get shrimp count from database
            const dbResult = await db`SELECT count FROM stats WHERE id = 'shrimps'`.catch(err=>{})
            
            // render and send main page
            return reply.view("/site/templates/index.ejs", { count: dbResult[0]?.count, host: siteHost });
        });

        // render and send privacy page
        this.API.get("/privacy", (req, reply) => {
            reply.view("/site/templates/privacy.ejs", {host: siteHost});
        });

        this.API.get("/invite", (req, reply) => {
            reply.view("/site/templates/invite.ejs", {bots: this.botsArray, host: siteHost});
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
            reply.view("/site/templates/404.ejs", {host: siteHost});
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