const {
    addSubscription,
    confirmSubscription,
    removeSubscription,
    sendEmailToSubscribers
} = require('./index').modules

import urlHelper from '../urlHelper'

import dotenv from 'dotenv'
import path from 'path'
const config = dotenv.config({
    path: path.resolve(process.cwd(), '.env.test')
}).parsed

describe("newsletter.index.js", () => {
    process.env.NEWSLETTER_CONFIRM_URL = "[THUMBPRINT]"
    process.env.NEWSLETTER_UNSUBSCRIBE_URL = "[THUMBPRINT]"

    let reply = {}
    let boundClass = {}
    let getBound = function(fn) {
        return fn.bind(boundClass)
    }
    let expectReplyToHaveBeenCalledOnce = function () {
        expect(reply.code).toHaveBeenCalledTimes(1);
        expect(reply.send).toHaveBeenCalledTimes(1);
    }
    let request = async function(f, o, reply) {
        let fBound = getBound(f)
        o.log = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        }
        return await fBound(o, reply)
    }

    beforeEach(() => {
        boundClass = {
            subscriptionService: {
                doesSubscriptionExist: jest.fn(),
                insertSubscription: jest.fn(),
                removeSubscription: jest.fn(),
                getAllSubscribers: jest.fn()
            },
            linkService: {
                insertConfirmationLinkifNotAlreadyExists: jest.fn(),
                insertUnsubscribeLinkifNotAlreadyExists: jest.fn(),
                getUnsubscribeLinkByThumbprint: jest.fn(),
                removeConfirmationLink: jest.fn(),
                removeAllLinksForEmail: jest.fn()
            },
            emailService: {
                send: jest.fn()
            },
            uniqueThumbprintGenerator: jest.fn().mockReturnValue("THUMBPRINT"),
            urlHelper: urlHelper,
            censorEmail: function(email) { return email }
        }

        reply = {
        }
        reply.code = jest.fn().mockReturnValue(reply)
        reply.send = jest.fn().mockReturnValue(reply)
    })

    describe("addSubscription", () => {
        it("returns http 400 if trying to add a subscription for what already exists", async () => {
            boundClass.subscriptionService.doesSubscriptionExist = jest.fn().mockReturnValue(true)
            await request(addSubscription, {
                body: {
                    name: "name1",
                    email: "name@example.com"
                }
            }, reply)
            expect(reply.code).toBeCalledWith(400)
            expect(reply.send).toBeCalledWith(expect.anything())
            expectReplyToHaveBeenCalledOnce()
        })

        it("inserts confirmation link, unsubscribe link, and it sends an email", async () => {
            boundClass.subscriptionService.doesSubscriptionExist = jest.fn().mockReturnValue(false)
            const result = await request(addSubscription, {
                body: {
                    name: "name1",
                    email: "name@example.com"
                }
            }, reply)
            expect(result).toStrictEqual({
                success: true
            })
            expect(boundClass.uniqueThumbprintGenerator).toHaveBeenCalledTimes(2)
            expect(boundClass.linkService.insertConfirmationLinkifNotAlreadyExists).toBeCalledWith("name@example.com", {
                "email": "name@example.com",
                "name": "name1",
                "thumbprint": "THUMBPRINT"
            })
            expect(boundClass.linkService.insertUnsubscribeLinkifNotAlreadyExists).toBeCalledWith("name@example.com", {
                "email": "name@example.com",
                "name": "name1",
                "thumbprint": "THUMBPRINT"
            })
            expect(boundClass.emailService.send).toBeCalledWith("\"name1\" <name@example.com>", process.env.EMAIL_API_JOIN_SUBJECT, expect.anything(), expect.anything())
        })
    })

    describe("confirmSubscription", () => {
        it("returns http 400 if trying to confirm subscription for a thumbprint that does not exist", async () => {
            boundClass.linkService.getConfirmationLinkByThumbprint = jest.fn().mockReturnValue(null)
            await request(confirmSubscription, {
                query: {
                    thumbprint: "name1"
                }
            }, reply)
            expect(reply.code).toBeCalledWith(400)
            expect(reply.send).toBeCalledWith(expect.anything())
            expectReplyToHaveBeenCalledOnce()
        })

        it("does not insert subscription if it already exists for this confirmation link (which shouldn't exist but it didn't get clean up properly)", async () => {
            boundClass.subscriptionService.doesSubscriptionExist = jest.fn().mockReturnValue(true)
            boundClass.linkService.getConfirmationLinkByThumbprint = jest.fn().mockReturnValue({
                "email": "name@example.com",
                "name": "name1",
                "thumbprint": "THUMBPRINT"
            })
            await request(confirmSubscription, {
                query: {
                    thumbprint: "name1"
                }
            }, reply)
            expect(boundClass.linkService.removeConfirmationLink).toBeCalledWith("name@example.com")
            expect(reply.code).toBeCalledWith(400)
            expect(reply.send).toBeCalledWith(expect.anything())
        })

        it("inserts subscription and it calls removeConfirmationLink", async () => {
            boundClass.linkService.getConfirmationLinkByThumbprint = jest.fn().mockReturnValue({
                "email": "name@example.com",
                "name": "name1",
                "thumbprint": "THUMBPRINT"
            })
            const result = await request(confirmSubscription, {
                query: {
                    thumbprint: "name1"
                }
            }, reply)
            expect(boundClass.subscriptionService.insertSubscription).toBeCalledWith({
                "email": "name@example.com",
                "name": "name1",
                "subscribed_at": expect.anything()
            })
            expect(boundClass.linkService.removeConfirmationLink).toBeCalledWith("name@example.com")
            expect(result).toStrictEqual({
                success: true
            })
        })
    })

    describe("removeSubscription", () => {
        it("returns http 404 if trying to unsubscribe with a thumbprint that does not exist", async () => {
            boundClass.linkService.getUnsubscribeLinkByThumbprint = jest.fn().mockReturnValue(null)
            await request(removeSubscription, {
                query: {
                    thumbprint: "name1"
                }
            }, reply)
            expect(reply.code).toBeCalledWith(400)
            expect(reply.send).toBeCalledWith(expect.anything())
            expectReplyToHaveBeenCalledOnce()
        })

        it("removes all linkes when unsubscribed, and the subscription itself", async () => {
            boundClass.linkService.getUnsubscribeLinkByThumbprint = jest.fn().mockReturnValue({
                "email": "name@example.com",
                "name": "name1",
                "thumbprint": "THUMBPRINT"
            })
            const result = await request(removeSubscription, {
                query: {
                    thumbprint: "name1"
                }
            }, reply)
            expect(boundClass.linkService.removeAllLinksForEmail).toBeCalledWith("name@example.com")
            expect(boundClass.subscriptionService.removeSubscription).toBeCalledWith("name@example.com")
            expect(result).toStrictEqual({
                success: true
            })
        })
    })

    describe("sendEmailToSubscribers", () => {
        it("sends email to all subscribers", async () => {
            boundClass.subscriptionService.getAllSubscribers = jest.fn().mockReturnValue([{
                "email": "name1@example.com",
                "name": "name1",
            }, {
                "email": "name2@example.com",
                "name": "name2",
            }, ])
            await request(sendEmailToSubscribers, {
                body: {
                    subject: "spring",
                    text: "TEXT",
                    html: "<b>TEXT</b>",
                }
            }, reply)
            expect(boundClass.emailService.send).toBeCalledWith("\"name1\" <name1@example.com>", "spring", "TEXT", "<b>TEXT</b>")
            expect(boundClass.emailService.send).toBeCalledWith("\"name2\" <name2@example.com>", "spring", "TEXT", "<b>TEXT</b>")
        })

        it("replaces the name of the subscriber", async () => {
            boundClass.subscriptionService.getAllSubscribers = jest.fn().mockReturnValue([{
                "email": "name1@example.com",
                "name": "name1",
            }])
            await request(sendEmailToSubscribers, {
                body: {
                    subject: "Random email",
                    text: "Hi %name%, how are you?",
                    html: "<b>Hi %name%, how are you?</b>",
                }
            }, reply)
            let to = "\"name1\" <name1@example.com>"
            let text = "Hi name1, how are you?"
            let html = `<b>${text}</b>`
            expect(boundClass.emailService.send).toBeCalledWith(to, "Random email", text, html)
        })

        it("adds campaign data to all links", async () => {
            boundClass.subscriptionService.getAllSubscribers = jest.fn().mockReturnValue([{
                "email": "name1@example.com",
                "name": "name1",
            }])
            await request(sendEmailToSubscribers, {
                body: {
                    subject: "paris",
                    text: "Hi %name%, how are you? Click Here [https://google.com/]",
                    html: "<b>Hi %name%, how are you? <a href=\"https://google.com/\">Click here</a></b>",
                    utm_source: "news",
                    utm_medium: "email",
                    utm_campaign: "spring-summer"
                }
            }, reply)
            let to = "\"name1\" <name1@example.com>"
            let text = "Hi name1, how are you? Click Here [https://google.com/]"
            let html = "<b>Hi name1, how are you? <a href=\"https://google.com/?utm_source=news&utm_medium=email&utm_campaign=spring-summer\">Click here</a></b>"
            expect(boundClass.emailService.send).toBeCalledWith(to, "paris", text, html)
        })

        it("adds campaign data to all links", async () => {
            boundClass.subscriptionService.getAllSubscribers = jest.fn().mockReturnValue([{
                "email": "name1@example.com",
                "name": "name1",
            }])
            await request(sendEmailToSubscribers, {
                body: {
                    subject: "Some email",
                    text: "Hi %name%, how are you? Click Here [https://google.com/]",
                    html: "<b>Hi %name%, how are you? <a href=\"https://google.com/\">Click here</a></b>",
                }
            }, reply)
            let to = "\"name1\" <name1@example.com>"
            let text = "Hi name1, how are you? Click Here [https://google.com/]"
            let html = "<b>Hi name1, how are you? <a href=\"https://google.com/\">Click here</a></b>"
            expect(boundClass.emailService.send).toBeCalledWith(to, "Some email", text, html)
        })
    })
})