# Basic Web Crawler

It's a very basic web crawler API implementation with express.js.
This API searches for the keyword(s) in the text sections of the page starting from the specified url.
It continues to search for keyword(s) according to a crawler logic, processing other urls on the specified page.
If the keyword(s) are found on the crawled page, the url of the page will be stored.
These stored urls can be used to re-render the page by highlighting the found keyword(s) at any time.
## Usage

```sh
git clone https://github.com/FurkanOM/basic-web-crawler.git
cd basic-web-crawler
npm i
node index.js
```
API running on 8080 port by default.

## API Methods

### GET /
Example: http://localhost:8080/

Return of the crawler status object.

### GET /storage
Example: http://localhost:8080/storage

Return of the all found keywords as a storage object.

Example response:

    {
        "keywords": {
            "keyword1": [
                "http://www.example.com/page/1"
            ],
            "keyword2": [
                "http://www.example.com/page/1",
                "http://www.example.com/page/2"
            ],
            "keyword3": [
                "http://www.example.com/page/1",
                "http://www.example.com/page/3"
            ]
        }
    }

### POST /crawler
Example: http://localhost:8080/crawler

Request Parameters:
* `url`: (required) [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type) Target site url to search for a keyword.
* `keywords`: (required) [Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) The keyword(s) to be found are searched in the text sections of the page.
* `stopAfterNSeconds`: (optional) [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type) This parameter can be used to automatically stop the search after a certain time (Default -1). It should not be forgotten here that the crawling operation will not stop until the end of the processing of the remaining urls in the queue.
* `searchOnlyHostnames`: (optional) [Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) API works by adding all urls that it finds on the page to the queue (Default []). If you do not want the search to go outside of certain hostnames, you can specify this parameter.

Example request:

    {
        "url": "http://www.example.com",
        "keywords": [
            "keyword1"
        ],
        "stopAfterNSeconds": 5,
        "searchOnlyHostnames": [
            "www.example.com"
        ]
    }

### GET /stop
Example: http://localhost:8080/stop

This means that no new links will be added to the queue anymore and crawling will be stopped when the queue is drained.

### GET /resetstatus
Example: http://localhost:8080/resetstatus

This method can be used to initialize crawler status and delete search information from the last crawling operation. This does not affect the storage object.

### GET /view
Example: http://localhost:8080/view?keywords=keyword1,keyword2,keyword3&hostname=example.com&order=1

This method can be used to render the search results by highlighting the keyword(s).

Url Parameters:
* `keywords`: (required) [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type) Keywords could be written in comma separated format like keyword1,keyword2, etc.
* `hostname`: (optional) [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type) You can use this parameter if you want to see the found keyword(s) in a particular hostname (Default None).
* `order`: (optional) [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type) It can be used to decide which of the results to render (Default 0).

## Notes

There is a BasicCrawler object for crawling operations.

```js
const crawler = new BasicCrawler(options, storage);
```

BasicCrawler is a wrapper for [crawler](https://github.com/bda-research/node-crawler).
This wrapper is using the same [options](https://github.com/bda-research/node-crawler#options-reference) with the crawler.
You can fully customize the crawler to your requirements.

## License
[MIT](https://github.com/FurkanOM/basic-web-crawler/blob/master/LICENSE)
