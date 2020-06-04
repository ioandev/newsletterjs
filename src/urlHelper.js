import isObject from 'isObject'

import buildUrl from 'build-url'
import {URL} from 'url'

export default function(url, query) {
    if (!isObject(query)) {
        throw `Invalid arguments provided: url:${url} and query:${query}`
    }

    const parsedUrl = new URL(url)
    let parsedExistingQuery2 = {}
    for (const [key, value] of parsedUrl.searchParams.entries()) {
        parsedExistingQuery2[key] = value
    }
    query = {
        ...parsedExistingQuery2,
        ...query
    }
    return buildUrl(parsedUrl.origin + parsedUrl.pathname, {
        queryParams: query
    }) + parsedUrl.hash
}