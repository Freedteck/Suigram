import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { initializeZkLoginHandler } from "../controller/zkAuth.controller";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.get("/auth/zklogin", initializeZkLoginHandler)

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
})