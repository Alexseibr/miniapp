import express from "express";

const app = express();
app.use(express.json());

app.get("/", (_, res) => res.json({ status: "API OK" }));

app.listen(4000, () => console.log("API listening on :4000"));
