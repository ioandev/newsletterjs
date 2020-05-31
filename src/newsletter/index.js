'use strict'
import {
  generateConfirmationEmail,
  generateUnsubscribeFeedbackEmail
}
from '../emailGenerator'
import {
    subscription as subscriptionSchema,
    thumbprint as thumbprintSchema
}
from './schemas'
import randomstring from "randomstring"

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
    const confirmThumbprint =
        await this.linkService.insertConfirmationLinkifNotAlreadyExists(email, {
            name,
            email,
            thumbprint: generateThumbprint()
        })
    const unsubscribeThumbprint =
        await this.linkService.insertUnsubscribeLinkifNotAlreadyExists(email, {
            name,
            email,
            thumbprint: generateThumbprint()
        })
    const confirmLink = process.env.NEWSLETTER_CONFIRM_URL.replace("[THUMBPRINT]", confirmThumbprint)
    const unsubscribeLink = process.env.NEWSLETTER_UNSUBSCRIBE_URL.replace("[THUMBPRINT]", unsubscribeThumbprint)
    const emailGenerated = await generateConfirmationEmail(name, confirmLink, unsubscribeLink)
    await this.emailService.send(createFullToAddress(name, email), emailGenerated.text, emailGenerated.html)

    return {
        success: true
    }
}

async function confirmSubscription(req, reply) {
    const {thumbprint} = req.query;

    const record = await this.linkService.getConfirmationLinkByThumbprint(thumbprint)
    if (!record) {
        reply
            .code(404)
            .send({
                error: `No confirmation could be found for thumbprint ${thumbprint}. Either it never did, or it was used already.`
            })
        return
    }
    const email = record.email
    if (await this.subscriptionService.doesSubscriptionExist(email)) {
        req.log.warn(`Subscription already exists for email ${email}`)
        return
    }
    const name = record.name
    const document = {
        name,
        email,
        subscribed_at: new Date()
    };

    req.log.info(`Inserting new subscription for email ${email} and name ${name}`)
    await this.subscriptionService.insertSubscription(document)
    req.log.info(`Removing confirmation link for email ${email} and name ${name}`)
    await this.linkService.removeConfirmationLink(email)

    return {
        sucess: true
    }
}

async function removeSubscription(req, reply) {
    const {thumbprint} = req.query;
    const record = await this.linkService.getUnsubscribeLinkByThumbprint(thumbprint)
    if (!record) {
        reply
            .code(404)
            .send({
                error: `No subscription could be found for thumbprint ${thumbprint}. Either it never did, or it was used already.`
            })
        return
    }
    const email = record.email
    const name = record.name
    req.log.info(`Removing link for email ${email}`)
    await this.linkService.removeAllLinksForEmail(email)

    req.log.info(`Removing subscription for email ${email}`)
    await this.subscriptionService.removeSubscription(email)

    const survey_link = process.env.UNSUBSCRIBE_FEEDBACK_URL
    const homepage_link = process.env.HOMEPAGE_URL
    const emailGenerated = await generateUnsubscribeFeedbackEmail(name, survey_link, homepage_link)
    await this.emailService.send(createFullToAddress(name, email), emailGenerated.text, emailGenerated.html)

    return {
        sucess: true
    }
}

function generateThumbprint() {
    return randomstring.generate({
        length: 40,
        charset: 'alphabetic'
    });
}

function createFullToAddress(name, email) {
    return `"${name}" <${email}>`
}
