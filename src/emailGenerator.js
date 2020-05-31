import pug from 'pug'
import htmlToText from 'html-to-text'

function generateConfirmationEmail(name, confirm_link, unsubscribe_link) {
    return getCompiledResultForFileName("confirmSubscription.pug", {
        name,
        confirm_link,
        unsubscribe_link
    });
}

function generateUnsubscribeFeedbackEmail(name, survey_link, homepage_link) {
    return getCompiledResultForFileName("unsubscribedFeedback.pug", {
        name,
        survey_link,
        homepage_link
    });
}

function getCompiledResultForFileName(fileName, data) {
    const compiledPug = getCompiledFile(fileName)

    const html = compiledPug(data);
    const text = htmlToText.fromString(html)

    return {
        text,
        html
    }
}

function getCompiledFile(fileName) {
    return pug.compileFile(__dirname + `/../templates/${fileName}`);
}

export {
    generateConfirmationEmail,
    generateUnsubscribeFeedbackEmail
}
