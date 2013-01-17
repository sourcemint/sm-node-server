
const Q = require("sm-util/lib/q");
const OS = require("sm-util/lib/os");
const CRYPTO = require("crypto");
const REQUEST = require("request");


// TODO: Enforce only one auth request at a time. i.e. queue multiple.
exports.requestOAuth = function(service, profile) {

	if (service === "github") {
		// Ask user to authenticate with github using browser.
		// TODO: Get this working for various operating systems.
		var deferred = Q.defer();

        var shasum = CRYPTO.createHash("sha1");
        shasum.update(Math.random() + ":" + Date.now());
        var id = shasum.digest("hex");

        console.log("Opening 'auth.sourcemint.org' in browser to authenticate profile '" + profile + "' with service '" + service + "'.");

		OS.exec("open 'http://auth.sourcemint.org/request?service=" + service + "&profile=" + profile + "&id=" + id + "'").fail(deferred.reject);

		var checkCount = 0;
		function check() {
			if (Q.isFulfilled(deferred.promise)) return;

			checkCount += 1;
			REQUEST("http://auth.sourcemint.org/token?id=" + id, function (err, response, body) {
				if (err) {
					console.error(err);
					return deferred.reject(err);
				}
				if (response.statusCode === 403) {
					// Stop trying if we have been for 2 mins.
					if (checkCount > 60 * 2) {
						return deferred.reject(new Error("Authentication is taking too long (> 2 mins). Try again."));
					}
					// Try again in one second.
					setTimeout(check, 1000);
				} else
				if (response.statusCode === 200) {
					try {
						var json = JSON.parse(body);
						console.log("Authentication successful.");
						return deferred.resolve(json);
					} catch(err) {
						err.message += " while parsing: " + body;
						return deferred.reject(err);
					}
			  	} else {
			  		console.error(response);
					return deferred.reject(new Error("Invalid response."));
			  	}
			});
		}

		check();

		return deferred.promise;

	} else {
		return Q.reject(new Error("OAuth for service `" + service + "` not yet implemented!"));
	}
}
