"use strict";

/** Server side Spotify adapter providing interface to interact with external spotify API
 * @module adapters/spotify
 * @requires request
 */

/**
 * request module
 * @const
 */
const request = require("request");
const config = require("../config");
const sessions = require("../sessions");

/**
 * Query Spotify's authentication API to retrieve a user's access token to make additional requests to Spotify's Web API
 * @name getAccessToken
 * @function
 * @memberof module:adapters/spotify
 * @param {string} code - unique code
 * @param {string} session - session ID to look up this session
 * @returns {Promise} - A promise which resolves to a JSON object containing relevant tokens
 */
function getAccessToken(code, session) {
  var lookup = sessions.lookupSession(session);
  if (session && lookup && lookup.access_token && lookup.refresh_token) {
    // Check the cache first
    return new Promise((resolve, reject) => {
      resolve({
        access_token: lookup.access_token,
        refresh_token: lookup.refresh_token,
        session: session
      });
    });
  } else {
    // Get new token, update cache
    var authOptions = {
      method: "POST",
      url: config.spotify.url.request_token,
      form: {
        code: code,
        redirect_uri: config.spotify.redirect_uri,
        grant_type: "authorization_code"
      },
      headers: {
        Authorization:
          "Basic " +
          new Buffer(
            config.spotify.client_id + ":" + config.spotify.client_secret
          ).toString("base64")
      },
      json: true
    };

    return new Promise(function(resolve, reject) {
      request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
          var access_token = body.access_token,
            refresh_token = body.refresh_token;

          // Update cache
          const id = sessions.generateID();
          sessions.setSessionStateById(id, {
            access_token: access_token,
            refresh_token: refresh_token
          });

          resolve({
            access_token: access_token,
            refresh_token: refresh_token,
            session: id
          });
        } else {
          reject("Could not fetch access token: " + JSON.stringify(response));
        }
      });
    });
  }
}

/**
 * Queries the Spotify Web API to retrieve a user's info
 * @name getUserInfo
 * @function
 * @memberof module:adapters/spotify
 * @param {string} access_token - User Access Token
 * @returns {Promise} - A promise which resolves to a JSON object containing user info
 */
function getUserInfo(access_token) {
  var options = {
    url: config.spotify.url.web_api,
    headers: { Authorization: "Bearer " + access_token },
    json: true
  };

  // use the access token to access the Spotify Web API
  return new Promise(function(resolve, reject) {
    request.get(options, function(error, response, body) {
      if (!error) {
        resolve(body);
      } else {
        reject(
          "Could not fetch user data: " +
            JSON.stringify(response)
        );
      }
    });
  });
}

/**
 * Gets top items from Spotify API
 * @param {*} access_token Access token for Spotify accountn
 * @param {*} endpoint Where to get "top items" from
 * @param {*} stringify How to return the output form the endpoint
 * @returns {Promise} Resolves to top items
 */
function getTop(access_token, endpoint, stringify) {
  var apiUrl = config.spotify.url.web_api + endpoint;
  var options = {
    url: apiUrl,
    headers: { Authorization: "Bearer " + access_token },
    json: true
  };

  // use the access token to access the Spotify Web API
  return new Promise(function(resolve, reject) {
    request.get(options, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var values = [];
        body.items.forEach(value => {
          values.push(stringify(value));
        });

        resolve(values);
      } else {
        reject(
          "Could not fetch top items: " +
            JSON.stringify(response)
        );
      }
    });
  });
}

/**
 * Query Spotify Web API for a user's top songs
 * @name getUserTopTracks
 * @function
 * @memberof module:adapters/spotify
 * @param {string} access_token - User Access Token
 * @returns {Promise} - A promise which resolves to a JSON object containing Spotify Track objects
 */
function getUserTopTracks(access_token) {
  return getTop(access_token, config.spotify.url.topTracks, function(track) {
    return JSON.stringify({
      album: track.album.name,
      img: track.album.images,
      artist: track.artists[0].name,
      name: track.name
    })
  });
}

/**
 * Query Spotify Web API for a user's top artists
 * @name getUserTopTracks
 * @function
 * @memberof module:adapters/spotify
 * @param {string} access_token - User Access Token
 * @returns {Promise} - A promise which resolves to a JSON object containing Spotify Artist objects
 */
function getUserTopArtists(access_token) {
  return getTop(access_token, config.spotify.url.topArtists, function(artist) {
    return JSON.stringify({
      link: artist.external_urls.spotify,
      name: artist.name,
      genres: artist.genres,
      img: artist.images && artist.images[0] ? artist.images[0].url : null
    })});
}

module.exports = {
  getAccessToken,
  getUserInfo,
  getUserTopTracks,
  getUserTopArtists
};
