export const TYPE_CONFIRMATION = "confirmation"
export const TYPE_UNSUBSCRIBE = "unsubscribe"


class LinkService {
    constructor(censorEmail, collection, log) {
        this.censorEmail = censorEmail
        this.collection = collection;
        this.log = log
    }

    async getConfirmationLinkByThumbprint(thumbprint) {
        return await this.collection.findOne({
            thumbprint,
            type: TYPE_CONFIRMATION
        })
    }

    async getUnsubscribeLinkByThumbprint(thumbprint) {
        return await this.collection.findOne({
            thumbprint,
            type: TYPE_UNSUBSCRIBE
        })
    }

    async findInCollection(email, type) {
        return await this.collection.findOne({
            email: email,
            type: type
        })
    }

    async findAny(email) {
        return await this.collection.findOne({
            email: email
        }) != null
    }

    async insertConfirmationLinkifNotAlreadyExists(email, document) {
        const record = await this.findInCollection(email, TYPE_CONFIRMATION)
        if (record) {
            return record.thumbprint
        }

        document.type = TYPE_CONFIRMATION
        this.log.info(`Did not find a confirmation record for email ${this.censorEmail(email)}, inserting one with thumprint ${document.thumbprint}`)
        await this.collection.insertOne(document, {
            w: 1
        })
        return document.thumbprint
    }

    async insertUnsubscribeLinkifNotAlreadyExists(email, document) {
        const record = await this.findInCollection(email, TYPE_UNSUBSCRIBE)
        if (record) {
            return record.thumbprint
        }

        document.type = TYPE_UNSUBSCRIBE
        this.log.info(`Did not find an unsubscribe link for email ${this.censorEmail(email)}, inserting one with thumprint ${document.thumbprint}`)
        await this.collection.insertOne(document, {
            w: 1
        })
        return document.thumbprint
    }

    async removeConfirmationLink(email) {
        return await this.collection.deleteOne({
            email: email,
            type: TYPE_CONFIRMATION
        })
    }

    async removeAllLinksForEmail(email) {
        return await this.collection.deleteMany({
            email: email
        })
    }
    
    async ensureIndexes (db) {
        await db.command({
            'collMod': this.collection.collectionName,
            validator: {
                email: { $type: 'string' },
                type: { $type: 'string' },
                thumbprint: { $type: 'string' },
            }
        })
        await this.collection.createIndex({ 'thumbprint': 1 }, {'unique': true})
    }
}

export default LinkService