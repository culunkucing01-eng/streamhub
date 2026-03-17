import express, { type Express } from "express";
import cors from "cors";
import passport from "passport";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

app.use("/api", router);

export default app;
