import {
    generateConfirmationEmail,
    generateUnsubscribeFeedbackEmail
}
from './emailGenerator'

describe("emailGenerator", () => {

    it("generateConfirmationEmail is consistent", () => {
        expect(generateConfirmationEmail("Alex Michael", "https://confirm_link", "https://unsubscribe_link")).toMatchSnapshot()
    })

    it("generateUnsubscribeFeedbackEmail is consistent", () => {
        expect(generateUnsubscribeFeedbackEmail("Alex Michael", "https://survey_link", "https://homepage_link")).toMatchSnapshot()
    })
})