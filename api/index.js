"use strict";

const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const config = require("./config");
const sessions = require("./sessions");

app.use(
  cors({
    credentials: true,
    origin: true
  })
);

app.use(bodyParser.json());
app.use(cookieParser());

/**
 * Middleware for authenticated routes (requires a valid session)
 */
function protectedRoute(req, res, next) {
  const sessionId = req.cookies.session;
  if (sessionId) {
    req.tokens = sessions.lookupSession(sessionId);
  }
  if (!sessionId || !req.tokens) {
    return next(new Error("Unauthorized"));
  }
  next();
}

// Connect to database
require("./models");

// Set up router endpoints
const userRouter = require("./routes/user");
app.use("/user", userRouter);

const concertRouter = require("./routes/concert");
app.use("/concerts", concertRouter);

/** a route that requires a valid session to access */
app.get("/test", protectedRoute, (req, res) => {
  res.status(200).json({ msg: "hihi" });
});

server.listen(config.server.port, () => {
  console.log("Listening on port " + config.server.port);
});
