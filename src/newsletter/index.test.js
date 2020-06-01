const {
    addSubscription,
    confirmSubscription,
    removeSubscription
} = require('./index').modules

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
    let request = function(o) {
        o.log = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        }
        return o
    }

    beforeEach(() => {
        boundClass = {
            subscriptionService: {
                doesSubscriptionExist: jest.fn(),
                insertSubscription: jest.fn(),
                removeSubscription: jest.fn()
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
            uniqueThumbprintGenerator: jest.fn().mockReturnValue("THUMBPRINT")
        }

        reply = {
        }
        reply.code = jest.fn().mockReturnValue(reply)
        reply.send = jest.fn().mockReturnValue(reply)
    })

    describe("addSubscription", () => {
        it("returns http 400 if trying to add a subscription for what already exists", async () => {
            boundClass.subscriptionService.doesSubscriptionExist = jest.fn().mockReturnValue(true)
            var addSubscriptionBound = getBound(addSubscription)
            await addSubscriptionBound(request({
                body: {
                    name: "name1",
                    email: "name@example.com"
                }
            }), reply)
            expect(reply.code).toBeCalledWith(400)
            expect(reply.send).toBeCalledWith(expect.anything())
            expectReplyToHaveBeenCalledOnce()
        })

        it("inserts confirmation link, unsubscribe link, and it sends an email", async () => {
            boundClass.subscriptionService.doesSubscriptionExist = jest.fn().mockReturnValue(false)
            var addSubscriptionBound = getBound(addSubscription)
            const result = await addSubscriptionBound(request({
                body: {
                    name: "name1",
                    email: "name@example.com"
                }
            }), reply)
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
            expect(boundClass.emailService.send).toBeCalledWith("\"name1\" <name@example.com>", expect.anything(), expect.anything())
        })
    })

    describe("confirmSubscription", () => {
        it("returns http 400 if trying to confirm subscription for a thumbprint that does not exist", async () => {
            boundClass.linkService.getConfirmationLinkByThumbprint = jest.fn().mockReturnValue(null)
            var confirmSubscriptionBound = getBound(confirmSubscription)
            await confirmSubscriptionBound(request({
                query: {
                    thumbprint: "name1"
                }
            }), reply)
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
            var confirmSubscriptionBound = getBound(confirmSubscription)
            await confirmSubscriptionBound(request({
                query: {
                    thumbprint: "name1"
                }
            }), reply)
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
            var confirmSubscriptionBound = getBound(confirmSubscription)
            const result = await confirmSubscriptionBound(request({
                query: {
                    thumbprint: "name1"
                }
            }), reply)
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
            var removeSubscriptionBound = getBound(removeSubscription)
            await removeSubscriptionBound(request({
                query: {
                    thumbprint: "name1"
                }
            }), reply)
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
            var removeSubscriptionBound = getBound(removeSubscription)
            const result = await removeSubscriptionBound(request({
                query: {
                    thumbprint: "name1"
                }
            }), reply)
            expect(boundClass.linkService.removeAllLinksForEmail).toBeCalledWith("name@example.com")
            expect(boundClass.subscriptionService.removeSubscription).toBeCalledWith("name@example.com")
            expect(result).toStrictEqual({
                success: true
            })
        })
    })
})