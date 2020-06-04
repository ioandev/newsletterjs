import axios from 'axios'

class EmailService {
    constructor(log) {
        this.log = log
    }

    async send(to, subject, text, html) {
        let data = {
            subject,
            from: process.env.EMAIL_API_FROM,
            to,
            text,
        }
        if (html != undefined) {
            data.html = html
        }

        this.log.info("Going to send an email..", data.text)

        try {
            return await axios.post(process.env.EMAIL_API_URL, data);
        } catch (ex) {
            throw `An error has occured when trying to send the e-mail to ${to}: ${ex.message}`
        }
    }
}

export default EmailService