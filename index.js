const express = require("express");
const redis = require("redis");
const cors = require("cors");
const cookeiParser = require("cookie-parser");

const app = express();
const port = 5000;

const redisClient = redis.createClient({
  host: "localhost",
  port: 6379,
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.connect();

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(cookeiParser());
app.use(express.json());

app.use((req, res, next) => {
  if (!req.cookies.userID) {
    const guestID = `guest_${Math.random().toString(36).substr(2, 9)}`;
    res.cookie("userId", guestID, { maxAge: 900000, httpOnly: true });
    req.userID = guestID;
  } else {
    req.userID = req.cookies.userID;
  }
  next();
});

app.get("/get_layout", async (req, res) => {
  try {
    const userID = req.userID;
    let userLayout = await redisClient.get(`user_layout:${userID}`);

    if (!userLayout) {
      const count = await redisClient.incr("global_count");
      const layoutNumber = count % 3;

      switch (layoutNumber) {
        case 0:
          userLayout = "layout1";
          break;
        case 1:
          userLayout = "layout2";
          break;
        case 2:
          userLayout = "layout3";
          break;
      }

      await redisClient.set(`user_layout:${userID}`, userLayout);
      await redisClient.expire(`user_layout:${userID}`, 900000);
    }

    res.json({ layout: userLayout });
  } catch (error) {
    console.error("Error fetching layout:", error);
    res.status(500).send("Error fetching layout");
  }
});

app.listen(port, () => {
  console.log(`Server runnig on http://localhost:${port}`);
});
