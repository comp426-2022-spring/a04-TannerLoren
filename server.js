const express = require('express')
const app = express()
const args = require('minimist')(process.argv.slice(2))
const fs = require('fs')
const morgan = require('morgan')
const db = require("./database.js")

args["port"]
args["argument"]
args["log"]
args["debug"]

const help = (`
server.js [options]
--port	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.
--debug	If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.
--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.
--help	Return this message and exit.
`)

if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

const port = args.port ? args.port : 5555
const logs = args.log ? args.log : "true"
const debug = args.debug ? args.debug : "false"
const server = app.listen(port, () => {
    console.log('App listening on port %PORT%'.replace('%PORT%', port))
});

if (logs != "false") {
  const write = fs.createWriteStream('./access.log', {flags:'a'})
  app.use(morgan('combined', {stream:write}))
}

app.use((req, res, next) => {
  let logdata = {
    remoteaddr: req.ip,
    remoteuser: req.user,
    time: Date.now(),
    method: req.method,
    url: req.url,
    protocol: req.protocol,
    httpversion: req.httpVersion,
    status: res.statusCode,
    referer: req.headers['referer'],
    useragent: req.headers['user-agent']
}
const query = db.prepare(`INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
const json = query.run(req.ip, req.user, Date.now(), req.method, req.url, req.httpVersion, req.protocol, req.statusCode, req.headers['referers'], req.headers['user-agent'])
res.status(200)
next()
});

app.get('/app/', (req, res) => {
      res.statusCode = 200;
      res.statusMessage = 'OK';
      res.end(res.statusCode+ ' ' +res.statusMessage);
      res.type("text/plain");
});

if (debug != "false") {
  app.get(`/app/log/access`, (req, res) => {
    try {
      const query = db.prepare(`SELECT * FROM accesslog`).all()
      res.status(200).json(query)
    } catch {
      console.log("EXIT")
    }
  })
}

app.get('/app/error', (req, res) => {
  throw new Error("Error test")
})

//coin functions
/** Simple coin flip
 * 
 * Write a function that accepts no parameters but returns either heads or tails at random.
 * 
 * @param {*}
 * @returns {string} 
 * 
 * example: coinFlip()
 * returns: heads
 * 
 */
 function coinFlip() {
    return Math.random()>0.5? ("heads") : ("tails");
  
  }
  
  /** Multiple coin flips
   * 
   * Write a function that accepts one parameter (number of flips) and returns an array of 
   * resulting "heads" or "tails".
   * 
   * @param {number} flips 
   * @returns {string[]} results
   * 
   * example: coinFlips(10)
   * returns:
   *  [
        'heads', 'heads',
        'heads', 'tails',
        'heads', 'tails',
        'tails', 'heads',
        'tails', 'heads'
      ]
   */
  
  function coinFlips(flips) {
    const theflips = []
    for(let i=0; i<flips; i++){
      theflips[i]= coinFlip()
    }
  return theflips
  }
  
  /** Count multiple flips
   * 
   * Write a function that accepts an array consisting of "heads" or "tails" 
   * (e.g. the results of your `coinFlips()` function) and counts each, returning 
   * an object containing the number of each.
   * 
   * example: conutFlips(['heads', 'heads','heads', 'tails','heads', 'tails','tails', 'heads','tails', 'heads'])
   * { tails: 5, heads: 5 }
   * 
   * @param {string[]} array 
   * @returns {{ heads: number, tails: number }}
   */
  
  function countFlips(array) {
  let count= {heads: 0, tails: 0}
  for (let i = 0; i < array.length; i++) {
    if (array[i] == "heads") {
      count.heads++
    } else {
      count.tails++
    }
  }
  
  return count
  }
  
  
  /** Flip a coin!
   * 
   * Write a function that accepts one input parameter: a string either "heads" or "tails", flips a coin, and then records "win" or "lose". 
   * 
   * @param {string} call 
   * @returns {object} with keys that are the input param (heads or tails), a flip (heads or tails), and the result (win or lose). See below example.
   * 
   * example: flipACoin('tails')
   * returns: { call: 'tails', flip: 'heads', result: 'lose' }
   */
  
  function flipACoin(call) {
  let coinout= coinFlip();
  let outcome="lose"
  if(coinout==call){
    outcome="win"
  }
  return {call: call, flip: coinout, result: outcome}
  }
  app.get('/app/flip/', (req, res) => {
    const flip = coinFlip()
    res.status(200).json({"flip" : flip})
  });
  
  app.get('/app/flips/:number', (req, res) => {
    const flips = coinFlips(req.params.number)
    const counted = countFlips(flips)
    res.status(200).json({"raw" : flips, "summary" : counted})
  });
  
  app.get('/app/flip/call/:call', (req, res) => {
    const called = flipACoin(req.params.call)
    res.status(200).json({called})
  });
  
  app.use(function(req, res){
    res.statusCode = 404;
        res.statusMessage = 'NOT FOUND';
        res.end(res.statusCode+ ' ' +res.statusMessage);
        res.type("text/plain");
  });
