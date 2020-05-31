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

async function addSubscription(req, res) {
    const {name, email} = req.body;

    if (await this.subscriptionService.doesSubscriptionExist(email)) {
        throw `A subscription already exists for email address ${email}`
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

async function confirmSubscription(req, res) {
    const {thumbprint} = req.query;

    const record = await this.linkService.getConfirmationLinkByThumbprint(thumbprint)
    if (!record) {
        throw `No confirmation could be found for thumbprint ${thumbprint}. Either it never did, or it was used already.`
    }
    const email = record.email
    if (await this.subscriptionService.doesSubscriptionExist(email)) {
        console.warn(`Subscription already exists for email ${email}`)
        return
    }
    const name = record.name
    const document = {
        name,
        email,
        subscribed_at: new Date()
    };

    console.log(`Inserting new subscription for email ${email} and name ${name}`)
    await this.subscriptionService.insertSubscription(document)
    console.log(`Removing confirmation link for email ${email} and name ${name}`)
    await this.linkService.removeConfirmationLink(email)

    return {
        sucess: true
    }
}

async function removeSubscription(req, res) {
    const {thumbprint} = req.query;
    const record = await this.linkService.getUnsubscribeLinkByThumbprint(thumbprint)
    if (!record) {
        throw `No confirmation could be found for thumbprint ${thumbprint}. Either it never did, or it was used already.`
    }
    const email = record.email
    const name = record.name
    console.log(`Removing link for email ${email}`)
    await this.linkService.removeAllLinksForEmail(email)

    console.log(`Removing subscription for email ${email}`)
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
