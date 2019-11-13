"use strict";

const express = require("express")
const Promise = require("bluebird")
const BasicCrawler = require("./BasicCrawler")
const request = Promise.promisify(require("request"))
const helpers = require("./helpers")
const app = express()
app.use(express.json())
const port = 8080

const userAgent = []

const storage = {
    keywords: {}
}

const options = {
    rateLimit: 1000,
    jQuery: false,
    rotateUA: userAgent && userAgent.length > 0,
    userAgent,
}

const crawler = new BasicCrawler(options, storage);

app.get("/", (req, res) => {
    res.json(crawler.status())
})

app.get("/storage", (req, res) => {
    res.json(storage)
})

app.post("/crawler", (req, res) => {
    if(crawler.inProgress){
        res.status(500).json({err: "Crawler already in progress", crawler: crawler.status()})
        return
    }
    const crawlerRequest = helpers.parseCrawlerRequest(req.body)
    if(!crawlerRequest){
        res.status(500).json({err: "Crawling request couldn't be processed! Please check your request body!"})
    }else{
        crawler.start(crawlerRequest)
        res.json(crawler.status())
    }
})

app.get("/stop", (req, res) => {
    crawler.stopAfterNSeconds = 0
    res.json({msg: "Crawling will be stop when the queue is empty! New links will not be added to the queue!"})
})

app.get("/resetstatus", (req, res) => {
    if(crawler.inProgress){
        res.json({err: "This operation cannot be performed during crawling"})
    }else{
        crawler.init()
        res.json(crawler.status())
    }
})

app.get("/view", (req, res) => {
    const keywordString = req.query.keywords
    const hostname = req.query.hostname
    const order = req.query.order || 0
    if(!keywordString){
        res.status(500).json({err: "keywords param required! Usage => keywords=crawl,example"})
        return
    }
    const keywords = keywordString.split(",")
    let urls = helpers.prepareStorageUrls(storage, keywords)
    if(urls.length === 0){
        res.status(500).json({err: "This keyword(s) "+keywordString+" couldn't found yet"})
        return
    }
    urls = helpers.getStorageUrlsForHostname(urls, hostname)
    if(urls.length === 0){
        res.status(500).json({err: "This keyword(s) "+keywordString+" couldn't found on this hostname: " + hostname})
        return
    }
    const url = urls[order]
    request({url, gzip:true})
    .then(requestRes => {
        const data = helpers.handleHtml(requestRes.body.toString(), keywords, url)
        helpers.handleStorageUrls(storage, keywords, data.foundKeywords, url)
        if(data.foundKeywords.length > 0){
            res.send(data.html)
        }else{
            res.status(500).json({err: "This page doesn't have the keyword(s) anymore on this url: " + url})
        }
    })
    .catch(e => {
        res.status(500).json({err: e})
    })
})

app.listen(port, () => console.log(`App listening on port ${port}!`))
