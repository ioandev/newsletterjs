'use strict'
import {
  generateConfirmationEmail,
  generateUnsubscribeFeedbackEmail
}
from '../emailGenerator'
import {
    subscription as subscriptionSchema,
    thumbprint as thumbprintSchema,
    sendEmailToSubscribers as sendEmailToSubscribersSchema
}
from './schemas'

module.exports = async function (fastify, opts) {
    fastify.post('/subscribe', {
        schema: subscriptionSchema
    }, addSubscription)
    fastify.get('/confirm', {
        schema: thumbprintSchema
    }, confirmSubscription)
    fastify.get('/unsubscribe', {
        schema: thumbprintSchema
    }, removeSubscription)
    fastify.post('/broadcast', {
        schema: sendEmailToSubscribersSchema
    }, sendEmailToSubscribers)
    
}

module.exports[Symbol.for('plugin-meta')] = {
    decorators: {
        fastify: [
            'uniqueThumbprintGenerator'
        ]
    }
}

async function addSubscription(req, reply) {
    const {name, email} = req.body;

    if (await this.subscriptionService.doesSubscriptionExist(email)) {
        reply
            .code(400)
            .send({
                error: `A subscription already exists for email address ${email}`
            })
        return
    }
    
    const anyExistingLinks = await this.linkService.findAny(email)
    console.log("anyExistingLinks", anyExistingLinks)
    const confirmThumbprint =
        await this.linkService.insertConfirmationLinkifNotAlreadyExists(email, {
            name,
            email,
            thumbprint: this.uniqueThumbprintGenerator()
        })
    const unsubscribeThumbprint =
        await this.linkService.insertUnsubscribeLinkifNotAlreadyExists(email, {
            name,
            email,
            thumbprint: this.uniqueThumbprintGenerator()
        })

    if (!anyExistingLinks) {
        const confirmLink = process.env.NEWSLETTER_CONFIRM_URL.replace("[THUMBPRINT]", confirmThumbprint)
        const unsubscribeLink = process.env.NEWSLETTER_UNSUBSCRIBE_URL.replace("[THUMBPRINT]", unsubscribeThumbprint)
        const emailGenerated = await generateConfirmationEmail(name, confirmLink, unsubscribeLink)
        await this.emailService.send(createFullToAddress(name, email), process.env.EMAIL_API_JOIN_SUBJECT, emailGenerated.text, emailGenerated.html)
    }

    return {
        success: true
    }
}

async function confirmSubscription(req, reply) {
    const {thumbprint} = req.query;

    const record = await this.linkService.getConfirmationLinkByThumbprint(thumbprint)
    if (!record) {
        let error = `No confirmation could be found for thumbprint ${thumbprint}. Either it never did, or it was used already.`
        req.log.warn(error)
        reply
            .code(400)
            .send({ error })
        return
    }
    const email = record.email
    if (await this.subscriptionService.doesSubscriptionExist(email)) {
        let error = `No confirmation could be found for thumbprint ${thumbprint}. Either it never did, or it was used already.`
        req.log.warn(error)
        await this.linkService.removeConfirmationLink(email)
        reply
            .code(400)
            .send({ error })
        return
    }
    const name = record.name
    const document = {
        name,
        email,
        subscribed_at: new Date()
    };

    req.log.info(`Inserting new subscription for email ${this.censorEmail(email)} and name ${name}`)
    await this.subscriptionService.insertSubscription(document)
    req.log.info(`Removing confirmation link for email ${this.censorEmail(email)} and name ${name}`)
    await this.linkService.removeConfirmationLink(email)

    return {
        success: true
    }
}
async function removeSubscription(req, reply) {
    const {
        thumbprint
    } = req.query;
    const record = await this.linkService.getUnsubscribeLinkByThumbprint(thumbprint)
    if (!record) {
        reply
            .code(400)
            .send({
                error: `No subscription could be found for thumbprint ${thumbprint}. Either it never did, or it was used already.`
            })
        return
    }
    const email = record.email
    const name = record.name
    req.log.info(`Removing link for email ${this.censorEmail(email)}`)
    await this.linkService.removeAllLinksForEmail(email)

    req.log.info(`Removing subscription for email ${this.censorEmail(email)}`)
    await this.subscriptionService.removeSubscription(email)

    const survey_link = process.env.UNSUBSCRIBE_FEEDBACK_URL
    const homepage_link = process.env.HOMEPAGE_URL
    const emailGenerated = await generateUnsubscribeFeedbackEmail(name, survey_link, homepage_link)
    await this.emailService.send(createFullToAddress(name, email), process.env.EMAIL_API_UNSUBSCRIBE_SUBJECT, emailGenerated.text, emailGenerated.html)

    return {
        success: true
    }
}

const cheerio = require('cheerio')
async function sendEmailToSubscribers(req, reply) {
    const {
        subject,
        text,
        html,
        utm_source,
        utm_medium,
        utm_campaign
    } = req.body;

    if (subject == null) {
        throw `subject could not be empty`
    }

    const subscribers = await this.subscriptionService.getAllSubscribers()
    req.log.info(`Sending broadcast to ${subscribers.length} subscribers`)
    for (const s of subscribers) {
        let to = createFullToAddress(s.name, s.email)
        let textParsed = text.replace("%name%", s.name)

        if (html != undefined) {
            let htmlParsed = html.replace("%name%", s.name)

            const $ = cheerio.load(htmlParsed, {
                withDomLvl1: false,
                normalizeWhitespace: false,
                xmlMode: true,
                decodeEntities: false
            })
            $('a').each((_, a) => {
                let query = {}
                if (utm_source != null)
                    query["utm_source"] = utm_source
                if (utm_medium != null)
                    query["utm_medium"] = utm_medium
                if (utm_campaign != null)
                    query["utm_campaign"] = utm_campaign

                if (Object.keys(query).length == 0) {
                    return;
                }
                a.attribs["href"] = this.urlHelper(a.attribs["href"], query)
            })

            await this.emailService.send(to, subject, textParsed, $.html())
            continue
        }

        await this.emailService.send(to, subject, textParsed)
    }

    return {
        success: true
    }
}

function createFullToAddress(name, email) {
    return `"${name}" <${email}>`
}
module.exports["modules"] = {
    addSubscription, confirmSubscription, removeSubscription, sendEmailToSubscribers
}