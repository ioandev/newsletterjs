const subscription = {
    body: {
        type: 'object',
        required: ['name', 'email'],
        properties: {
            name: {
                type: 'string',
                minLength: 3,
                maxLength: 144
            },
            email: {
                type: 'string',
                minLength: 6,
                maxLength: 255
            }
        },
        additionalProperties: false
    }
}

const thumbprint = {
    query: {
        thumbprint: { type: 'string' }
    }
}

const sendEmailToSubscribers = {
    body: {
        type: 'object',
        required: ['subject', 'text'],
        properties: {
            subject: {
                type: 'string',
                minLength: 3,
            },
            text: {
                type: 'string',
                minLength: 10,
            },
            html: {
                type: 'string',
                minLength: 10,
            },
            utm_source: {
                type: 'string',
            },
            utm_medium: {
                type: 'string',
            },
            utm_campaign: {
                type: 'string',
            }
        },
        additionalProperties: false
    }
}

export {
    subscription,
    thumbprint,
    sendEmailToSubscribers
}