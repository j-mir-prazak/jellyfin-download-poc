console.log('local running.')

var service_worker_path = '/service.js'


async function getService() {
	var swr = await navigator.serviceWorker.getRegistrations()
	var service = false
	swr.forEach( async (sw) => {
		var u = new URL(sw.active.scriptURL)
		if( u.pathname === service_worker_path ) {
			service = sw
			window.service = sw
		}
	})

	return service
}


async function serviceStart(){
	if ( window.service ) return false
	sw = await navigator.serviceWorker.register( service_worker_path + "?" + Math.floor( Math.random() * 10000000 ), { scope: "/"} )
	await sw.update()
	window.service = sw
}

async function serviceStop(){
	var swr = await navigator.serviceWorker.getRegistrations()
	swr.forEach( async (sw) => {
		var u = new URL(sw.active.scriptURL)
		if( u.pathname === service_worker_path ) await sw.unregister()
	})

	window.service = false
}

async function serviceRestart() {
	await serviceStop()
	await serviceStart()
	console.log('restarted.')
}

async function randomHash() {
	var r = Math.floor( Math.random() * 100000 )
	var o = { ping: r }
	var string = btoa( JSON.stringify( o ) )
	window.location.hash = string
}

async function fixedHash() {
	var r = "fixed"
	var o = { ping: r }
	var string = btoa( JSON.stringify( o ) )
	window.location.hash = string
}


async function hashHandler() {
	var base = await hashGetter()
	if ( base === "" ) return false

	if (	window.oldHash
			&& window.oldHash == base
		) return false

	window.oldHash = base

	var downloadRequest = await hashParser( base )

	if ( ! downloadRequest.ok ) return false
	downloadRequest.base =  base

	if( downloadRequest.url ) {
		setupDownload( downloadRequest )
		document.body.innerHTML += downloadRequest.title + ' | ' + downloadRequest.playMethod + '<br>'
	}

	return downloadRequest
}


async function hashGetter() {
	var location = new URL(window.location)
	var base = location.hash.replace(/^#/, "")

	return base
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

async function setupDownload( downloadRequest ) {
	var url			= downloadRequest.url || false

	var fetchHead 	= await fetch( url, { method: 'HEAD'} )
	if ( ! fetchHead.ok ) return false
	console.log('asset reachable.')

	await registerDownload( downloadRequest )

}

async function registerDownload( downloadRequest ) {
	var service = await getService()
	if ( ! service ) return false
	if ( ! service.active.postMessage ) return false

	var msg = downloadRequest
	msg.pathname = "/fetch/" + downloadRequest.base
	msg.pathname = "/fetch/" + "download"
	msg.downloadTitle = msg.title.replace(/\ /g, "-").toLowerCase() + ".ts"
	
	

	service.active.postMessage( { registerDownload: msg } )

	return true

}

async function serviceWorkerMessageHandler( ev ) {
	if( ev.source !== (await getService()).active ) return false
	var data = ev.data



}

async function serviceChannelMessageHandler( ev ) {
	if( ev.data.activated ) {
		window.addEventListener("popstate", hashHandler)
		hashHandler()
		document.body.innerHTML += "ready.<br>"
	}


	if( ev.data.registeredDownload ) {
		console.log('we should download this.')

		var download = ev.data.registeredDownload

		var link = document.createElement('a')
		link.href = download.pathname
		link.innerText = "DOWNLOAD"
		link.style.display = 'block'
		// link.setAttribute("download", download.downloadTitle )
		link.setAttribute("target", "_blank" )
		console.log( window.location.origin + download.pathname )
		document.body.appendChild(link)
		// link.click()
		
	}
}

async function delay(ms) {
	var resolve
	var p = new Promise((r) => { resolve = r })
	setTimeout( resolve, ms)
	return p
}

async function fakeDownload() {

	const handle = await window.showSaveFilePicker( {suggestedName: 'file.ts'})

    console.log(handle)

    if ( ! handle ) return false

    const writableStream = await handle.createWritable({keepExistingData:false});
    
	var f = await fetch("/fetch/download")
	await f.body.pipeTo( writableStream )

	writableStream

}


// RUNTIME
var channel = new BroadcastChannel('jellyfin-download')
channel.addEventListener("message", serviceChannelMessageHandler)

async function main() {
	document.body.innerHTML += "starting.<br>"
	console.log(
		'starting.'
	)
	if( ! await getService() ) serviceStart()
	else hashHandler()

}

setTimeout(main, 0)

