const express = require('express')
const app = express()
const args = require('minimist')(process.argv.slice(2))
const fs = require('fs')
const morgan = require('morgan')
const db = require('./database.js')
const coin = require('./coin.js')

// make express use built-in body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

args['port', 'debug', 'log', 'help']

// print help message
const help = (`server.js [options]
    
    --port	Set the port number for the server to listen on. Must be an integer
                between 1 and 65535.
    
    --debug	If set to true, creates endlpoints /app/log/access/ which returns
                a JSON access log from the database and /app/error which throws 
                an error with the message "Error test successful." Defaults to 
                false.
    
    --log	If set to false, no log files are written. Defaults to true.
                Logs are always written to database.
    
    --help	Return this message and exit.`)

if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

// server port
const port = args.port || process.env.PORT || 5555
const server = app.listen(port, () => {
    console.log('App listening on port %PORT%'.replace('%PORT%', port))
})

// logging middleware
app.use((req, res, next)=>{
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
        useragent: req.headers['user-agent'],
    }
    const stmt = db.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.status, logdata.referer, logdata.useragent)
    next()
  })

// API endpoints
app.get('/app/', (req, res) => {
    res.statusCode = 200
    res.statusMessage = 'OK'
    res.writeHead(res.statusCode, { 'Content-Type' : 'text/plain' })
    res.end(res.statusCode + ' ' + res.statusMessage)
})

// log and error testing
if (args.debug == true) {
    // create endpoint /app/log/access that returns accesslog
    app.get('/app/log/access', (req, res) => {
        const stmt = db.prepare('SELECT * FROM accesslog').all()
        res.status(200).json(stmt)
    });

    app.get('/app/error', (req, res) => {
        throw new Error('Error test successful.')
    });
}

// log == true
if (args.log == true) {
    const logstream = fs.createWriteStream('./access.log', { flags: 'a' })
    app.use(morgan('combined', { stream: logstream }))
}

app.get('/app/flip', (req, res) => {
    res.status(200).json({ 'flip': coin.coinFlip() })
})

app.get('/app/flips/:number', (req, res) => {
    const flips = coin.coinFlips(req.params.number)
    const sum = coin.countFlips(flips)
    res.status(200).json({ 'raw': flips, 'summary': sum })
})

app.get('/app/flip/call/heads', (req, res) => {
    const guess = coin.flipACoin('heads')
    res.status(200).json({ 'call': guess.call, 'flip': guess.flip, 'result': guess.result })
})

app.get('/app/flip/call/tails', (req, res) => {
    const guess = coin.flipACoin('tails')
    res.status(200).json({ 'call': guess.call, 'flip': guess.flip, 'result': guess.result })
})

app.use(function(req, res){
	res.json({"message": "Endpoint not found. (404)"});
    res.status(404);
});

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
  process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Server stopped')
    })
})