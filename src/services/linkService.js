export const TYPE_CONFIRMATION = "confirmation"
export const TYPE_UNSUBSCRIBE = "unsubscribe"

class LinkService {
    constructor(collection) {
        this.collection = collection;
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

    async insertConfirmationLinkifNotAlreadyExists(email, document) {
        let record = await this.collection.findOne({
            email: email,
            type: TYPE_CONFIRMATION
        })
        if (record) {
            return record.thumbprint
        }

        document.type = TYPE_CONFIRMATION
        console.log(`Did not find a confirmation record for email ${email}, inserting one with thumprint ${document.thumbprint}`)
        await this.collection.insertOne(document, {
            w: 1
        })
        return document.thumbprint
    }

    async insertUnsubscribeLinkifNotAlreadyExists(email, document) {
        let findBy = {
            email: email,
            type: TYPE_UNSUBSCRIBE
        }
        let record = await this.collection.findOne(findBy)
        if (record) {
            return record.thumbprint
        }

        document.type = TYPE_UNSUBSCRIBE
        console.log(`Did not find an unsubscribe link for email ${email}, inserting one with thumprint ${document.thumbprint}`)
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