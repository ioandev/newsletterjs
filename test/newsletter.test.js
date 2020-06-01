
import dotenv from 'dotenv'
import path from 'path'
const config = dotenv.config({
    path: path.resolve(process.cwd(), '.env.test')
}).parsed

jest.mock('@/src/services/emailService');

import example from '../src/fastifyInitialiser'
const MongoClient = require('mongodb').MongoClient
const Fastify = require('fastify')
import { parse } from 'node-html-parser';

// TODO: move Logger to a different file
function isJestRunningThisCode() {
    return process.env.JEST_WORKER_ID !== undefined;
}
function Logger(...args) {
  this.args = args;
}
if (isJestRunningThisCode()) {
    Logger.prototype.info = jest.fn()
    Logger.prototype.error = jest.fn()
    Logger.prototype.debug = jest.fn()
    Logger.prototype.fatal = jest.fn()
    Logger.prototype.warn = jest.fn()
    Logger.prototype.trace = jest.fn()
} else {
    Logger.prototype.info = function (msg) { console.log("myLogger", msg); };
    Logger.prototype.error = function (msg) { console.log("myLogger", msg); };
    Logger.prototype.debug = function (msg) { console.log("myLogger", msg); };
    Logger.prototype.fatal = function (msg) { console.log("myLogger", msg); };
    Logger.prototype.warn = function (msg) { console.log("myLogger", msg); };
    Logger.prototype.trace = function (msg) { console.log("myLogger", msg); };
}
Logger.prototype.child = function () { return new Logger() };

describe("newsletter integration tests", () => {
    let mongoClient = null
    let fastify = null
    beforeEach(async() => { 
        mongoClient = await MongoClient.connect(config.MONGODB_CONNECTION_STRING, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
        await mongoClient.db('test').dropDatabase()
        const myLogger = new Logger()

        fastify = Fastify({
            logger: myLogger
        })
        await example(fastify, process.env)
    })
    afterEach(async () => {
        mongoClient.close()
        fastify.close()
    })

    it("returns other than 200 http response", async () => {
        const invalidURLResponse = await fastify.inject({
            method: 'GET',
            url: '/api/newsletter/invalid',
        })
        expect(invalidURLResponse.statusCode).toBe(404)

        const invalidDataResponse = await fastify.inject({
            method: 'GET',
            url: '/api/newsletter/unsubscribe',
            query: {
                thumbprint: '0123456789012345678901234567890123456789'
            }
        })
        expect(invalidDataResponse.statusCode).toBe(400)
    })

    it("works on happy path", async () => {
        const subscribeResponse = await fastify.inject({
            method: 'POST',
            url: '/api/newsletter/subscribe',
            payload: {
                name: "Alexa",
                email: "alexa@google.com"
            }
        })
        expect(subscribeResponse.statusCode).toBe(200)

        const emailHtml = fastify.emailService.send.mock.calls[0][2]
        const root = parse(emailHtml)
        const confirmElement = root.querySelector('.confirm')
        const confirmThumbprint = confirmElement.getAttribute('href')
        const unsubscribeElement = root.querySelector('.unsubscribe')
        const unsubscribeThumbprint = unsubscribeElement.getAttribute('href')

        const confirmResponse = await fastify.inject({
            method: 'GET',
            url: '/api/newsletter/confirm',
            query: {
                thumbprint: confirmThumbprint
            }
        })
        expect(confirmResponse.statusCode).toBe(200)

        const unsubscribeResponse = await fastify.inject({
            method: 'GET',
            url: '/api/newsletter/unsubscribe',
            query: {
                thumbprint: unsubscribeThumbprint
            }
        })
        expect(unsubscribeResponse.statusCode).toBe(200)

        const emailHtml2 = fastify.emailService.send.mock.calls[1][2]
        const root2 = parse(emailHtml2)
        const surveyElement = root2.querySelector('.survey')
        const subscribeHrefLink = surveyElement.getAttribute('href')
        expect(subscribeHrefLink).toBe("https://unsubscribe_link")
    })
})