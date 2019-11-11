"use strict"

const Crawler = require("crawler")
const helpers = require("./helpers")

module.exports = class BasicCrawler{
    constructor(options, storage){
        this.init()
        this.storage = storage || {keywords: {}}
        this.crawler = new Crawler({
            ...options,
            callback: this.crawlPage.bind(this)
        })
        this.crawler.on('drain', this.queueDrained.bind(this))
    }

    queueDrained(){
        console.log("queue list drained")
        this.inProgress = false
    }

    crawlPage(error, res, done){
        const hasValidContentType = helpers.hasValidContentType(res.headers)
        let stopProcess = false
        if(this.stopAfterNSeconds > -1 && Date.now() >= this.startTime + this.stopAfterNSeconds * 1000){
            stopProcess = true
        }
        if(error){
            console.log(error, res)
        }else if(res.statusCode === 200 && hasValidContentType && res.body && res.body.includes("html")){
            this.inProgress = true
            const requestUrl = res.request.uri.href
            const keywords = res.options.keywords
            const crawledUrl = helpers.parseUrl(requestUrl)
            console.log("Processed", requestUrl)
            const data = helpers.handleHtml(res.body, keywords, requestUrl)
            if(data.foundKeywords.length === keywords.length && this.foundUrls.indexOf(requestUrl) === -1){
                this.foundUrls.push(requestUrl)
            }
            data.foundKeywords.forEach(keyword => {
                console.log("=====================================================================")
                console.log("Keyword: ("+keyword+"), found in: " + requestUrl)
                console.log("=====================================================================")
                if(!this.storage.keywords.hasOwnProperty(keyword)){
                    this.storage.keywords[keyword] = []
                }
                if(this.storage.keywords[keyword].indexOf(requestUrl) === -1){
                    this.storage.keywords[keyword].push(requestUrl)
                }
            })
            if(stopProcess) data.links = []
            data.links.forEach(link => {
                const parsedUrl = helpers.parseUrl(link)
                if(!parsedUrl)
                    return
                if(this.searchOnlyHostnames && this.searchOnlyHostnames.length > 0 && this.searchOnlyHostnames.indexOf(parsedUrl.hostname) === -1)
                    return
                if(this.queueUrls.indexOf(link) !== -1)
                    return
                this.queueUrls.push(link)
                this.crawler.queue({
                    uri: link,
                    keywords
                })
            })
        }
        done()
    }

    init(){
        this.inProgress = false,
        this.startTime = null,
        this.stopAfterNSeconds = -1,
        this.url = "",
        this.keywords = [],
        this.searchOnlyHostnames = [],
        this.queueUrls = [],
        this.foundUrls = []
    }

    status(){
        return {
            inProgress: this.inProgress,
            startTime: this.startTime,
            stopAfterNSeconds: this.stopAfterNSeconds,
            url: this.url,
            keywords: this.keywords,
            searchOnlyHostnames: this.searchOnlyHostnames,
            queueUrls: this.queueUrls,
            foundUrls: this.foundUrls
        }
    }

    start(data){
        this.init()
        this.url = data.body.url
        this.keywords = data.body.keywords
        this.startTime = Date.now()
        if(data.body.hasOwnProperty("searchOnlyHostnames"))
            this.searchOnlyHostnames = data.body.searchOnlyHostnames
        if(data.body.hasOwnProperty("stopAfterNSeconds"))
            this.stopAfterNSeconds = data.body.stopAfterNSeconds
        this.queueUrls = [this.url]
        this.crawler.queue({
            uri: this.url,
            keywords: this.keywords
        })
    }

}
