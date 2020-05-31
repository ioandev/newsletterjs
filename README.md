# newsletterjs

Simple service for a newsletter using mongodb and [emailjs](https://github.com/ioanb7/emailjs). It firts expects a request to `/api/newsletter/subscribe` with a `name` and `email` which will send an email with a confirmation link. When the confirmation link is clicked, it expects a request to `/api/newsletter/confirm` with a query string `thumbprint` so it can bring up the `name` and `email` used earlier. There is also a `/api/newsletter/unsubscribe` address which expects a `thumbprint` as well - this will delete the user completely from the database.

## Set up:
1. Copy `.env.spec` to `.env` and `.env.dev`
2. Set your two environments up

## To run:
1. Run either `npm run dev` for dev, or `npm run prod` for prod
3. Visit http://localhost:4178/swagger/

## Credits

Made with [fastify](https://www.fastify.io/)