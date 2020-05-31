import path from "path"
import fp from "fastify-plugin"
import LinkService from "./services/linkService"
import EmailService from "./services/emailService"
import SubscriptionService from "./services/subscriptionService"

const schema = {
    type: 'object',
    required: ['MONGODB_CONNECTION_STRING'],
    properties: {
        MONGODB_CONNECTION_STRING: {
            type: 'string'
        },
    },
    additionalProperties: false
}

function getSwaggerOptions() {
    return {
        routePrefix: '/swagger',
        exposeRoute: true,
        swagger: {
            info: {
                title: 'Newsletter service swagger',
                description: 'Subscribe to newsletter',
                version: '0.0.1'
            },
            host: `${process.env.HOSTNAME}:${process.env.PORT}`,
            schemes: ['http'],
            consumes: ['application/json'],
            produces: ['application/json']
        }
    }
}

async function connectToDatabases(fastify) {
    fastify
        // mongodb
        .register(require('fastify-mongodb'), {
            url: fastify.config.MONGODB_CONNECTION_STRING,
            useNewUrlParser: true
        })
}

async function decorateFastifyInstance(fastify) {
    const db = fastify.mongo.db

    const emailService = new EmailService()
    fastify.decorate('emailService', emailService)

    const linkCollection = await db.createCollection('links')
    const linkService = new LinkService(linkCollection)
    await linkService.ensureIndexes(db)
    fastify.decorate('linkService', linkService)

    const subscriptionCollection = await db.createCollection('subscriptions')
    const subscriptionService = new SubscriptionService(subscriptionCollection)
    fastify.decorate('subscriptionService', subscriptionService)
}

async function decorateErrorHandlers(fastify) {
    fastify.setErrorHandler(function (error, request, reply) {
        request.log.error(error)
        var statusCode = error.statusCode >= 400 ? error.statusCode : 500
        reply
            .code(statusCode)
            .type('text/plain')
            .send(statusCode >= 500 ? 'Internal server error' : "An error has occured.")
    })
    fastify.setNotFoundHandler(function (request, reply) {
        reply
            .code(404)
            .type('text/plain')
            .send('Not found!')
    })
}

function fastifyInitialiser(fastify, opts) {
    fastify
        // swagger
        .register(require('fastify-swagger'), getSwaggerOptions())
        
        .register(require('fastify-env'), { schema, data: [ opts ] })
        .register(fp(connectToDatabases))

        // DI
        .register(fp(decorateFastifyInstance))

        // Error handling
        .register(fp(decorateErrorHandlers))

        // APIs modules
        .register(require('./newsletter'), {
            prefix: '/api/newsletter'
        })
    
    fastify.ready(err => {
        if (err) throw err
        fastify.swagger()
    })
}

export default fastifyInitialiser