import urlHelper from './urlHelper'

describe("urlHelper", () => {

    it("throws for invalid arguments", () => {
        expect(() => urlHelper("http://google.com/?key=1", null)).toThrow()
        expect(() => urlHelper("http://google.com/?key=1", [])).toThrow()
    })

    it("works with existing data in the url", () => {
        expect(urlHelper("http://google.com/?key=1", {
            utm_source: "news",
        })).toBe("http://google.com/?key=1&utm_source=news")
        expect(urlHelper("http://google.com/?key=1&key2=2", {
            utm_source: "news",
        })).toBe("http://google.com/?key=1&key2=2&utm_source=news")
        expect(urlHelper("http://google.com/?key=1#region=main_title", {
            utm_medium: "email",
        })).toBe("http://google.com/?key=1&utm_medium=email#region=main_title")
    })

    it("works for google analytics, irrespective of trailing slash", () => {
        expect(urlHelper("http://subdomain.google.com/subfolder/?key=1#region=main_title", {
            utm_source: "news",
            utm_medium: "email",
            utm_campaign: "spring-summer"
        })).toBe("http://subdomain.google.com/subfolder/?key=1&utm_source=news&utm_medium=email&utm_campaign=spring-summer#region=main_title")
        expect(urlHelper("http://subdomain.google.com/subfolder?key=1#region=main_title", {
            utm_source: "news",
            utm_medium: "email",
            utm_campaign: "spring-summer"
        })).toBe("http://subdomain.google.com/subfolder?key=1&utm_source=news&utm_medium=email&utm_campaign=spring-summer#region=main_title")
    })

    // TODO: Need to check google analytics api if it's better this to be left out, or given an empty supplied value.
    it.skip("ignores empty query parameter strings", () => {
        expect(urlHelper("http://google.com/?key=1", {
            ignore_this: "",
        })).toBe("http://google.com/?key=1")
    })
})