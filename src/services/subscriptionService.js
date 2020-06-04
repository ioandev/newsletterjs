class SubscriptionService {
    constructor(collection) {
        this.collection = collection;
    }

    async getAllSubscribers() {
        return this.collection.find().toArray()
    }

    async doesSubscriptionExist(email) {
        let record = await this.collection.findOne({
            email: email
        })
        return record != null
    }

    async insertSubscription(document) {
        return await this.collection.insertOne(document, {
            w: 1
        });
    }

    async removeSubscription(email) {
        return await this.collection.deleteOne({
            email: email,
        })
    }
}

export default SubscriptionService