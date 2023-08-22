const http = require('http')


const HTTP_PORT = 4554

var server = http.createServer( connectionHandler )

async function connectionHandler( req, res ) {

    if( ! req.url.match( /^\/download\// ) ) res.end()

    var hash = req.url.replace( /^\/download\//,"" )

    var segments

    req.on('end', () => { console.log('end')})
    req.on('close', () => {
        console.log('connection closed.')
    })
    req.on('error', function (s) {
      console.log('connection error.')
      s = []
    }.bind(this, segments ))


    var downloadRequest = await hashParser(hash)

    if( ! downloadRequest.ok ) res.end('error')

    downloadRequest.originRewrite = 'http://localhost:8833'
    if ( ! downloadRequest.url ) return false

    if ( downloadRequest.originRewrite ) {

        var url = new URL( downloadRequest.url)
        var newUrl = new URL( downloadRequest.originRewrite + url.pathname + url.search )
        downloadRequest.url = newUrl.href

    }

    downloadRequest.url = newUrl.href

    segments = await getSegments( downloadRequest, res )

    downloadRequest.downloadTitle = downloadRequest.title.replace(/\ /g, "-") + ".ts"

    res.setHeader('Content-Type', 'text/application/octet-stream; charset=utf-8'); 
    res.setHeader('Content-Disposition', 'attachment; filename="' + downloadRequest.downloadTitle +'"')

    fetchSegments( segments, res )


}   

server.listen( HTTP_PORT )


async function delay(ms) {
	var resolve
	var p = new Promise((r) => { resolve = r })
	setTimeout( resolve, ms)
	return p
}


async function fetchMain( downloadRequest ) {

    var dr = downloadRequest
    var f = await fetch( dr.url )

}

async function hashParser( base ) {

	var downloadRequest = {}
	try {
		var s = atob(base)
		var downloadRequest = JSON.parse( s )
		downloadRequest.ok = true
	}
	catch (e) {
		downloadRequest.ok = false
		downloadRequest.reason = 'could-not-parse'
	}

	return downloadRequest
}

async function bodyReader( fetchBody, res ) {

	var reader = fetchBody.getReader()

	var safety = 100
	while( safety-- ) {
		var r = await reader.read()
		if( r.done ) break
        if ( res && res.write ) res.write( r.value )
	}

	return true

	
}

async function fetchSegments( segments, res ) {

    while( segments.length > 0 && ! res.closed ) {
        var seg = segments.shift()
        var f = await fetch( seg )
        await bodyReader( f.body, res )
    }

    res.end()
    console.log('DONE.')

}



async function getSegments( request ) {

	var master = request.url

    var main = master.replace("master.m3u8", "main.m3u8")
    var root = master.replace(/(.*)master\.m3u8.*/, "$1" )

	console.log(main)

	try {
		var content = await fetch(main)
	}
	catch (e) {
		console.log('error')
		console.log(e)
	}
    var body = await content.text()

    var lines = body.split(/\r?\n/)

    var segments = []

    for( var l = 0; l < lines.length; l++ ){
        if( ! lines[l].match(/^\#/) && lines[l] !== "" ) {
            segments.push( root + lines[l] )
        }
    }

    console.log( "segments to download: " + segments.length )

    return segments

}
