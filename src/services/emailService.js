import axios from 'axios'

class EmailService {
    constructor() {}

    async send(to, text, html) {
        let data = {
            subject: process.env.EMAIL_API_SUBJECT,
            from: process.env.EMAIL_API_FROM,
            to,
            text,
            html
        }

        console.log("Going to send an email..", data.text)

        try {
            return await axios.post(process.env.EMAIL_API_URL, data);
        } catch (ex) {
            throw `An error has occured when trying to send the e-mail to ${to}: ${ex.message}`
        }
    }
}

export default EmailService