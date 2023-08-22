console.log('local service running.')

var channel = new BroadcastChannel('jellyfin-download')
var activated = false

self.addEventListener( 'activate', async (e) => {

	console.log("activate")
	if( activated === false ) channel.postMessage({ activated: true });
	activated = true

	return self.clients.claim();
})

self.addEventListener( 'register', (e) => {
	console.log("register")
});

self.addEventListener( 'fetch', (e) => {

	var pathname = new URL( e.request.url ).pathname
	if ( ! files[pathname] ) return false

	e.respondWith(
		fetchResponse( pathname )
	)
})

self.addEventListener( 'message', (msg) => {

	if (! msg.data) return false
	try {
		var data = msg.data
	} catch (e) {
		console.log("no data found.")
		return false
	}

	if ( data.registerDownload && data.registerDownload.pathname ) {
		var pathname = data.registerDownload.pathname
		files[pathname] = data.registerDownload

		console.log(files)

		channel.postMessage( 
			{ registeredDownload: data.registerDownload }
		)

		// files[pathname].stream = new ReadableStream( responseStream() )

	}

})

async function delay(ms) {
	var resolve
	var p = new Promise((r) => { resolve = r })
	setTimeout( resolve, ms)
	return p
}

function pathnameReserved( pathname, files ) {
	for( var i = 0; i < files.length; i++ ) {
		if( files[i].pathname === pathname ) return true
	}
	return false
}

async function fetchResponse( pathname ) {

	var file = files[pathname]
	console.log(file)
	if( file.playMethod == "DirectPlay" ) {
		console.log('just file.')
		return new Response("that's just a file.")
	}
	return downloadStream( file )

}


// LOGIC

var files = {}





async function downloadStream( request ) {

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

	var stream = new ReadableStream( await responseStream( segments ) )
	console.log( stream )

	// return new Response(
	// 		stream, {
	// 		headers: {
	// 			'Content-Type': 'application/octet-stream; charset=utf-8',
	// 			'Content-Disposition': "attachment; filename*=UTF-8''" + request.downloadTitle + '"'
	// 		}
	// 	}
	// )

	const responseHeaders = new Headers({
		'Content-Type': 'application/octet-stream; charset=utf-8',
		// 'Content-Type': 'application/plaintext; charset=utf-8',
		'Content-Disposition': 'attachment; filename="' + request.downloadTitle +'"',
	
		// To be on the safe side, The link can be opened in a iframe.
		// but octet-stream should stop it.
		'Content-Security-Policy': "default-src 'none'",
		'X-Content-Security-Policy': "default-src 'none'",
		'X-WebKit-CSP': "default-src 'none'",
		'X-XSS-Protection': '1; mode=block',
		'Cross-Origin-Embedder-Policy': 'require-corp'
	  })

	var response = new Response( stream,
		 {
			headers: responseHeaders
		 })

	return response

}

var length = 0

function testStream() {

	return {
		async start( controller ) {
			var encoder = new TextEncoder

			controller.prank = "abc"

			length = 0

			console.log("start")

			controller.enqueue(encoder.encode("xyz"));
		}, 
		
		async pull( controller ) {
			var encoder = new TextEncoder
			// length++

			// console.log(controller.prank)
			while( true )  {
				controller.enqueue(encoder.encode(this.count++ + "\n"));
				await delay(100)
				if( this.count > 100 ) {
					controller.close()
					break
				}


			}
			// console.log("pull")

			


		}, cancel() { console.log(
			'cancel'
		)}, count: 0
	}

}

async function bodyReader( fetchBody, controller ) {

	var reader = fetchBody.getReader()

	// console.log( await reader.read() )
	
	var safety = 100
	while( safety-- ) {
		var res = await reader.read()
		if( res.done ) break
		controller.enqueue( res.value )
	}

	return true
}

async function responseStream( segments ) {

	var segments = segments
	var reader = {
		async start( controller ) {

			console.log('start')
			var f = await fetch( this.segments.shift() )
			await bodyReader( f.body, controller )


		},
		async pull( controller ) {

			console.log('pull')

			while( this.segments.length > 0 ) {

				var f = await fetch( this.segments.shift() )
				await bodyReader( f.body, controller )

			}

			controller.close()

		}, cancel() {},
		segments: segments
	}

	return reader

}

async function BS( input ) {
	var encoder = new TextEncoder()

	await delay(2)
	return encoder.encode(input)

}

async function responseBS( segments ) {

	var segments = segments
	var reader = {
		async start( controller ) {

			console.log('start')

			var seg = this.segments.shift()
			var f = await BS( seg )

			controller.enqueue( f )


		},
		async pull( controller ) {

			console.log('pull')

			while( this.segments.length > 0 ) {

				var f = await BS( this.segments.shift() )
				var buffer = f

				controller.enqueue( buffer )
			}

			controller.close()
		}, cancel() {},
		segments: segments
	}

	return reader

}


setTimeout( () => {
	if( activated === false )channel.postMessage({ activated: true })
	activated = true 
}, 2000)