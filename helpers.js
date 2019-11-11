"use strict"
const cheerio = require('cheerio')

const notFollowAsLinks = [
    "css","js","jsx","less","scss","wasm","doc","docx",
    "ebook","log","md","msg","odt","org","pdf","rtf","rst",
    "tex","txt","wpd","wps","ppt","odp","ods","xls","xlsx",
    "csv","ics","vcf","3g2","3gp","aaf","asf","avchd","avi",
    "drc","flv","m2v","m4p","m4v","mkv","mng","mov","mp2",
    "mp4","mpe","mpeg","mpg","mpv","mxf","nsv","ogg","ogv",
    "ogm","qt","rm","rmvb","roq","srt","svi","vob","webm",
    "wmv","yuv","eot","otf","ttf","woff","woff2","3dm",
    "3ds","max","bmp","dds","gif","jpg","jpeg","png","psd",
    "xcf","tga","thm","tif","tiff","yuv","ai","eps","ps",
    "svg","dwg","dxf","gpx","kml","kmz","webp","aac","aiff",
    "ape","au","flac","gsm","it","m3u","m4a","mid","mod",
    "mp3","mpa","pls","ra","s3m","sid","wav","wma","xm","7z",
    "apk","ar","bz2","cab","cpio","deb","dmg","egg","gz",
    "iso","jar","lha","mar","pea","rar","rpm","s7z","shar",
    "tar","tbz2","tgz","tlz","war","whl","xpi","zip","zipx",
    "deb","rpm","xz","pak","crx","exe","msi","bin"
].map(ext => "." + ext)

const validContentTypes = [
    "text/html",
    "text/plain"
]

const parseUrl = (url) => {
    try {
        const crawlerUrl = new URL(url)
        return {
            origin: crawlerUrl.origin,
            hostname: crawlerUrl.hostname,
            pathname: crawlerUrl.pathname,
        }
    } catch (e) {
        return null
    }
}

const handleAllHrefs = (requestUrl, htmlString) => {
    const parsedUrl = parseUrl(requestUrl)
    const baseUrl = parsedUrl.origin
    const fullPathUrl = baseUrl + parsedUrl.pathname
    htmlString = htmlString.replace(/(href=["'])(\?{1})(?!\?)/g, "$1"+fullPathUrl+"$2")
    htmlString = htmlString.replace(/(href=["'])(\/{1})(?!\/)/g, "$1"+baseUrl+"$2")
    htmlString = htmlString.replace(/(src=["'])(\/{1})(?!\/)/g, "$1"+baseUrl+"$2")
    htmlString = htmlString.replace(/(url\([^\/\(\)]*)(\/{1})(?!\/)/g, "$1"+baseUrl+"$2")
    return htmlString
}

const isValidElType = (el) => {
    return el.type === "tag" && el.name !== "noscript"
}

const handleFoundKeywords = (string, keywords, foundKeywords) => {
    if(keywords.length === foundKeywords.length)
        return
    keywords.forEach(keyword => {
        if(string.includes(keyword) && foundKeywords.indexOf(keyword) === -1)
            foundKeywords.push(keyword)
    })
}

const highlightKeywords = (string, keywords) => {
    keywords.forEach(keyword => {
        const replacement = '<span style="background-color: yellow; font-weight: bold; font-size: xx-large;">'+keyword+'</span>'
        string = string.split(/(<.*?[^>]*>[^<]+<\/.*?>)/gi).map(part => {
            if(part.includes("<")) return part
            return part.replace(new RegExp(keyword, 'g'), replacement)
        }).join("")
    })
    return string
}

const handleLink = (el, links) => {
    let href = el.attr("href")
    //If href doesn't exist or doesn't contain http then skip
    if(!href || !href.includes("http")) return
    //Find href has # sign and if has remove after # sign
    const index = href.indexOf("#")
    if(index >= 0) href = href.substr(0, index)
    //If href has not allowed extensions in last part then skip
    const holder = href.split("/")
    const lastPartOfHref = holder[holder.length-1]
    const hasNotAllowedCharsInUrl = notFollowAsLinks.some(ext => lastPartOfHref.includes(ext))
    if(hasNotAllowedCharsInUrl) return
    if(links.indexOf(href) !== -1) return
    links.push(href)
}

const contentParser = ($, parentEl, keywords, res) => {
    return $(parentEl).contents().map((index, childEl) => {
        if(childEl.type === "text"){
            handleFoundKeywords(childEl.data, keywords, res.foundKeywords)
            return highlightKeywords(childEl.data, keywords)
        }else{
            if(isValidElType(childEl)){
                if(childEl.name === "a") handleLink($(childEl), res.links)
                const newHtml = contentParser($, childEl, keywords, res)
                $(childEl).html(newHtml)
            }
            return $(childEl)
        }
    }).get().join("")
}

exports.hasValidContentType = (headers) => {
    return validContentTypes.some(contentType => headers["content-type"].includes(contentType))
}

exports.handleStorageUrls = (storage, keywords, foundKeywords, requestUrl) => {
    keywords.forEach(keyword => {
        if(foundKeywords.indexOf(keyword) !== -1) return
        storage.keywords[keyword] = storage.keywords[keyword].filter(url => url !== requestUrl)
        if(storage.keywords[keyword].length === 0){
            delete storage.keywords[keyword]
        }
    })
}

exports.prepareStorageUrls = (storage, keywords) => {
    const urlsArray = keywords
    .map(keyword => storage.keywords[keyword])
    .filter(urls => urls && urls.length > 0)
    if(keywords.length !== urlsArray.length) return []
    urlsArray.sort((a, b) => {
        return a.length - b.length
    })
    const urls = urlsArray.shift().reduce((res, v) => {
        if (res.indexOf(v) === -1 && urlsArray.every((a) => {
            return a.indexOf(v) !== -1
        })) res.push(v)
        return res
    }, [])
    return urls
}

exports.getStorageUrlsForHostname = (urls, hostname) => {
    if(hostname){
        urls = urls.filter(url => {
            const parts = url.split("/")
            return parts.length > 2 && parts[2].includes(hostname)
        })
    }
    return urls
}

exports.parseUrl = parseUrl

exports.parseCrawlerRequest = (body) => {
    if(!body.hasOwnProperty("url"))
        return null
    if(!(
        body.hasOwnProperty("keywords") &&
        Array.isArray(body.keywords) &&
        body.keywords.length
    ))
        return null
    const parsedUrl = parseUrl(body.url)
    if(!parsedUrl)
        return null
    if(
        body.hasOwnProperty("searchOnlyHostnames") &&
        !Array.isArray(body.searchOnlyHostnames)
    )
        return null
    if(
        body.hasOwnProperty("stopAfterNSeconds") &&
        !(
            typeof body.stopAfterNSeconds === "number" &&
            body.stopAfterNSeconds >= -1
        )
    )
        return null
    return {
        parsedUrl,
        body
    }
}

exports.handleHtml = (body, keywords, requestUrl) => {
    let $ = cheerio.load(handleAllHrefs(requestUrl, body))
    const res = {
        foundKeywords: [],
        links: [],
        html: null
    }
    const finalHtml = contentParser($, $("body"), keywords, res)
    $("body").html(finalHtml)
    res.html = $.html()
    return res
}
