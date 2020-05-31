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
    querystring: {
        thumbprint: { type: 'string' }
    }
}
export {
    subscription,
    thumbprint
}