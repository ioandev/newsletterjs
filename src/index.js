import path from "path"
import dotenv from "dotenv"
dotenv.config({
    path: path.resolve(process.cwd(), '.env' + (process.env.DEBUG ? '.dev' : ''))
})
import Fastify from 'fastify'
import fastifyInitialiser from './fastifyInitialiser'

if (process.env.DEBUG) {
    console.log("DEBUG mode!")
}

const hostname = process.env.HOSTNAME
const port = process.env.PORT
if (!hostname || !port) {
    throw "Could not find configuration details to set up the web server: hostname, port"
}
async function main() {
    const app = Fastify({
        logger: true,
        pluginTimeout: 10000
    })
    await fastifyInitialiser(app, process.env)
    app.listen(port, hostname, err => {
        if (err) {
            app.log.error(err)
            process.exit(1)
        }
        console.log(`server listening on ${app.server.address().port}`);
    })
}

main()